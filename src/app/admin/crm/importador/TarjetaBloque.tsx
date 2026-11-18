"use client";

import type { ReactNode } from "react";
import { plata } from "../tipos";
import type { BaseCRM } from "./coincidencias";
import type { EntidadCampo } from "./extractor";
import {
  cambiosDe,
  claveCambio,
  dueñoDistinto,
  errorCampo,
  etiquetaCampo,
  necesitaConfirmarPropietario,
  OPCIONES,
  problemasBloque,
  tipoControl,
  validarValor,
  valorDe,
  type BloqueRevision,
  type CampoRevision,
} from "./revision";

const SECCIONES: [EntidadCampo, string][] = [
  ["cliente", "Propietario"],
  ["vehiculo", "Vehículo"],
  ["consignacion", "Consignación"],
  ["documento", "Documentos"],
];

const NOMBRE_ESTADO = { detectado: "Detectado", pendiente: "Pendiente", por_confirmar: "Por confirmar" };

function textoEstado(c: CampoRevision) {
  if (c.decision === "rechazado") return "Descartado";
  if (c.decision === "editado") return "Editado";
  if (c.decision === "aceptado") return "Confirmado";
  return NOMBRE_ESTADO[c.estado];
}

function FilaCampo({ campo, cambiar }: { campo: CampoRevision; cambiar: (c: CampoRevision) => void }) {
  const etiqueta = etiquetaCampo(campo);
  const control = tipoControl(campo);
  const error = errorCampo(campo);
  const opciones = campo.entidad === "documento" ? OPCIONES.documento : OPCIONES[campo.id];
  const editar = (valor: string) =>
    cambiar({ ...campo, valor: valor === "" ? null : valor, decision: valor === (campo.detectado ?? "") ? "sin_decision" : "editado" });
  const normalizar = () => {
    if (campo.valor === null) return;
    const r = validarValor(campo, campo.valor);
    if (!r.error && r.valor !== campo.valor) cambiar({ ...campo, valor: r.valor });
  };
  const descartado = campo.decision === "rechazado";
  const duda = campo.estado === "por_confirmar" && campo.decision === "sin_decision" && campo.valor !== null;
  const dinero = ["precio_solicitado", "precio_minimo"].includes(campo.campo) && Number(campo.valor) > 0;

  return (
    <div className={`imp-campo ${descartado ? "descartado" : duda ? "duda" : ""}`}>
      <div className="imp-campo-cab">
        <label htmlFor={`c-${campo.id}-${campo.inicio}`}>{etiqueta}</label>
        <span className={`imp-estado ${campo.decision === "sin_decision" ? campo.estado : campo.decision}`}>{textoEstado(campo)}</span>
      </div>
      {control === "opciones" ? (
        <select id={`c-${campo.id}-${campo.inicio}`} value={campo.valor ?? ""} disabled={descartado} onChange={(e) => editar(e.target.value)}>
          <option value="">Sin dato</option>
          {opciones.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
        </select>
      ) : control === "area" ? (
        <textarea id={`c-${campo.id}-${campo.inicio}`} rows={2} value={campo.valor ?? ""} disabled={descartado} onChange={(e) => editar(e.target.value)} />
      ) : (
        <input
          id={`c-${campo.id}-${campo.inicio}`}
          type={control === "fecha" ? "date" : "text"}
          inputMode={control === "numero" ? "numeric" : undefined}
          value={campo.valor ?? ""}
          disabled={descartado}
          aria-invalid={!!error}
          autoComplete="off"
          onChange={(e) => editar(e.target.value)}
          onBlur={normalizar}
        />
      )}
      {dinero && <small className="imp-ayuda">{plata(Number(campo.valor))}</small>}
      {error && <small className="imp-error">{error}</small>}
      {campo.nota && campo.decision === "sin_decision" && <small className="imp-ayuda">{campo.nota}</small>}
      {campo.fragmento && <small className="imp-origen">“{campo.fragmento}”</small>}
      {campo.alternativas?.map((a) => (
        <button key={a.valor} type="button" className="ap-b imp-alternativa" onClick={() => cambiar({ ...campo, valor: a.valor, decision: "editado" })}>
          Usar {["precio_solicitado", "precio_minimo"].includes(campo.campo) ? plata(Number(a.valor)) : a.valor}
        </button>
      ))}
      {campo.valor !== null && (
        <div className="imp-campo-acc">
          {duda && (
            <button type="button" className="ap-b" onClick={() => cambiar({ ...campo, decision: "aceptado" })}>Confirmar</button>
          )}
          <button type="button" className="ap-b" onClick={() => cambiar({ ...campo, decision: descartado ? "sin_decision" : "rechazado" })}>
            {descartado ? "Recuperar" : "Descartar"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function TarjetaBloque({
  bloque: b,
  bloques,
  base,
  cambiar,
  original,
}: {
  bloque: BloqueRevision;
  bloques: BloqueRevision[];
  base: BaseCRM;
  cambiar: (fn: (b: BloqueRevision) => BloqueRevision) => void;
  original: ReactNode;
}) {
  const problemas = problemasBloque(b, base);
  const titulo = [valorDe(b, "vehiculo", "marca"), valorDe(b, "vehiculo", "modelo"), valorDe(b, "vehiculo", "patente")].filter(Boolean).join(" ")
    || valorDe(b, "cliente", "nombre") || `Registro ${b.indice + 1}`;
  const cambios = cambiosDe(b, base);
  const nombreCliente = (id: string) => base.clientes.find((c) => c.id === id)?.nombre ?? "Cliente";
  const nombreVehiculo = (id: string) => {
    const v = base.vehiculos.find((x) => x.id === id);
    return v ? [v.marca, v.modelo, v.anio, v.patente].filter(Boolean).join(" ") : "Vehículo";
  };
  const actualizarCampo = (c: CampoRevision) => cambiar((x) => ({ ...x, campos: x.campos.map((y) => (y.id === c.id ? c : y)) }));
  const elegirCliente = (valor: string) =>
    cambiar((x) => ({
      ...x,
      cambiar_propietario: false,
      propietario_confirmado: false,
      cliente:
        valor === "crear" ? { modo: "crear", id: null, bloque: null }
        : valor === "" ? { modo: null, id: null, bloque: null }
        : valor.startsWith("bloque:") ? { modo: "bloque", id: null, bloque: Number(valor.slice(7)) }
        : { modo: "usar", id: valor, bloque: null },
    }));
  const elegirVehiculo = (valor: string) =>
    cambiar((x) => ({
      ...x,
      cambiar_propietario: false,
      vehiculo: valor === "crear" ? { modo: "crear", id: null } : valor === "" ? { modo: null, id: null } : { modo: "usar", id: valor },
    }));
  const valorCliente = b.cliente.modo === "crear" ? "crear" : b.cliente.modo === "bloque" ? `bloque:${b.cliente.bloque}` : b.cliente.id ?? "";
  const valorVehiculo = b.vehiculo.modo === "crear" ? "crear" : b.vehiculo.id ?? "";
  const candidatosC = new Set(b.coincidencia.cliente.candidatos.map((c) => c.id));
  const candidatosV = new Set(b.coincidencia.vehiculo.candidatos.map((c) => c.id));
  const motivo = (lista: typeof b.coincidencia.cliente.candidatos, id: string) => lista.find((c) => c.id === id)?.motivo;

  return (
    <article className={`imp-bloque ${b.omitido ? "omitido" : problemas.length ? "falta" : "listo"}`}>
      <div className="imp-bloque-cab">
        <div>
          <h3>{titulo}</h3>
          <span className="ap-ref">
            {b.tipo === "actualizacion" ? "Actualización" : "Información nueva"}
            {b.hipotetico ? " · Posibilidad, no confirmada" : ""}
          </span>
        </div>
        <button type="button" className="ap-b" onClick={() => cambiar((x) => ({ ...x, omitido: !x.omitido }))}>
          {b.omitido ? "Incluir" : "No importar"}
        </button>
      </div>

      {!b.omitido && (
        <>
          {b.coincidencia.avisos.map((a) => <p key={a} className="crm-existe">{a}</p>)}

          <div className="imp-asociar">
            <label>
              Propietario o cliente
              <select value={valorCliente} onChange={(e) => elegirCliente(e.target.value)}>
                <option value="">Elegir…</option>
                <option value="crear">Crear cliente nuevo</option>
                {b.relacion.posible_bloque !== null && (
                  <option value={`bloque:${b.relacion.posible_bloque}`}>
                    Mismo propietario que {valorDe(bloques[b.relacion.posible_bloque], "cliente", "nombre") ?? `registro ${b.relacion.posible_bloque + 1}`}
                  </option>
                )}
                {b.coincidencia.cliente.candidatos.map((c) => (
                  <option key={c.id} value={c.id}>{nombreCliente(c.id)} ({c.motivo})</option>
                ))}
                {base.clientes.filter((c) => !candidatosC.has(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` · ${c.telefono}` : ""}</option>
                ))}
              </select>
              {b.cliente.id && motivo(b.coincidencia.cliente.candidatos, b.cliente.id) && (
                <small className="imp-ayuda">Coincide por {motivo(b.coincidencia.cliente.candidatos, b.cliente.id)}.</small>
              )}
            </label>
            <label>
              Vehículo
              <select value={valorVehiculo} onChange={(e) => elegirVehiculo(e.target.value)}>
                <option value="">Elegir…</option>
                <option value="crear">Crear vehículo nuevo</option>
                {b.coincidencia.vehiculo.candidatos.map((c) => (
                  <option key={c.id} value={c.id}>{nombreVehiculo(c.id)} ({c.motivo})</option>
                ))}
                {base.vehiculos.filter((v) => !candidatosV.has(v.id)).map((v) => (
                  <option key={v.id} value={v.id}>{nombreVehiculo(v.id)}</option>
                ))}
              </select>
              {b.vehiculo.id && motivo(b.coincidencia.vehiculo.candidatos, b.vehiculo.id) && (
                <small className="imp-ayuda">Coincide por {motivo(b.coincidencia.vehiculo.candidatos, b.vehiculo.id)}.</small>
              )}
            </label>
          </div>

          {dueñoDistinto(b, base) && (
            <label className="imp-check">
              <input type="checkbox" checked={b.cambiar_propietario} onChange={(e) => cambiar((x) => ({ ...x, cambiar_propietario: e.target.checked, propietario_confirmado: e.target.checked }))} />
              Confirmo el cambio de propietario de este vehículo.
            </label>
          )}
          {necesitaConfirmarPropietario(b, base) && !dueñoDistinto(b, base) && (
            b.relacion.estado === "respaldado" && b.relacion.fragmento && b.cliente.modo !== "bloque" ? (
              <p className="imp-respaldo">Propiedad indicada en el mensaje: “{b.relacion.fragmento}”</p>
            ) : (
              <label className="imp-check">
                <input type="checkbox" checked={b.propietario_confirmado} onChange={(e) => cambiar((x) => ({ ...x, propietario_confirmado: e.target.checked }))} />
                Confirmo que esta persona es propietaria del vehículo.
              </label>
            )
          )}

          {cambios.length > 0 && (
            <div className="imp-cambios">
              <h4>Cambios sobre datos existentes</h4>
              {cambios.map((c) => {
                const clave = claveCambio(c);
                const etiqueta = etiquetaCampo(c);
                const formato = (v: string | null) => v === null ? "sin dato" : c.campo.startsWith("precio") ? plata(Number(v)) : v;
                return (
                  <label key={clave} className="imp-check">
                    <input
                      type="checkbox"
                      checked={b.cambios_aceptados.includes(clave)}
                      onChange={(e) => cambiar((x) => ({
                        ...x,
                        cambios_aceptados: e.target.checked ? [...x.cambios_aceptados, clave] : x.cambios_aceptados.filter((k) => k !== clave),
                      }))}
                    />
                    <span>{etiqueta}: {formato(c.de)} → <b>{formato(c.a)}</b></span>
                  </label>
                );
              })}
            </div>
          )}

          {SECCIONES.map(([entidad, nombre]) => {
            const campos = b.campos.filter((c) => c.entidad === entidad);
            if (!campos.length) return null;
            return (
              <fieldset key={entidad} className="imp-seccion">
                <legend>{nombre}</legend>
                <div className="imp-campos">
                  {campos.map((c) => <FilaCampo key={c.id} campo={c} cambiar={actualizarCampo} />)}
                </div>
              </fieldset>
            );
          })}

          {original}

          {problemas.length > 0 && (
            <ul className="imp-problemas">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>
          )}
        </>
      )}
    </article>
  );
}
