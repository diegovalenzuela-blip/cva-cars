import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { SLUG } from "@/lib/datos";

// Recibe la suscripción de la ventana de noticias y la guarda en Supabase.
// La tabla solo permite insertar: nadie de afuera puede leer la lista.

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function limpiarTelefono(t: string) {
  const solo = t.replace(/[^\d+]/g, "");
  // Formato chileno: 9 dígitos que parten en 9 → +569XXXXXXXX
  if (/^9\d{8}$/.test(solo)) return "+56" + solo;
  if (/^569\d{8}$/.test(solo)) return "+" + solo;
  return solo;
}

export async function POST(req: Request) {
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }

  // Campo trampa: las personas no lo ven; los robots lo llenan.
  if (typeof cuerpo.web === "string" && cuerpo.web.trim()) {
    return NextResponse.json({ ok: true });
  }

  const email = String(cuerpo.email ?? "").trim().toLowerCase();
  const telefono = limpiarTelefono(String(cuerpo.telefono ?? ""));
  const acepta = cuerpo.acepta === true;
  const origen = String(cuerpo.origen ?? "").slice(0, 120) || null;

  if (!CORREO.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Revisa tu correo electrónico." }, { status: 400 });
  }
  if (telefono.replace(/\D/g, "").length < 8 || telefono.length > 20) {
    return NextResponse.json({ error: "Revisa tu número de teléfono." }, { status: 400 });
  }
  if (!acepta) {
    return NextResponse.json({ error: "Debes aceptar recibir noticias." }, { status: 400 });
  }

  const { data: automotora } = await supabase
    .from("automotoras")
    .select("id")
    .eq("slug", SLUG)
    .maybeSingle();
  if (!automotora) {
    return NextResponse.json({ error: "No pudimos guardar tu suscripción." }, { status: 500 });
  }

  const { error } = await supabase
    .from("suscriptores")
    .insert({ automotora_id: automotora.id, email, telefono, acepta, origen });

  // 23505 = ya estaba suscrito con ese correo: para la persona es lo mismo.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "No pudimos guardar tu suscripción." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
