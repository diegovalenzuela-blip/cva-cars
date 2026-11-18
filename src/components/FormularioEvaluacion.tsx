"use client";

import { useEffect, useRef, useState } from "react";
import { COMUNAS, MARCAS } from "@/app/admin/crm/importador/reconocer";
import {
  BORRADOR_EVALUACION,
  MAX_FOTOS_EVALUACION,
  validarEvaluacion,
  type BorradorEvaluacion,
} from "@/lib/evaluacion";
import { esHeic, esImagenAdmitida, extensionFoto, puedeAbrirse, reducirFoto } from "@/lib/fotos";

type Foto = { id: string; file: File; preview: string };
type Errores = Partial<Record<keyof BorradorEvaluacion, string>>;

const MAX_MB = 25;
const EXITO = "¡Solicitud recibida! Nuestro equipo revisará la información de tu vehículo y se pondrá en contacto contigo para continuar con la evaluación.";

export default function FormularioEvaluacion() {
  const [datos, setDatos] = useState(BORRADOR_EVALUACION);
  const [errores, setErrores] = useState<Errores>({});
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [avisoFotos, setAvisoFotos] = useState("");
  const [revisando, setRevisando] = useState(false);
  const [enviando, setEnviando] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [fotosFallidas, setFotosFallidas] = useState(0);
  const [trampa, setTrampa] = useState("");
  const idSolicitud = useRef("");
  const vistas = useRef<Foto[]>([]);

  useEffect(() => {
    vistas.current = fotos;
  }, [fotos]);
  useEffect(() => () => vistas.current.forEach((f) => URL.revokeObjectURL(f.preview)), []);

  const campo = (k: keyof BorradorEvaluacion) => ({
    id: `ev-${k}`,
    value: datos[k],
    "aria-invalid": !!errores[k],
    "aria-describedby": errores[k] ? `ev-${k}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDatos({ ...datos, [k]: e.target.value });
      if (errores[k]) setErrores({ ...errores, [k]: undefined });
    },
  });
  const mensaje = (k: keyof BorradorEvaluacion) =>
    errores[k] ? <small className="ev-error" id={`ev-${k}-error`}>{errores[k]}</small> : null;

  async function agregar(lista: FileList | null) {
    const elegidas = Array.from(lista ?? []);
    if (!elegidas.length) return;
    setRevisando(true);
    setAvisoFotos("");
    const nuevas: Foto[] = [];
    let heic = 0;
    let invalidas = 0;
    let grandes = 0;
    const cupo = MAX_FOTOS_EVALUACION - fotos.length;
    for (const file of elegidas.slice(0, Math.max(cupo, 0))) {
      if (file.size > MAX_MB * 1024 * 1024) grandes += 1;
      else if (!esImagenAdmitida(file)) invalidas += 1;
      else if (await puedeAbrirse(file)) {
        nuevas.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
      } else if (esHeic(file)) heic += 1;
      else invalidas += 1;
    }
    setFotos((actual) => [...actual, ...nuevas]);
    setAvisoFotos([
      elegidas.length > cupo ? `Puedes adjuntar hasta ${MAX_FOTOS_EVALUACION} fotografías.` : "",
      grandes ? `Cada foto puede pesar hasta ${MAX_MB} MB.` : "",
      invalidas ? "Algunos archivos no son fotos compatibles." : "",
      heic ? "Este navegador no abre fotos HEIC. Usa Safari o envíalas en JPG." : "",
    ].filter(Boolean).join(" "));
    setRevisando(false);
  }

  function quitar(foto: Foto) {
    URL.revokeObjectURL(foto.preview);
    setFotos((actual) => actual.filter((f) => f.id !== foto.id));
  }

  async function subirFotos(id: string) {
    const { supabase } = await import("@/lib/supabase");
    let fallidas = 0;
    for (const [i, foto] of fotos.entries()) {
      setEnviando(`Subiendo foto ${i + 1} de ${fotos.length}…`);
      try {
        const blob = await reducirFoto(foto.file);
        const { error: fallo } = await supabase.storage
          .from("evaluaciones")
          .upload(`${id}/${i}.${extensionFoto(blob.type)}`, blob, { contentType: blob.type });
        if (fallo && !/exists|duplicate/i.test(fallo.message)) fallidas += 1;
      } catch {
        fallidas += 1;
      }
    }
    await supabase.rpc("crm_confirmar_fotos_evaluacion", { p_id: id });
    return fallidas;
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando || revisando) return;
    setError("");
    const formulario = e.currentTarget;
    const validacion = validarEvaluacion(datos);
    if (validacion.errores) {
      setErrores(validacion.errores);
      setError("Revisa los campos marcados.");
      const primero = Object.keys(validacion.errores)[0];
      window.setTimeout(() => (formulario.querySelector(`#ev-${primero}`) as HTMLElement | null)?.focus(), 0);
      return;
    }
    setErrores({});
    setEnviando("Enviando solicitud…");
    idSolicitud.current ||= crypto.randomUUID();
    try {
      const r = await fetch("/api/evaluacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, id: idSolicitud.current, fotos_esperadas: fotos.length, sitio: trampa }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.errores) setErrores(j.errores);
        throw new Error(j.error || "No pudimos enviar tu solicitud.");
      }
      if (j.subirFotos && fotos.length) setFotosFallidas(await subirFotos(j.id));
      setEnviado(true);
    } catch (x) {
      setError(x instanceof Error ? x.message : "No pudimos enviar tu solicitud.");
    }
    setEnviando("");
  }

  if (enviado) {
    return (
      <div className="ev-exito" role="status">
        <span aria-hidden="true">✓</span>
        <p>{EXITO}</p>
        {fotosFallidas > 0 && <small>{fotosFallidas === 1 ? "Una foto no se pudo subir." : `${fotosFallidas} fotos no se pudieron subir.`} Podrás enviarla cuando te contactemos.</small>}
      </div>
    );
  }

  return (
    <form className="ev-form" onSubmit={enviar} noValidate>
      <fieldset>
        <legend><span>1</span> Tus datos</legend>
        <div className="ev-campos">
          <label htmlFor="ev-nombre">Nombre completo<input {...campo("nombre")} autoComplete="name" maxLength={120} />{mensaje("nombre")}</label>
          <label htmlFor="ev-telefono">WhatsApp<input {...campo("telefono")} type="tel" inputMode="tel" autoComplete="tel" placeholder="9 1234 5678" maxLength={24} />{mensaje("telefono")}</label>
          <label htmlFor="ev-email">Correo <em>opcional</em><input {...campo("email")} type="email" autoComplete="email" maxLength={254} />{mensaje("email")}</label>
          <label htmlFor="ev-comuna">Ciudad o comuna<input {...campo("comuna")} list="ev-comunas" autoComplete="address-level2" maxLength={80} />{mensaje("comuna")}</label>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>2</span> Información del vehículo</legend>
        <div className="ev-campos">
          <label htmlFor="ev-marca">Marca<input {...campo("marca")} list="ev-marcas" maxLength={60} />{mensaje("marca")}</label>
          <label htmlFor="ev-modelo">Modelo<input {...campo("modelo")} maxLength={80} />{mensaje("modelo")}</label>
          <label htmlFor="ev-version">Versión <em>opcional</em><input {...campo("version")} maxLength={120} />{mensaje("version")}</label>
          <label htmlFor="ev-anio">Año<input {...campo("anio")} inputMode="numeric" maxLength={4} />{mensaje("anio")}</label>
          <label htmlFor="ev-km">Kilometraje<input {...campo("km")} inputMode="numeric" maxLength={10} />{mensaje("km")}</label>
          <label htmlFor="ev-patente">Patente <em>opcional</em><input {...campo("patente")} autoCapitalize="characters" maxLength={10} />{mensaje("patente")}</label>
          <label htmlFor="ev-precio_esperado">Precio esperado <em>opcional</em><input {...campo("precio_esperado")} inputMode="numeric" placeholder="$" maxLength={16} />{mensaje("precio_esperado")}</label>
          <label className="ev-ancho" htmlFor="ev-observaciones">Observaciones <em>opcional</em><textarea {...campo("observaciones")} rows={3} maxLength={2000} />{mensaje("observaciones")}</label>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>3</span> Fotografías</legend>
        <p className="ev-ayuda">Suma fotos generales: frontal, trasera, laterales, interior y tablero. Hasta {MAX_FOTOS_EVALUACION}.</p>
        <label className={"ev-subir" + (fotos.length >= MAX_FOTOS_EVALUACION ? " lleno" : "")}>
          <input type="file" accept="image/*,.heic,.heif" multiple disabled={fotos.length >= MAX_FOTOS_EVALUACION || !!enviando} onChange={(e) => { agregar(e.target.files); e.target.value = ""; }} />
          <strong>{revisando ? "Revisando fotos…" : "Agregar fotografías"}</strong>
          <span>{fotos.length} de {MAX_FOTOS_EVALUACION}</span>
        </label>
        {avisoFotos && <p className="ev-error" role="alert">{avisoFotos}</p>}
        {fotos.length > 0 && (
          <div className="ev-fotos">
            {fotos.map((f, i) => (
              <div key={f.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.preview} alt={`Fotografía ${i + 1} del vehículo`} />
                <button type="button" onClick={() => quitar(f)} disabled={!!enviando} aria-label={`Eliminar fotografía ${i + 1}`}>×</button>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <datalist id="ev-comunas">{COMUNAS.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="ev-marcas">{MARCAS.map((m) => <option key={m.nombre} value={m.nombre} />)}</datalist>
      <label className="ev-trampa" aria-hidden="true">Sitio web<input tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} /></label>

      <div className="ev-enviar">
        <div className="ev-paso"><span>4</span> Enviar solicitud</div>
        {error && <p className="ev-error" role="alert">{error}</p>}
        <button className="btn fill" type="submit" disabled={!!enviando || revisando} aria-busy={!!enviando}>
          {enviando || "SOLICITAR EVALUACIÓN"}
        </button>
      </div>
    </form>
  );
}
