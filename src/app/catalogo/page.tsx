"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SLUG, wa } from "@/lib/datos";

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
};

export default function Catalogo() {
  const [autos, setAutos] = useState<Auto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [marca, setMarca] = useState("");
  const [orden, setOrden] = useState("recientes");

  useEffect(() => {
    supabase
      .from("autos")
      .select("id,codigo,marca,modelo,anio,km,precio,estado,fotos,automotoras!inner(slug)")
      .eq("automotoras.slug", SLUG)
      .in("estado", ["disponible", "reservado"])
      .order("creado_en", { ascending: false })
      .then(({ data }) => {
        setAutos((data as unknown as Auto[]) ?? []);
        setCargando(false);
      });
  }, []);

  const marcas = useMemo(
    () => Array.from(new Set(autos.map((a) => a.marca))).sort(),
    [autos]
  );

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    let r = autos.filter(
      (a) =>
        (!marca || a.marca === marca) &&
        (!t || (a.marca + " " + a.modelo + " " + a.anio + " " + a.codigo).toLowerCase().includes(t))
    );
    if (orden === "precio_asc") r = [...r].sort((a, b) => a.precio - b.precio);
    if (orden === "precio_desc") r = [...r].sort((a, b) => b.precio - a.precio);
    if (orden === "anio_desc") r = [...r].sort((a, b) => b.anio - a.anio);
    return r;
  }, [autos, q, marca, orden]);

  return (
    <main className="det">
      <h1>Catálogo completo</h1>
      <p className="sub">
        {cargando ? "Cargando..." : lista.length + " auto(s) disponibles"}
      </p>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por marca, modelo, año o código"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar"
        />
        <select value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Marca">
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar">
          <option value="recientes">Más recientes</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="anio_desc">Año: más nuevos</option>
        </select>
      </div>

      <div className="grid">
        {lista.map((x) => (
          <article className="car" key={x.id}>
            <Link href={"/autos/" + x.codigo} style={{ display: "block" }}>
              {x.fotos && x.fotos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="foto"
                  src={x.fotos[0]}
                  alt={x.marca + " " + x.modelo}
                  style={{ objectFit: "cover", width: "100%", display: "block" }}
                />
              ) : (
                <div className="foto">Foto próximamente</div>
              )}
            </Link>
            <div className="in">
              <h3><Link href={"/autos/" + x.codigo}>{x.marca} {x.modelo}</Link></h3>
              <p className="dat">
                {x.anio} · {x.km ? x.km.toLocaleString("es-CL") + " km" : "km por confirmar"} · Ref {x.codigo}
                {x.estado === "reservado" ? " · RESERVADO" : ""}
              </p>
              <div className="precio">${x.precio.toLocaleString("es-CL")}</div>
              <Link className="btn" href={"/autos/" + x.codigo}>Ver fotos y detalles</Link>
              <a
                className="btn"
                href={wa("Hola, me interesa el " + x.marca + " " + x.modelo + " " + x.anio + " (Ref " + x.codigo + ")")}
              >
                Consultar por WhatsApp
              </a>
            </div>
          </article>
        ))}
      </div>
      {!cargando && lista.length === 0 && (
        <p className="sub">No encontramos autos con esa búsqueda.</p>
      )}
    </main>
  );
}
