"use client";

import { useState } from "react";
import {
  actualizarEstadoConsignacion,
  ErrorCRM,
  listarCambiosRegistro,
  mensajesDeRegistro,
  type CambioCRM,
  type MensajeGuardado,
} from "./datos";
import type { BaseCRM, ConsignacionBase, VehiculoBase } from "./importador/coincidencias";
import { fechaCorta, fechaHora, plata } from "./tipos";

export const ESTADOS_CONSIGNACION = [
  { v: "por_confirmar", t: "Por confirmar" },
  { v: "activa", t: "Activa" },
  { v: "vendida", t: "Vendida" },
  { v: "retirada", t: "Retirada" },
  { v: "cancelada", t: "Cancelada" },
];

const ESTADO_DOCUMENTO: Record<string, string> = {
  al_dia: "Al día", vencido: "Vencido", pendiente: "Pendiente", no_informado: "No informado",
};
const DOCUMENTO: Record<string, string> = {
  revision_tecnica: "Revisión técnica", permiso_circulacion: "Permiso de circulación", soap: "SOAP",
};

export const nombreVehiculo = (v: VehiculoBase) => [v.marca, v.modelo, v.anio].filter(Boolean).join(" ") || "Vehículo";
const nombreEstado = (e: string) => ESTADOS_CONSIGNACION.find((x) => x.v === e)?.t ?? e;

const nombreCampo = (campo: string | null) => {
  const texto = (campo ?? "Dato").replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
const valorCambio = (campo: string | null, valor: string | null) =>
  valor === null ? "sin dato" : campo?.startsWith("precio") ? plata(Number(valor)) : campo === "estado" ? nombreEstado(valor) : valor;

export function SelectorConsignacion({
  consignacion,
  avisar,
  recargar,
}: {
  consignacion: ConsignacionBase;
  avisar: (texto: string, error?: boolean) => void;
  recargar: () => Promise<void>;
}) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <label className="crm-etapa">
      <span className="ap-oculto">Estado de la consignación</span>
      <select
        value={consignacion.estado}
        disabled={ocupado}
        onChange={async (e) => {
          setOcupado(true);
          try {
            await actualizarEstadoConsignacion(consignacion.id, e.target.value);
            avisar("Consignación actualizada.");
            await recargar();
          } catch (error) {
            avisar(error instanceof ErrorCRM ? error.message : "No se pudo actualizar la consignación.", true);
          }
          setOcupado(false);
        }}
      >
        {ESTADOS_CONSIGNACION.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
      </select>
    </label>
  );
}

function Historial({ vehiculoId }: { vehiculoId: string }) {
  const [datos, setDatos] = useState<{ cambios: CambioCRM[]; mensajes: MensajeGuardado[] } | null>(null);
  const [error, setError] = useState("");
  return (
    <details
      className="imp-detalle"
      onToggle={async (e) => {
        if (!e.currentTarget.open || datos) return;
        try {
          const [cambios, mensajes] = await Promise.all([listarCambiosRegistro(vehiculoId), mensajesDeRegistro(vehiculoId)]);
          setDatos({ cambios, mensajes });
        } catch (x) {
          setError(x instanceof ErrorCRM ? x.message : "No se pudo cargar el historial.");
        }
      }}
    >
      <summary>Historial y mensajes originales</summary>
      {error && <p className="adm-msg">{error}</p>}
      {!datos && !error && <p className="ap-conteo">Cargando…</p>}
      {datos && (
        <>
          <ol className="crm-historial">
            {datos.cambios.map((c) => (
              <li key={c.id}>
                <span>{fechaHora(c.creado_en)}</span>
                <p>
                  {c.operacion === "crear" ? "Registro creado" : c.operacion === "eliminar" ? "Registro eliminado" : nombreCampo(c.campo)}
                  {c.operacion === "actualizar" ? `: ${valorCambio(c.campo, c.valor_anterior)} → ${valorCambio(c.campo, c.valor_nuevo)}` : ""}
                </p>
              </li>
            ))}
          </ol>
          {datos.mensajes.map((m) => <p key={m.id} className="imp-original">{m.texto}</p>)}
        </>
      )}
    </details>
  );
}

export default function VehiculosCliente({
  clienteId,
  base,
  avisar,
  recargar,
}: {
  clienteId: string;
  base: BaseCRM;
  avisar: (texto: string, error?: boolean) => void;
  recargar: () => Promise<void>;
}) {
  const operaciones = base.consignaciones.filter((c) => c.propietario_id === clienteId);
  const vehiculos = base.vehiculos.filter((v) => v.cliente_id === clienteId || operaciones.some((c) => c.vehiculo_id === v.id));
  const grupos: [string, VehiculoBase[]][] = [["Actuales", []], ["Vendidos", []], ["Retirados", []], ["Anteriores", []]];
  for (const v of vehiculos) {
    const propias = base.consignaciones.filter((c) => c.vehiculo_id === v.id);
    const ultima = propias[0]?.estado;
    if (v.cliente_id !== clienteId) grupos[3][1].push(v);
    else if (ultima === "vendida") grupos[1][1].push(v);
    else if (ultima === "retirada" || ultima === "cancelada") grupos[2][1].push(v);
    else grupos[0][1].push(v);
  }

  return (
    <section className="crm-vehiculos" aria-label="Vehículos del cliente">
      <h3>Vehículos y consignaciones</h3>
      {vehiculos.length === 0 && <p className="ap-conteo">Este cliente no tiene vehículos registrados.</p>}
      {grupos.filter(([, lista]) => lista.length).map(([titulo, lista]) => (
        <div key={titulo} className="crm-grupo">
          <h4>{titulo}</h4>
          <div className="crm-lista">
            {lista.map((v) => {
              const propias = base.consignaciones.filter((c) => c.vehiculo_id === v.id && c.propietario_id === clienteId);
              const documentos = (base.documentos ?? []).filter((d) => d.vehiculo_id === v.id);
              return (
                <article key={v.id} className="crm-op">
                  <h4>{nombreVehiculo(v)} · {v.patente}</h4>
                  {v.version && <p className="ap-auto-datos">{v.version}</p>}
                  {v.km !== null && <p className="ap-auto-datos">{v.km.toLocaleString("es-CL")} km</p>}
                  {propias.map((c) => (
                    <div key={c.id} className="crm-consignacion">
                      <div>
                        <b>{nombreEstado(c.estado)}</b>
                        <p className="ap-auto-datos">
                          {[c.precio_solicitado ? `Precio ${plata(c.precio_solicitado)}` : null,
                            c.precio_minimo ? `Mínimo ${plata(c.precio_minimo)}` : null,
                            c.comision_valor ? `Comisión ${c.comision_tipo === "porcentaje" ? `${c.comision_valor}%` : plata(c.comision_valor)}` : null,
                            c.creado_en ? fechaCorta(c.creado_en) : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <SelectorConsignacion consignacion={c} avisar={avisar} recargar={recargar} />
                    </div>
                  ))}
                  {documentos.length > 0 && (
                    <p className="ap-auto-datos">
                      {documentos.map((d) => `${d.nombre ?? DOCUMENTO[d.tipo] ?? d.tipo}: ${ESTADO_DOCUMENTO[d.estado] ?? d.estado}${d.vence_en ? ` (${fechaCorta(d.vence_en)})` : ""}`).join(" · ")}
                    </p>
                  )}
                  <Historial vehiculoId={v.id} />
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
