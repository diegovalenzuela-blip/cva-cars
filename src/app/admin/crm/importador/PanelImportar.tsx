"use client";

import "../crm.css";
import "./importador.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  borrarImportacion,
  cargarBaseImportacion,
  confirmarImportacion,
  ErrorCRM,
  listarImportaciones,
  type ImportacionGuardada,
} from "../datos";
import { fechaHora } from "../tipos";
import type { AutoCRM } from "../tipos";
import type { BaseCRM } from "./coincidencias";
import { extraerMensajes } from "./extractor";
import { construirImportacion } from "./guardado";
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
  const [baseLista, setBaseLista] = useState(false);
  const [sinActivar, setSinActivar] = useState(false);
  const [texto, setTexto] = useState("");
  const [revision, setRevision] = useState<Revision | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState("");
  const [historial, setHistorial] = useState<ImportacionGuardada[]>([]);
  const resultados = useRef<HTMLDivElement>(null);
  const importacionId = useRef("");

  const refrescar = useCallback(async () => {
    const [datos, lista] = await Promise.all([cargarBaseImportacion(automotoraId), listarImportaciones(automotoraId)]);
    setBase(datos);
    setHistorial(lista);
  }, [automotoraId]);

  useEffect(() => {
    let vigente = true;
    Promise.all([cargarBaseImportacion(automotoraId), listarImportaciones(automotoraId)])
      .then(([datos, lista]) => {
        if (!vigente) return;
        setBase(datos);
        setHistorial(lista);
        setBaseLista(true);
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

  function analizar(contenido = texto, id: string = crypto.randomUUID()) {
    // Sin los datos del CRM no se pueden detectar duplicados.
    if (!baseLista) return;
    const r = crearRevision(extraerMensajes(contenido), base);
    importacionId.current = id;
    setResumen("");
    setRevision(r);
    if (!r.bloques.length) avisar("No encontré datos para revisar en ese texto.", true);
    window.setTimeout(() => resultados.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function cambiarBloque(indice: number, cambio: (b: BloqueRevision) => BloqueRevision) {
    setRevision((r) => r && { ...r, bloques: r.bloques.map((b) => (b.indice === indice ? cambio(b) : b)) });
  }

  async function guardar(destino: "confirmada" | "pendiente") {
    if (!revision) return;
    setGuardando(true);
    try {
      const r = await confirmarImportacion(construirImportacion(revision, base, importacionId.current, destino));
      if (destino === "pendiente") {
        setResumen("Importación guardada como pendiente. No se creó ningún cliente ni vehículo.");
      } else {
        const suma = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
        setResumen(`Importación guardada: ${suma(r.creados)} registros creados y ${suma(r.actualizados)} actualizados.`);
      }
      avisar(destino === "pendiente" ? "Quedó pendiente." : "Importación guardada.");
      setTexto("");
      setRevision(null);
      await refrescar();
    } catch (e) {
      avisar(e instanceof ErrorCRM ? e.message : "No se pudo guardar la importación.", true);
      refrescar().catch(() => undefined);
    }
    setGuardando(false);
  }

  const estado = useMemo(() => {
    if (!revision) return null;
    const activos = revision.bloques.filter((b) => !b.omitido);
    const faltan = activos.filter((b) => problemasBloque(b, base, revision.bloques).length).length;
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
            if (baseLista) window.setTimeout(() => analizar(campo.value), 0);
          }}
        />
        <p className="ap-ref">El análisis ocurre en este dispositivo. Nada se guarda hasta que confirmes.</p>
        <div className="ap-botones">
          <button type="submit" className="ap-b principal" disabled={!baseLista || !texto.trim()}>
            {cargando ? "Cargando CRM…" : baseLista ? "Analizar" : "CRM no disponible"}
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

      {resumen && (
        <p className="imp-respaldo imp-resumen">
          {resumen} <Link href="/admin/crm">Ver CRM</Link>
        </p>
      )}

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
            <div className="imp-confirmar-acc">
              <button type="button" className="btn" disabled={guardando} onClick={() => guardar("pendiente")}>Dejar pendiente</button>
              <button type="button" className="btn fill" disabled={guardando || !estado.activos || estado.faltan > 0} onClick={() => guardar("confirmada")}>
                {guardando ? "Guardando…" : "Confirmar y guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historial.length > 0 && (
        <div className="imp-historial">
          <h2>Importaciones recientes</h2>
          <div className="crm-lista">
            {historial.map((i) => {
              const original = i.mensajes.map((m) => m.texto).join("\n\n");
              return (
                <article key={i.id} className="crm-op">
                  <div className="crm-op-cab">
                    <div>
                      <h4>{i.estado === "pendiente" ? "Pendiente" : i.estado === "confirmada" ? "Confirmada" : "Descartada"}</h4>
                      <p className="ap-auto-datos">{fechaHora(i.confirmado_en ?? i.creado_en)} · {i.mensajes.length} {i.mensajes.length === 1 ? "mensaje" : "mensajes"}</p>
                    </div>
                    <div className="ap-botones">
                      {i.estado === "pendiente" && (
                        <button
                          type="button"
                          className="ap-b principal"
                          onClick={() => {
                            setTexto(original);
                            analizar(original, i.id);
                          }}
                        >
                          Continuar
                        </button>
                      )}
                      <button
                        type="button"
                        className="ap-b peligro"
                        onClick={async () => {
                          if (!confirm("¿Eliminar esta importación y sus mensajes originales? Los clientes y vehículos guardados no se borran.")) return;
                          try {
                            await borrarImportacion(i.id);
                            avisar("Importación eliminada.");
                            await refrescar();
                          } catch (e) {
                            avisar(e instanceof ErrorCRM ? e.message : "No se pudo eliminar.", true);
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <details className="imp-detalle">
                    <summary>Ver mensaje original</summary>
                    {i.mensajes.map((m) => <p key={m.id} className="imp-original">{m.texto}</p>)}
                  </details>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
