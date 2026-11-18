import { NextResponse } from "next/server";
import { BORRADOR_EVALUACION, MAX_FOTOS_EVALUACION, validarEvaluacion, type BorradorEvaluacion } from "@/lib/evaluacion";
import { supabase } from "@/lib/supabase";

// Recibe la solicitud pública. La base vuelve a validar todo antes de guardarla.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 16_000) {
    return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  }
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }

  const id = String(cuerpo.id ?? "");
  // Campo trampa: las personas no lo ven; los robots lo llenan.
  if (typeof cuerpo.sitio === "string" && cuerpo.sitio.trim()) {
    return NextResponse.json({ ok: true, id, subirFotos: false });
  }
  const fotos = Number(cuerpo.fotos_esperadas ?? 0);
  if (!UUID.test(id) || !Number.isInteger(fotos) || fotos < 0 || fotos > MAX_FOTOS_EVALUACION) {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }

  const borrador = Object.fromEntries(
    (Object.keys(BORRADOR_EVALUACION) as (keyof BorradorEvaluacion)[]).map((k) => [k, String(cuerpo[k] ?? "")])
  ) as BorradorEvaluacion;
  const { datos, errores } = validarEvaluacion(borrador);
  if (!datos) return NextResponse.json({ error: "Revisa los campos marcados.", errores }, { status: 400 });

  const { data, error } = await supabase.rpc("crm_recibir_evaluacion", {
    p: { ...datos, id, fotos_esperadas: fotos },
  });
  if (error) {
    const visible = error.message.startsWith("CRM: ") ? error.message.slice(5) : "No pudimos recibir tu solicitud. Inténtalo de nuevo.";
    return NextResponse.json({ error: visible }, { status: error.message.startsWith("CRM: ") ? 400 : 500 });
  }
  return NextResponse.json({ ok: true, id: data.id, subirFotos: data.subir_fotos === true });
}
