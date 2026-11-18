"use client";

import Link from "next/link";
import Aparece from "@/components/Aparece";
import { useMemo, useState } from "react";
import { wa } from "@/lib/datos";
import { imgSrc, imgSrcSet } from "@/lib/img";

type Auto = {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  anio: number;
  km: number | null;
  precio: number;
  estado: string;
  fotos: string[];
  ubicacion: string | null;
  tipo: string | null;
};

const plata = (n: number) => "$" + n.toLocaleString("es-CL");

function numero(t: string): number | null {
  const n = Number(t.replace(/\D/g, ""));
  return t.trim() && n > 0 ? n : null;
}

export default function CatalogoCliente({ autosInicial }: { autosInicial: Auto[] }) {
  const autos = autosInicial;
  const cargando = false;
  const [q, setQ] = useState("");
  const [marca, setMarca] = useState("");
  const [ubic, setUbic] = useState("");
  const [tipo, setTipo] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [orden, setOrden] = useState("recientes");
  // En el teléfono los filtros van plegados para que los autos se vean de inmediato.
  const [verFiltros, setVerFiltros] = useState(false);

  const marcas = useMemo(
    () => Array.from(new Set(autos.map((a) => a.marca))).sort(),
    [autos]
  );
  const ubicaciones = useMemo(
    () => Array.from(new Set(autos.map((a) => a.ubicacion ?? "").filter(Boolean))).sort(),
    [autos]
  );
  const tipos = useMemo(
    () => Array.from(new Set(autos.map((a) => a.tipo ?? "").filter(Boolean))).sort(),
    [autos]
  );
  const rango = useMemo(() => {
    if (!autos.length) return null;
    const p = autos.map((a) => a.precio);
    return { menor: Math.min(...p), mayor: Math.max(...p) };
  }, [autos]);

  const desde = numero(min);
  const hasta = numero(max);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    let r = autos.filter(
      (a) =>
        (!marca || a.marca === marca) &&
        (!ubic || (a.ubicacion ?? "") === ubic) &&
        (!tipo || (a.tipo ?? "") === tipo) &&
        (desde === null || a.precio >= desde) &&
        (hasta === null || a.precio <= hasta) &&
        (!t ||
          (a.marca + " " + a.modelo + " " + a.anio + " " + a.codigo + " " + (a.ubicacion ?? "") + " " + (a.tipo ?? ""))
            .toLowerCase()
            .includes(t))
    );
    if (orden === "precio_asc") r = [...r].sort((a, b) => a.precio - b.precio);
    if (orden === "precio_desc") r = [...r].sort((a, b) => b.precio - a.precio);
    if (orden === "anio_desc") r = [...r].sort((a, b) => b.anio - a.anio);
    return r;
  }, [autos, q, marca, ubic, tipo, desde, hasta, orden]);

  const hayFiltros = Boolean(q || marca || ubic || tipo || min || max);
  const plegados = [ubic, marca, min, max, orden !== "recientes" ? orden : ""].filter(Boolean).length;

  function limpiar() {
    setQ("");
    setMarca("");
    setUbic("");
    setTipo("");
    setMin("");
    setMax("");
    setOrden("recientes");
  }

  return (
    <main className="det catalogo-fondo">
      {/* Fondo liso: sin foto detrás para que los autos resalten. */}
      <div className="catalogo-contenido">
      <h1>Catálogo completo</h1>
      <p className="sub">
        {rango
          ? "Precios desde " + plata(rango.menor) + " hasta " + plata(rango.mayor)
          : cargando
          ? "Cargando..."
          : ""}
      </p>

      {tipos.length > 0 && (
        <div className="chips" role="group" aria-label="Tipo de vehículo">
          <button type="button" className={"chip" + (tipo === "" ? " on" : "")} aria-pressed={tipo === ""} onClick={() => setTipo("")}>
            Todos
          </button>
          {tipos.map((t) => (
            <button type="button" key={t} className={"chip" + (tipo === t ? " on" : "")} aria-pressed={tipo === t} onClick={() => setTipo(t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      <div className={"filtros2" + (verFiltros ? " abiertos" : "")}>
        <input
          className="f-buscar"
          type="search"
          placeholder="Buscar por marca, modelo, año, código o ubicación"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar"
        />
        <button
          type="button"
          className="btn f-toggle"
          aria-expanded={verFiltros}
          onClick={() => setVerFiltros((v) => !v)}
        >
          {verFiltros ? "Ocultar filtros" : "Más filtros" + (plegados ? " (" + plegados + ")" : "")}
        </button>
        <select value={ubic} onChange={(e) => setUbic(e.target.value)} aria-label="Ubicación">
          <option value="">Todas las ubicaciones</option>
          {ubicaciones.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Marca">
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          placeholder={rango ? "Precio desde (" + plata(rango.menor) + ")" : "Precio desde"}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          aria-label="Precio desde"
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder={rango ? "Precio hasta (" + plata(rango.mayor) + ")" : "Precio hasta"}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          aria-label="Precio hasta"
        />
        <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar">
          <option value="recientes">Más recientes</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="anio_desc">Año: más nuevos</option>
        </select>
      </div>

      <div className="filtros-pie">
        <span>{cargando ? "Cargando..." : lista.length + " de " + autos.length + " autos"}</span>
        {hayFiltros && (
          <button type="button" className="btn" onClick={limpiar}>Limpiar filtros</button>
        )}
      </div>

      <div className="grid">
        {lista.map((x, i) => (
          <Aparece key={x.id} retraso={(i % 4) * 45} className={i === 0 ? "in" : ""}>
            <article className="car">
            <Link href={"/autos/" + x.codigo} style={{ display: "block" }}>
              <span className="vit-brillo" aria-hidden="true" />
              {x.fotos && x.fotos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="foto"
                  src={imgSrc(x.fotos[0], 640, 60)}
                  srcSet={imgSrcSet(x.fotos[0], 60)}
                  sizes="(max-width: 760px) 100vw, 360px"
                  alt={x.marca + " " + x.modelo}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                  style={{ objectFit: "cover", width: "100%", display: "block" }}
                />
              ) : (
                <div className="foto">Foto próximamente</div>
              )}
            </Link>
            <div className="in">
              <h3><Link href={"/autos/" + x.codigo}>{x.marca} {x.modelo}</Link></h3>
              {x.tipo && <span className="tipo-tag">{x.tipo}</span>}
              <p className="dat">
                {x.anio} · {x.km ? x.km.toLocaleString("es-CL") + " km" : "km por confirmar"} · Ref {x.codigo}
                {x.estado === "reservado" ? " · RESERVADO" : ""}
              </p>
              {x.ubicacion && (
                <p className="ubic">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
                  {x.ubicacion}
                </p>
              )}
              <div className="precio">{plata(x.precio)}</div>
              <Link className="btn" href={"/autos/" + x.codigo}>Ver fotos y detalles</Link>
              <a
                className="btn"
                href={wa("Hola, me interesa el " + x.marca + " " + x.modelo + " " + x.anio + " (Ref " + x.codigo + ")")}
              >
                Consultar por WhatsApp
              </a>
            </div>
            </article>
          </Aparece>
        ))}
      </div>
      {!cargando && lista.length === 0 && (
        <p className="sub">No encontramos autos con esos filtros. Prueba ampliando el rango de precio o la ubicación.</p>
      )}
      </div>
    </main>
  );
}