"use client";

import "../crm.css";
import "./importador.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { cargarBaseImportacion, ErrorCRM } from "../datos";
import type { AutoCRM } from "../tipos";
import type { BaseCRM } from "./coincidencias";
import { extraerMensajes } from "./extractor";
import { crearRevision, problemasBloque, type BloqueRevision, type Revision } from "./revision";
import TarjetaBloque from "./TarjetaBloque";

const VACIA: BaseCRM = { clientes: [], vehiculos: [], consignaciones: [] };

function MensajeOriginal({ texto, marcas }: { texto: string; marcas: [number, number][] }) {
  const partes: React.ReactNode[] = [];
  let desde = 0;
  [...marcas].sort((a, b) => a[0] - b[0]).forEach(([a, b], i) => {
    if (a < desde) return;
    partes.push(texto.slice(desde, a), <mark key={i}>{texto.slice(a, b)}</mark>);
    desde = b;
  });
  partes.push(texto.slice(desde));
  return <p className="imp-original">{partes}</p>;
}

export default function PanelImportar({
  automotoraId,
  avisar,
}: {
  automotoraId: string;
  autos: AutoCRM[];
  avisar: (texto: string, error?: boolean) => void;
}) {
  const [base, setBase] = useState<BaseCRM>(VACIA);
  const [cargando, setCargando] = useState(true);
  const [sinActivar, setSinActivar] = useState(false);
  const [texto, setTexto] = useState("");
  const [revision, setRevision] = useState<Revision | null>(null);
  const resultados = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    cargarBaseImportacion(automotoraId)
      .then((datos) => {
        if (vigente) setBase(datos);
      })
      .catch((e) => {
        if (!vigente) return;
        if (e instanceof ErrorCRM && e.sinActivar) setSinActivar(true);
        else avisar(e instanceof ErrorCRM ? e.message : "No se pudieron cargar los datos del CRM.", true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [automotoraId, avisar]);

  function analizar(contenido = texto) {
    const r = crearRevision(extraerMensajes(contenido), base);
    setRevision(r);
    if (!r.bloques.length) avisar("No encontré datos para revisar en ese texto.", true);
    window.setTimeout(() => resultados.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function cambiarBloque(indice: number, cambio: (b: BloqueRevision) => BloqueRevision) {
    setRevision((r) => r && { ...r, bloques: r.bloques.map((b) => (b.indice === indice ? cambio(b) : b)) });
  }

  const estado = useMemo(() => {
    if (!revision) return null;
    const activos = revision.bloques.filter((b) => !b.omitido);
    const faltan = activos.filter((b) => problemasBloque(b, base).length).length;
    return { activos: activos.length, faltan };
  }, [revision, base]);

  if (sinActivar) {
    return (
      <section className="crm" aria-label="Importar desde WhatsApp">
        <div className="ap-vacio">
          <h2>Importador pendiente de activar</h2>
          <p>Faltan sus tablas en la base de datos. El CRM y el panel de autos siguen funcionando normalmente.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="crm imp" aria-label="Importar desde WhatsApp">
      <form
        className="imp-pegar"
        onSubmit={(e) => {
          e.preventDefault();
          analizar();
        }}
      >
        <label htmlFor="imp-texto">Pega uno o varios mensajes</label>
        <textarea
          id="imp-texto"
          value={texto}
          rows={7}
          maxLength={100000}
          placeholder="Ejemplo: Toyota Hilux 2021, patente LPKD45, dueño Juan Pérez, teléfono 9 1234 5678, precio 18 millones"
          onChange={(e) => setTexto(e.target.value)}
          onPaste={(e) => {
            const campo = e.currentTarget;
            window.setTimeout(() => analizar(campo.value), 0);
          }}
        />
        <p className="ap-ref">El análisis ocurre en este dispositivo. Nada se guarda hasta que confirmes.</p>
        <div className="ap-botones">
          <button type="submit" className="ap-b principal" disabled={cargando || !texto.trim()}>
            {cargando ? "Cargando CRM…" : "Analizar"}
          </button>
          {(texto || revision) && (
            <button
              type="button"
              className="ap-b"
              onClick={() => {
                setTexto("");
                setRevision(null);
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      </form>

      {revision && revision.bloques.length > 0 && estado && (
        <div ref={resultados} className="imp-resultados">
          <div className="crm-sub">
            <h2>Revisión</h2>
            <span className="ap-ref">
              {estado.activos} {estado.activos === 1 ? "registro" : "registros"} · {revision.mensajes.length}{" "}
              {revision.mensajes.length === 1 ? "mensaje" : "mensajes"}
            </span>
          </div>
          {revision.fusionados > 0 && (
            <p className="crm-existe">
              {revision.fusionados === 1 ? "Un mensaje actualiza" : `${revision.fusionados} mensajes actualizan`} datos de
              otro en este mismo texto. Revisa los valores marcados.
            </p>
          )}

          <div className="crm-lista">
            {revision.bloques.map((b) => (
              <TarjetaBloque
                key={b.indice}
                bloque={b}
                bloques={revision.bloques}
                base={base}
                cambiar={(fn) => cambiarBloque(b.indice, fn)}
                original={
                  <details className="imp-detalle">
                    <summary>Ver mensaje original</summary>
                    {(() => {
                      const m = revision.mensajes.find((x) => x.orden === b.mensaje_orden);
                      if (!m) return null;
                      const marcas = b.campos.flatMap((c): [number, number][] =>
                        c.mensaje_orden === m.orden && c.inicio !== null && c.fin !== null && !["condiciones", "observaciones"].includes(c.campo)
                          ? [[c.inicio, c.fin]]
                          : []
                      );
                      return (
                        <>
                          {(m.autor || m.enviado_texto) && (
                            <span className="ap-ref">{[m.autor, m.enviado_texto].filter(Boolean).join(" · ")}</span>
                          )}
                          <MensajeOriginal texto={m.texto} marcas={marcas} />
                        </>
                      );
                    })()}
                  </details>
                }
              />
            ))}
          </div>

          <div className="imp-confirmar">
            <p>
              {estado.faltan
                ? `${estado.faltan} ${estado.faltan === 1 ? "registro necesita" : "registros necesitan"} revisión.`
                : "Todo está revisado."}
            </p>
            <button type="button" className="btn fill" disabled>Confirmar y guardar</button>
            <span className="ap-ref">El guardado se activa en la siguiente etapa.</span>
          </div>
        </div>
      )}
    </section>
  );
}
