"use client";

import "./crm.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SelectorEtapa } from "./Campos";
import { actualizarOportunidad, cargarCRM, ErrorCRM } from "./datos";
import FichaCliente from "./FichaCliente";
import FormContacto from "./FormContacto";
import {
  aCSV,
  enlaceWhatsApp,
  estaAbierta,
  ETAPAS,
  fechaCorta,
  fechaLocal,
  hoyISO,
  nombreCanal,
  nombreEtapa,
  plata,
  sumarDias,
  vehiculoDe,
  type AutoCRM,
  type Cliente,
  type Etapa,
  type Oportunidad,
} from "./tipos";

type Vista = "hoy" | "oportunidades" | "clientes";
type Modo = { tipo: "lista" } | { tipo: "nuevo" } | { tipo: "ficha"; id: string };

const VISTAS: [Vista, string][] = [["hoy", "Seguimiento"], ["oportunidades", "Oportunidades"], ["clientes", "Clientes"]];

export default function PanelCRM({
  automotoraId,
  autos,
  avisar,
  marcarAutoVendido,
}: {
  automotoraId: string | null;
  autos: AutoCRM[];
  avisar: (texto: string, error?: boolean) => void;
  marcarAutoVendido: (id: string) => Promise<void>;
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinActivar, setSinActivar] = useState(false);
  const [error, setError] = useState("");
  const [hoy, setHoy] = useState(hoyISO);
  const [vista, setVista] = useState<Vista>("hoy");
  const [modo, setModo] = useState<Modo>({ tipo: "lista" });
  const [busqueda, setBusqueda] = useState("");
  const [etapa, setEtapa] = useState<"abiertas" | Etapa>("abiertas");
  const [ocupada, setOcupada] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!automotoraId) return;
    try {
      const datos = await cargarCRM(automotoraId);
      setClientes(datos.clientes);
      setOportunidades(datos.oportunidades);
      setHoy(hoyISO());
      setError("");
      setSinActivar(false);
    } catch (e) {
      setSinActivar(e instanceof ErrorCRM && e.sinActivar);
      setError(e instanceof ErrorCRM ? e.message : "No se pudo cargar el CRM.");
    }
    setCargando(false);
  }, [automotoraId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al abrir la pestaña
    recargar();
  }, [recargar]);

  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const abiertas = useMemo(() => oportunidades.filter(estaAbierta), [oportunidades]);

  const seguimiento = useMemo(() => {
    const porFecha = (a: Oportunidad, b: Oportunidad) => (a.proxima_fecha ?? "").localeCompare(b.proxima_fecha ?? "");
    return {
      atrasadas: abiertas.filter((o) => o.proxima_fecha && o.proxima_fecha < hoy).sort(porFecha),
      paraHoy: abiertas.filter((o) => o.proxima_fecha === hoy),
      sinFecha: abiertas.filter((o) => !o.proxima_fecha),
      proximas: abiertas.filter((o) => o.proxima_fecha && o.proxima_fecha > hoy).sort(porFecha).slice(0, 10),
    };
  }, [abiertas, hoy]);

  const vendidasMes = oportunidades.filter(
    (o) => o.etapa === "vendido" && o.cerrado_en && fechaLocal(o.cerrado_en).slice(0, 7) === hoy.slice(0, 7)
  ).length;

  const termino = busqueda.trim().toLowerCase();
  const coincide = useCallback(
    (c: Cliente | undefined) =>
      !termino ||
      (!!c &&
        [c.nombre, c.telefono, c.email, c.red_social, c.comuna].some((v) => v?.toLowerCase().includes(termino))),
    [termino]
  );

  const opsFiltradas = oportunidades.filter((o) => {
    const okEtapa = etapa === "abiertas" ? estaAbierta(o) : o.etapa === etapa;
    const okTexto = coincide(clientePorId.get(o.cliente_id)) || vehiculoDe(o).toLowerCase().includes(termino);
    return okEtapa && okTexto;
  });
  const clientesFiltrados = clientes.filter(coincide);

  async function cambiarEtapa(o: Oportunidad, nueva: Etapa, motivo: string | null) {
    setOcupada(o.id);
    try {
      await actualizarOportunidad(o.id, { etapa: nueva, motivo_perdida: motivo });
      avisar("Etapa actualizada: " + nombreEtapa(nueva) + ".");
      await recargar();
      const auto = autos.find((a) => a.id === o.auto_id);
      if (
        nueva === "vendido" &&
        auto &&
        auto.estado !== "vendido" &&
        confirm("¿Marcar también " + auto.marca + " " + auto.modelo + " como vendido? Dejará de aparecer en la página.")
      ) {
        await marcarAutoVendido(auto.id);
      }
    } catch (e) {
      avisar(e instanceof ErrorCRM ? e.message : "No se pudo cambiar la etapa.", true);
    }
    setOcupada(null);
  }

  async function posponer(o: Oportunidad) {
    setOcupada(o.id);
    try {
      await actualizarOportunidad(o.id, { proxima_fecha: sumarDias(hoy, 1) });
      avisar("Seguimiento movido a mañana.");
      await recargar();
    } catch (e) {
      avisar(e instanceof ErrorCRM ? e.message : "No se pudo mover el seguimiento.", true);
    }
    setOcupada(null);
  }

  function exportar() {
    const filas = [[
      "Cliente", "Teléfono", "Correo", "Red social", "Comuna", "Vehículo", "Qué busca", "Canal",
      "Presupuesto", "Etapa", "Motivo de pérdida", "Próxima acción", "Fecha próxima acción", "Creada",
    ]].concat(
      oportunidades.map((o) => {
        const c = clientePorId.get(o.cliente_id);
        return [
          c?.nombre ?? "", c?.telefono ?? "", c?.email ?? "", c?.red_social ?? "", c?.comuna ?? "",
          o.auto_resumen ?? "", o.interes ?? "", nombreCanal(o.canal), o.presupuesto ? String(o.presupuesto) : "",
          nombreEtapa(o.etapa), o.motivo_perdida ?? "", o.proxima_accion ?? "", o.proxima_fecha ?? "", fechaLocal(o.creado_en),
        ];
      })
    );
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([aCSV(filas)], { type: "text/csv;charset=utf-8" }));
    enlace.download = "crm-chillan-vende-autos.csv";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  function tarjeta(o: Oportunidad) {
    const c = clientePorId.get(o.cliente_id);
    if (!c) return null;
    const wa = enlaceWhatsApp(c, o);
    const atrasada = estaAbierta(o) && !!o.proxima_fecha && o.proxima_fecha < hoy;
    return (
      <article className={"crm-tarjeta" + (atrasada ? " atrasada" : "")}>
        <div>
          <button type="button" className="crm-nombre" onClick={() => setModo({ tipo: "ficha", id: c.id })}>{c.nombre}</button>
          <p className="crm-vehiculo">{vehiculoDe(o)}</p>
          <p className="ap-auto-datos">
            {nombreEtapa(o.etapa)} · {nombreCanal(o.canal)}{o.presupuesto ? " · " + plata(o.presupuesto) : ""}
          </p>
          {o.motivo_perdida && <p className="ap-auto-datos">Motivo: {o.motivo_perdida}</p>}
          {estaAbierta(o) && (
            <p className={"crm-proxima" + (o.proxima_fecha ? "" : " falta")}>
              {o.proxima_fecha
                ? (atrasada ? "Atrasado · " : "") + fechaCorta(o.proxima_fecha) + ": " + (o.proxima_accion || "Hacer seguimiento")
                : "Falta definir próxima acción"}
            </p>
          )}
        </div>
        <div className="crm-tarjeta-acc">
          <SelectorEtapa
            key={o.etapa}
            oportunidad={o}
            ocupado={ocupada === o.id}
            cambiar={(e, m) => cambiarEtapa(o, e, m)}
          />
          <div className="ap-botones">
            {wa && <a className="ap-b principal" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
            {c.telefono && <a className="ap-b" href={"tel:" + c.telefono}>Llamar</a>}
            <button type="button" className="ap-b" onClick={() => setModo({ tipo: "ficha", id: c.id })}>Ficha</button>
            {estaAbierta(o) && o.proxima_fecha && o.proxima_fecha <= hoy && (
              <button type="button" className="ap-b" disabled={ocupada === o.id} onClick={() => posponer(o)}>Mañana</button>
            )}
          </div>
        </div>
      </article>
    );
  }

  const grupo = (titulo: string, lista: Oportunidad[]) =>
    lista.length > 0 && (
      <div className="crm-grupo">
        <h3>{titulo} <em>{lista.length}</em></h3>
        <div className="crm-lista">{lista.map((o) => <div key={o.id}>{tarjeta(o)}</div>)}</div>
      </div>
    );

  if (sinActivar) {
    return (
      <section className="crm" aria-label="Clientes">
        <div className="ap-vacio">
          <h2>CRM pendiente de activar</h2>
          <p>Falta crear sus tablas en la base de datos. El resto del panel sigue funcionando normalmente.</p>
        </div>
      </section>
    );
  }

  const ficha = modo.tipo === "ficha" ? clientePorId.get(modo.id) : undefined;

  return (
    <section className="crm" aria-label="Clientes">
      {error && (
        <p className="adm-msg">
          {error} <button type="button" className="ap-b" onClick={recargar}>Reintentar</button>
        </p>
      )}

      {modo.tipo === "nuevo" && automotoraId ? (
        <FormContacto
          automotoraId={automotoraId}
          clientes={clientes}
          autos={autos}
          hoy={hoy}
          avisar={avisar}
          abrirFicha={(id) => setModo({ tipo: "ficha", id })}
          cerrar={() => setModo({ tipo: "lista" })}
          listo={async (id) => {
            await recargar();
            setModo({ tipo: "ficha", id });
          }}
        />
      ) : ficha && automotoraId ? (
        <FichaCliente
          key={ficha.id}
          cliente={ficha}
          oportunidades={oportunidades.filter((o) => o.cliente_id === ficha.id)}
          automotoraId={automotoraId}
          autos={autos}
          hoy={hoy}
          avisar={avisar}
          recargar={recargar}
          cambiarEtapa={cambiarEtapa}
          cerrar={() => setModo({ tipo: "lista" })}
        />
      ) : (
        <>
          <div className="crm-cab">
            <div>
              <h2>Clientes y ventas</h2>
              <p className="ap-ref">Registra cada consulta y define cuándo volver a contactarla.</p>
            </div>
            <div className="ap-botones">
              <button type="button" className="ap-b" onClick={exportar} disabled={!oportunidades.length}>Descargar Excel (CSV)</button>
              <button type="button" className="ap-b principal" onClick={() => setModo({ tipo: "nuevo" })} disabled={!automotoraId}>
                + Nuevo contacto
              </button>
            </div>
          </div>

          <div className="ap-resumen crm-resumen">
            <div><b>{seguimiento.paraHoy.length}</b><span>Para hoy</span></div>
            <div className={seguimiento.atrasadas.length ? "alerta" : ""}><b>{seguimiento.atrasadas.length}</b><span>Atrasados</span></div>
            <div><b>{abiertas.length}</b><span>Oportunidades abiertas</span></div>
            <div><b>{vendidasMes}</b><span>Vendidos este mes</span></div>
          </div>

          <div className="crm-vistas" role="group" aria-label="Vista del CRM">
            {VISTAS.map(([v, t]) => (
              <button key={v} type="button" className={"ap-b" + (vista === v ? " activo" : "")} aria-pressed={vista === v} onClick={() => setVista(v)}>
                {t}
              </button>
            ))}
          </div>

          {cargando ? (
            <p className="ap-conteo">Cargando…</p>
          ) : vista === "hoy" ? (
            abiertas.length === 0 ? (
              <div className="ap-vacio"><p>Todavía no hay oportunidades abiertas. Agrega tu primer contacto para empezar.</p></div>
            ) : (
              <>
                {grupo("Atrasados", seguimiento.atrasadas)}
                {grupo("Para hoy", seguimiento.paraHoy)}
                {grupo("Sin próxima acción", seguimiento.sinFecha)}
                {grupo("Próximos", seguimiento.proximas)}
              </>
            )
          ) : (
            <>
              <div className={"ap-barra crm-barra" + (vista === "clientes" ? " solo" : "")}>
                <label className="ap-buscar">
                  <span className="ap-oculto">Buscar</span>
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder={vista === "clientes" ? "Buscar por nombre, teléfono, correo o comuna…" : "Buscar por cliente o vehículo…"}
                  />
                </label>
                {vista === "oportunidades" && (
                  <label>
                    <span className="ap-oculto">Filtrar por etapa</span>
                    <select value={etapa} onChange={(e) => setEtapa(e.target.value as "abiertas" | Etapa)}>
                      <option value="abiertas">Todas las abiertas</option>
                      {ETAPAS.map((x) => (
                        <option key={x.v} value={x.v}>
                          {x.t} ({oportunidades.filter((o) => o.etapa === x.v).length})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {vista === "oportunidades" ? (
                opsFiltradas.length === 0 ? (
                  <div className="ap-vacio"><p>No hay oportunidades con estos filtros.</p></div>
                ) : (
                  <div className="crm-lista">{opsFiltradas.map((o) => <div key={o.id}>{tarjeta(o)}</div>)}</div>
                )
              ) : clientesFiltrados.length === 0 ? (
                <div className="ap-vacio"><p>No hay clientes para mostrar.</p></div>
              ) : (
                <div className="crm-lista">
                  {clientesFiltrados.map((c) => {
                    const propias = oportunidades.filter((o) => o.cliente_id === c.id);
                    return (
                      <button key={c.id} type="button" className="crm-cliente" onClick={() => setModo({ tipo: "ficha", id: c.id })}>
                        <b>{c.nombre}</b>
                        <span>{[c.telefono, c.email, c.red_social, c.comuna].filter(Boolean).join(" · ")}</span>
                        <em>{propias.filter(estaAbierta).length} abiertas · {propias.length} en total</em>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
