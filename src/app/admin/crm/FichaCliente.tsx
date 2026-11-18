"use client";

import { useCallback, useEffect, useState } from "react";
import { CamposCliente, CamposOportunidad, SelectorEtapa } from "./Campos";
import {
  actualizarCliente,
  actualizarOportunidad,
  borrarCliente,
  borrarOportunidad,
  crearActividad,
  crearOportunidad,
  ErrorCRM,
  listarActividades,
} from "./datos";
import {
  aDatosOportunidad,
  borradorCliente,
  borradorOportunidad,
  CANALES,
  enlaceWhatsApp,
  estaAbierta,
  fechaCorta,
  fechaHora,
  GESTIONES,
  nombreCanal,
  nombreEtapa,
  plata,
  sumarDias,
  validarCliente,
  vehiculoDe,
  type Actividad,
  type AutoCRM,
  type Canal,
  type Cliente,
  type Etapa,
  type Oportunidad,
  type TipoActividad,
} from "./tipos";

type Comunes = {
  automotoraId: string;
  autos: AutoCRM[];
  hoy: string;
  avisar: (texto: string, error?: boolean) => void;
  recargar: () => Promise<void>;
};

const mensaje = (e: unknown) => (e instanceof ErrorCRM ? e.message : "No se pudo completar la acción.");

function BloqueOportunidad({
  oportunidad,
  cambiarEtapa,
  refrescar,
  autos,
  avisar,
}: Pick<Comunes, "autos" | "avisar"> & {
  oportunidad: Oportunidad;
  cambiarEtapa: (o: Oportunidad, etapa: Etapa, motivo: string | null) => Promise<void>;
  refrescar: () => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(() => borradorOportunidad(oportunidad));
  const [ocupado, setOcupado] = useState(false);

  async function ejecutar(accion: () => Promise<void>, ok: string) {
    setOcupado(true);
    try {
      await accion();
      avisar(ok);
      setEditando(false);
      await refrescar();
    } catch (e) {
      avisar(mensaje(e), true);
    }
    setOcupado(false);
  }

  return (
    <article className={"crm-op" + (estaAbierta(oportunidad) ? "" : " cerrada")}>
      <div className="crm-op-cab">
        <div>
          <h4>{vehiculoDe(oportunidad)}</h4>
          <p className="ap-auto-datos">
            {nombreCanal(oportunidad.canal)} · {fechaCorta(oportunidad.creado_en)}
            {oportunidad.presupuesto ? " · " + plata(oportunidad.presupuesto) : ""}
          </p>
          {oportunidad.auto_resumen && oportunidad.interes && <p className="ap-auto-datos">Busca: {oportunidad.interes}</p>}
          {oportunidad.motivo_perdida && <p className="ap-auto-datos">Motivo: {oportunidad.motivo_perdida}</p>}
          {oportunidad.proxima_fecha && (
            <p className="crm-proxima">
              {fechaCorta(oportunidad.proxima_fecha)}: {oportunidad.proxima_accion || "Hacer seguimiento"}
            </p>
          )}
        </div>
        <SelectorEtapa
          oportunidad={oportunidad}
          ocupado={ocupado}
          cambiar={(etapa, motivo) => {
            setOcupado(true);
            cambiarEtapa(oportunidad, etapa, motivo).finally(() => setOcupado(false));
          }}
        />
      </div>
      {editando ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(
              () => actualizarOportunidad(oportunidad.id, aDatosOportunidad(borrador, autos, oportunidad)),
              "Oportunidad actualizada."
            );
          }}
        >
          <CamposOportunidad valor={borrador} cambiar={setBorrador} autos={autos} autoActual={oportunidad.auto_id} />
          <div className="ap-botones crm-separado">
            <button type="submit" className="ap-b principal" disabled={ocupado}>Guardar</button>
            <button type="button" className="ap-b" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="ap-botones">
          <button
            type="button"
            className="ap-b"
            onClick={() => {
              setBorrador(borradorOportunidad(oportunidad));
              setEditando(true);
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className="ap-b peligro"
            disabled={ocupado}
            onClick={() => {
              if (confirm("¿Eliminar esta oportunidad y su historial? No se puede deshacer.")) {
                ejecutar(() => borrarOportunidad(oportunidad.id), "Oportunidad eliminada.");
              }
            }}
          >
            Eliminar
          </button>
        </div>
      )}
    </article>
  );
}

