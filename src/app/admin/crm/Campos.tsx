"use client";

import { useState } from "react";
import {
  CANALES,
  ETAPAS,
  MOTIVOS_PERDIDA,
  plata,
  type AutoCRM,
  type BorradorCliente,
  type BorradorOportunidad,
  type Canal,
  type Etapa,
  type Oportunidad,
} from "./tipos";

export function CamposCliente({
  valor,
  cambiar,
}: {
  valor: BorradorCliente;
  cambiar: (v: BorradorCliente) => void;
}) {
  const campo = (k: keyof BorradorCliente) => ({
    value: valor[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      cambiar({ ...valor, [k]: e.target.value }),
  });
  return (
    <div className="crm-campos">
      <label>Nombre *<input {...campo("nombre")} required maxLength={120} autoComplete="off" /></label>
      <label>Teléfono<input {...campo("telefono")} type="tel" inputMode="tel" placeholder="9 1234 5678" maxLength={24} autoComplete="off" /></label>
      <label>Correo<input {...campo("email")} type="email" maxLength={254} autoComplete="off" /></label>
      <label>Usuario de red social<input {...campo("red_social")} placeholder="@usuario" maxLength={120} autoComplete="off" /></label>
      <label>Comuna<input {...campo("comuna")} maxLength={80} autoComplete="off" /></label>
      <label className="crm-ancho">Notas del cliente<textarea {...campo("notas")} rows={2} maxLength={2000} /></label>
    </div>
  );
}

export function CamposOportunidad({
  valor,
  cambiar,
  autos,
  autoActual,
}: {
  valor: BorradorOportunidad;
  cambiar: (v: BorradorOportunidad) => void;
  autos: AutoCRM[];
  autoActual?: string | null;
}) {
  const opciones = autos.filter((a) => a.estado !== "vendido" || a.id === autoActual);
  return (
    <div className="crm-campos">
      <label>
        Vehículo del catálogo
        <select value={valor.auto_id} onChange={(e) => cambiar({ ...valor, auto_id: e.target.value })}>
          <option value="">Sin vehículo específico</option>
          {opciones.map((a) => (
            <option key={a.id} value={a.id}>
              {a.marca} {a.modelo} {a.anio} · {a.codigo} · {plata(a.precio)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Qué busca
        <input
          value={valor.interes}
          onChange={(e) => cambiar({ ...valor, interes: e.target.value })}
          placeholder="Ej: camioneta 4x4 diésel"
          maxLength={300}
        />
      </label>
      <label>
        Cómo llegó
        <select value={valor.canal} onChange={(e) => cambiar({ ...valor, canal: e.target.value as Canal })}>
          {CANALES.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
        </select>
      </label>
      <label>
        Presupuesto
        <input
          value={valor.presupuesto ? plata(Number(valor.presupuesto)) : ""}
          onChange={(e) => cambiar({ ...valor, presupuesto: e.target.value.replace(/\D/g, "").slice(0, 12) })}
          inputMode="numeric"
          placeholder="$"
        />
      </label>
      <label>
        Próxima acción
        <input
          value={valor.proxima_accion}
          onChange={(e) => cambiar({ ...valor, proxima_accion: e.target.value })}
          placeholder="Ej: enviar fotos, llamar"
          maxLength={200}
        />
      </label>
      <label>
        Fecha
        <input
          type="date"
          value={valor.proxima_fecha}
          onChange={(e) => cambiar({ ...valor, proxima_fecha: e.target.value })}
        />
      </label>
    </div>
  );
}

export function SelectorEtapa({
  oportunidad,
  cambiar,
  ocupado,
}: {
  oportunidad: Oportunidad;
  cambiar: (etapa: Etapa, motivo: string | null) => void;
  ocupado: boolean;
}) {
  const [pideMotivo, setPideMotivo] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS_PERDIDA[0]);
  return (
    <div className="crm-etapa">
      <label>
        <span className="ap-oculto">Etapa</span>
        <select
          value={pideMotivo ? "perdido" : oportunidad.etapa}
          disabled={ocupado}
          onChange={(e) => {
            const etapa = e.target.value as Etapa;
            if (etapa === "perdido") {
              setPideMotivo(true);
              return;
            }
            setPideMotivo(false);
            if (etapa !== oportunidad.etapa) cambiar(etapa, null);
          }}
        >
          {ETAPAS.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
        </select>
      </label>
      {pideMotivo && (
        <div className="crm-motivo">
          <label>
            Motivo
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {MOTIVOS_PERDIDA.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="ap-b principal"
            disabled={ocupado}
            onClick={() => {
              setPideMotivo(false);
              cambiar("perdido", motivo);
            }}
          >
            Confirmar
          </button>
          <button type="button" className="ap-b" onClick={() => setPideMotivo(false)}>Cancelar</button>
        </div>
      )}
    </div>
  );
}
