"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actualizarOportunidad,
  actualizarSolicitud,
  borrarSolicitud,
  cargarSolicitudes,
  convertirSolicitud,
  ErrorCRM,
  resolverSolicitud,
  urlsFotosSolicitud,
  type SolicitudEvaluacion,
} from "./datos";
import { fechaHora, plata, type Cliente } from "./tipos";

const ESTADOS: Record<SolicitudEvaluacion["estado"], string> = {
  nueva: "Nuevo interesado",
  en_revision: "En revisión",
  convertida: "Convertida en consignación",
  descartada: "Descartada",
};

export default function SolicitudesEvaluacion({
  automotoraId,
  clientes,
  avisar,
  recargarCRM,
  abrirFicha,
}: {
  automotoraId: string;
  clientes: Cliente[];
  avisar: (texto: string, error?: boolean) => void;
  recargarCRM: () => Promise<void>;
  abrirFicha: (id: string) => void;
}) {
  const [lista, setLista] = useState<SolicitudEvaluacion[] | null>(null);
  const [sinActivar, setSinActivar] = useState(false);
  const [filtro, setFiltro] = useState("abiertas");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [convirtiendo, setConvirtiendo] = useState<string | null>(null);
  const [formulario, setFormulario] = useState({ patente: "", precio_solicitado: "", precio_minimo: "", estado: "por_confirmar" });
  const [cliente, setCliente] = useState<Record<string, string>>({});
  const [ocupada, setOcupada] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const datos = await cargarSolicitudes(automotoraId);
      setLista(datos);
      setUrls(await urlsFotosSolicitud(datos.flatMap((s) => s.fotos)));
    } catch (e) {
      if (e instanceof ErrorCRM && e.sinActivar) setSinActivar(true);
      else avisar(e instanceof ErrorCRM ? e.message : "No se pudieron cargar las solicitudes.", true);
      setLista([]);
    }
  }, [automotoraId, avisar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al abrir la vista
    cargar();
  }, [cargar]);

  const visibles = useMemo(
    () => (lista ?? []).filter((s) => (filtro === "abiertas" ? ["nueva", "en_revision"].includes(s.estado) : filtro === "todas" || s.estado === filtro)),
    [lista, filtro]
  );

  async function ejecutar(id: string, accion: () => Promise<unknown>, ok: string) {
    setOcupada(id);
    try {
      await accion();
      avisar(ok);
      await Promise.all([cargar(), recargarCRM()]);
      return true;
    } catch (e) {
      avisar(e instanceof ErrorCRM ? e.message : "No se pudo completar la acción.", true);
      return false;
    } finally {
      setOcupada(null);
    }
  }

  if (sinActivar) return <div className="ap-vacio"><p>Las solicitudes estarán disponibles cuando se active su tabla.</p></div>;
  if (!lista) return <p className="ap-conteo">Cargando…</p>;

  return (
    <>
      <label className="crm-filtro">
        <span className="ap-oculto">Filtrar solicitudes</span>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="abiertas">Por atender</option>
          <option value="todas">Todas</option>
          {Object.entries(ESTADOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </label>
      {visibles.length === 0 && <div className="ap-vacio"><p>No hay solicitudes para mostrar.</p></div>}
      <div className="crm-lista">
        {visibles.map((s) => {
          const abierta = ["nueva", "en_revision"].includes(s.estado);
          const candidatos = s.candidatos.flatMap((id) => clientes.filter((c) => c.id === id));
          const elegido = cliente[s.id] ?? candidatos[0]?.id ?? "";
          const telefono = s.telefono.slice(1);
          const texto = encodeURIComponent(`Hola ${s.nombre.split(" ")[0]}, te escribo de Chillán Vende Autos por la evaluación de tu ${s.marca} ${s.modelo}.`);
          return (
            <article key={s.id} className="crm-op crm-solicitud">
              <div className="crm-op-cab">
                <div>
                  <h4>{s.nombre}</h4>
                  <p className="crm-vehiculo">{s.marca} {s.modelo}{s.version ? ` ${s.version}` : ""} · {s.anio}</p>
                  <p className="ap-auto-datos">
                    {s.km.toLocaleString("es-CL")} km · {s.precio_esperado ? `Espera ${plata(s.precio_esperado)}` : "Sin precio esperado"}
                    {s.patente ? ` · ${s.patente}` : ""} · {s.comuna}
                  </p>
                  <p className="ap-auto-datos">{s.telefono}{s.email ? ` · ${s.email}` : ""} · {fechaHora(s.creado_en)}</p>
                </div>
                <span className="crm-estado">{ESTADOS[s.estado]}</span>
              </div>
              {s.observaciones && <p className="crm-notas">{s.observaciones}</p>}
              {s.fotos.length > 0 && (
                <div className="crm-sol-fotos">
                  {s.fotos.map((f, i) => urls[f] ? (
                    <a key={f} href={urls[f]} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={urls[f]} alt={`Foto ${i + 1} de ${s.marca} ${s.modelo}`} loading="lazy" />
                    </a>
                  ) : null)}
                </div>
              )}
              {s.coincidencia === "revisar" && (
                <div className="crm-existe crm-resolver">
                  <p>Revisa si esta persona ya existe antes de continuar.</p>
                  <label>
                    <span className="ap-oculto">Cliente</span>
                    <select value={elegido} onChange={(e) => setCliente({ ...cliente, [s.id]: e.target.value })}>
                      {candidatos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.telefono ?? c.email}</option>)}
                      <option value="">Crear cliente nuevo</option>
                    </select>
                  </label>
                  <button type="button" className="ap-b principal" disabled={ocupada === s.id} onClick={() => ejecutar(s.id, () => resolverSolicitud(s.id, elegido || null), "Cliente asociado.")}>Confirmar cliente</button>
                </div>
              )}
              <div className="ap-botones">
                <a className="ap-b principal" href={`https://wa.me/${telefono}?text=${texto}`} target="_blank" rel="noreferrer">WhatsApp</a>
                {s.cliente_id && <button type="button" className="ap-b" onClick={() => abrirFicha(s.cliente_id!)}>Abrir ficha</button>}
                {s.estado === "nueva" && <button type="button" className="ap-b" disabled={ocupada === s.id} onClick={() => ejecutar(s.id, () => actualizarSolicitud(s.id, "en_revision"), "Solicitud en revisión.")}>Marcar en revisión</button>}
                {abierta && s.cliente_id && (
                  <button
                    type="button"
                    className="ap-b"
                    onClick={() => {
                      setConvirtiendo(convirtiendo === s.id ? null : s.id);
                      setFormulario({ patente: s.patente ?? "", precio_solicitado: s.precio_esperado ? String(s.precio_esperado) : "", precio_minimo: "", estado: "por_confirmar" });
                    }}
                  >
                    Convertir en consignación
                  </button>
                )}
                {abierta && (
                  <button
                    type="button"
                    className="ap-b"
                    disabled={ocupada === s.id}
                    onClick={() => {
                      if (!confirm("¿Descartar esta solicitud?")) return;
                      ejecutar(s.id, async () => {
                        await actualizarSolicitud(s.id, "descartada");
                        if (s.oportunidad_id) await actualizarOportunidad(s.oportunidad_id, { etapa: "perdido", motivo_perdida: "Solicitud descartada" });
                      }, "Solicitud descartada.");
                    }}
                  >
                    Descartar
                  </button>
                )}
                <button
                  type="button"
                  className="ap-b peligro"
                  disabled={ocupada === s.id}
                  onClick={() => {
                    if (confirm("¿Eliminar la solicitud y sus fotos? No se puede deshacer.")) ejecutar(s.id, () => borrarSolicitud(s), "Solicitud eliminada.");
                  }}
                >
                  Eliminar
                </button>
              </div>
              {convirtiendo === s.id && (
                <form
                  className="crm-convertir"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await ejecutar(s.id, () => convertirSolicitud({ id: s.id, ...formulario }), "Consignación creada.");
                    if (ok) setConvirtiendo(null);
                  }}
                >
                  <label>Patente<input value={formulario.patente} required maxLength={10} onChange={(e) => setFormulario({ ...formulario, patente: e.target.value })} /></label>
                  <label>Precio acordado<input inputMode="numeric" value={formulario.precio_solicitado} onChange={(e) => setFormulario({ ...formulario, precio_solicitado: e.target.value.replace(/\D/g, "") })} /></label>
                  <label>Precio mínimo<input inputMode="numeric" value={formulario.precio_minimo} onChange={(e) => setFormulario({ ...formulario, precio_minimo: e.target.value.replace(/\D/g, "") })} /></label>
                  <label>
                    Estado
                    <select value={formulario.estado} onChange={(e) => setFormulario({ ...formulario, estado: e.target.value })}>
                      <option value="por_confirmar">Por confirmar</option>
                      <option value="activa">Activa</option>
                    </select>
                  </label>
                  <button type="submit" className="ap-b principal" disabled={ocupada === s.id}>Crear consignación</button>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