export default function FichaCliente({
  cliente,
  oportunidades,
  automotoraId,
  autos,
  hoy,
  avisar,
  recargar,
  cambiarEtapa,
  cerrar,
}: Comunes & {
  cliente: Cliente;
  oportunidades: Oportunidad[];
  cambiarEtapa: (o: Oportunidad, etapa: Etapa, motivo: string | null) => Promise<void>;
  cerrar: () => void;
}) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState(() => borradorCliente(cliente));
  const [nueva, setNueva] = useState<ReturnType<typeof borradorOportunidad> | null>(null);
  const [tipo, setTipo] = useState<TipoActividad>("nota");
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [opGestion, setOpGestion] = useState("");
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargarHistorial = useCallback(async () => {
    try {
      setActividades(await listarActividades(cliente.id));
      setErrorHistorial("");
    } catch (e) {
      setErrorHistorial(mensaje(e));
    }
  }, [cliente.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga el historial al abrir la ficha
    cargarHistorial();
  }, [cargarHistorial]);

  const refrescar = async () => {
    await Promise.all([recargar(), cargarHistorial()]);
  };

  async function ejecutar(accion: () => Promise<void>, ok: string) {
    setOcupado(true);
    try {
      await accion();
      avisar(ok);
      await refrescar();
      setOcupado(false);
      return true;
    } catch (e) {
      avisar(mensaje(e), true);
      setOcupado(false);
      return false;
    }
  }

  async function guardarCliente(e: React.FormEvent) {
    e.preventDefault();
    const validado = validarCliente(datos);
    if ("error" in validado) {
      avisar(validado.error, true);
      return;
    }
    if (await ejecutar(() => actualizarCliente(cliente.id, validado.datos), "Cliente actualizado.")) setEditando(false);
  }

  async function guardarNueva(e: React.FormEvent) {
    e.preventDefault();
    if (!nueva) return;
    const creada = await ejecutar(async () => {
      await crearOportunidad(automotoraId, cliente.id, aDatosOportunidad(nueva, autos));
    }, "Oportunidad agregada.");
    if (creada) setNueva(null);
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido) return;
    const hecho = await ejecutar(
      () =>
        crearActividad(automotoraId, {
          cliente_id: cliente.id,
          oportunidad_id: opGestion || null,
          tipo,
          canal: tipo === "mensaje" ? canal : null,
          contenido,
        }),
      "Gestión registrada."
    );
    if (hecho) setTexto("");
  }

  const wa = enlaceWhatsApp(cliente, oportunidades.find(estaAbierta));
  const etiqueta = (a: Actividad) =>
    a.tipo === "etapa"
      ? "Cambio de etapa"
      : (GESTIONES.find((g) => g.v === a.tipo)?.t ?? a.tipo) + (a.canal ? " · " + nombreCanal(a.canal) : "");

  return (
    <div className="crm-ficha">
      <button type="button" className="ap-b crm-volver" onClick={cerrar}>← Volver</button>

      <div className="crm-ficha-cab">
        <div>
          <h2>{cliente.nombre}</h2>
          <p className="ap-auto-datos">
            {[cliente.telefono, cliente.email, cliente.red_social, cliente.comuna].filter(Boolean).join(" · ")}
          </p>
          {cliente.notas && <p className="crm-notas">{cliente.notas}</p>}
        </div>
        <div className="ap-botones">
          {wa && <a className="ap-b principal" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
          {cliente.telefono && <a className="ap-b" href={"tel:" + cliente.telefono}>Llamar</a>}
          {cliente.email && <a className="ap-b" href={"mailto:" + cliente.email}>Correo</a>}
          <button
            type="button"
            className="ap-b"
            onClick={() => {
              setDatos(borradorCliente(cliente));
              setEditando(!editando);
            }}
          >
            Editar datos
          </button>
          <button
            type="button"
            className="ap-b peligro"
            disabled={ocupado}
            onClick={async () => {
              if (!confirm("¿Eliminar a " + cliente.nombre + " con sus oportunidades e historial? No se puede deshacer.")) return;
              setOcupado(true);
              try {
                await borrarCliente(cliente.id);
                avisar("Cliente eliminado.");
                cerrar();
                await recargar();
              } catch (e) {
                avisar(mensaje(e), true);
                setOcupado(false);
              }
            }}
          >
            Eliminar cliente
          </button>
        </div>
      </div>

      {editando && (
        <form className="ap-bloque" onSubmit={guardarCliente}>
          <CamposCliente valor={datos} cambiar={setDatos} />
          <div className="ap-botones crm-separado">
            <button type="submit" className="ap-b principal" disabled={ocupado}>Guardar cambios</button>
            <button type="button" className="ap-b" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="crm-ficha-cuerpo">
        <div>
          <div className="crm-sub">
            <h3>Oportunidades</h3>
            <button
              type="button"
              className="ap-b"
              onClick={() => setNueva(nueva ? null : borradorOportunidad(undefined, sumarDias(hoy, 1)))}
            >
              + Agregar
            </button>
          </div>
          {nueva && (
            <form className="ap-bloque" onSubmit={guardarNueva}>
              <CamposOportunidad valor={nueva} cambiar={setNueva} autos={autos} />
              <div className="ap-botones crm-separado">
                <button type="submit" className="ap-b principal" disabled={ocupado}>Guardar oportunidad</button>
                <button type="button" className="ap-b" onClick={() => setNueva(null)}>Cancelar</button>
              </div>
            </form>
          )}
          {oportunidades.length === 0 && !nueva && <p className="ap-conteo">Este cliente no tiene oportunidades.</p>}
          <div className="crm-lista">
            {oportunidades.map((o) => (
              <BloqueOportunidad
                key={o.id}
                oportunidad={o}
                autos={autos}
                avisar={avisar}
                refrescar={refrescar}
                cambiarEtapa={async (op, etapa, motivo) => {
                  await cambiarEtapa(op, etapa, motivo);
                  await cargarHistorial();
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <h3>Historial</h3>
          <form className="ap-bloque crm-gestion" onSubmit={registrar}>
            <div className="crm-gestion-fila">
              <label>
                Gestión
                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoActividad)}>
                  {GESTIONES.map((g) => <option key={g.v} value={g.v}>{g.t}</option>)}
                </select>
              </label>
              {tipo === "mensaje" && (
                <label>
                  Canal
                  <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
                    {CANALES.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
                  </select>
                </label>
              )}
              {oportunidades.length > 0 && (
                <label>
                  Sobre
                  <select value={opGestion} onChange={(e) => setOpGestion(e.target.value)}>
                    <option value="">El cliente en general</option>
                    {oportunidades.map((o) => (
                      <option key={o.id} value={o.id}>{vehiculoDe(o)} ({nombreEtapa(o.etapa)})</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <label>
              Qué pasó
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={2000} required />
            </label>
            <button type="submit" className="ap-b principal" disabled={ocupado || !texto.trim()}>Registrar</button>
          </form>
          {errorHistorial && <p className="adm-msg">{errorHistorial}</p>}
          {actividades.length === 0 && !errorHistorial ? (
            <p className="ap-conteo">Todavía no hay gestiones registradas.</p>
          ) : (
            <ol className="crm-historial">
              {actividades.map((a) => (
                <li key={a.id}>
                  <span>{etiqueta(a)} · {fechaHora(a.creado_en)}</span>
                  <p>{a.contenido}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
