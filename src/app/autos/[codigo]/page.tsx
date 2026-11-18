"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SLUG, wa } from "@/lib/datos";
import { foto } from "@/lib/foto";

type Auto = {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number;
  km: number | null;
  precio: number;
  combustible: string | null;
  transmision: string | null;
  color: string | null;
  tipo: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  estado: string;
  fotos: string[];
};

export default function Detalle() {
  const params = useParams<{ codigo: string }>();
  const codigo = decodeURIComponent(params.codigo);
  const [auto, setAuto] = useState<Auto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [i, setI] = useState(0);

  useEffect(() => {
    supabase
      .from("autos")
      .select("*, automotoras!inner(slug)")
      .eq("automotoras.slug", SLUG)
      .eq("codigo", codigo)
      .in("estado", ["disponible", "reservado"])
      .maybeSingle()
      .then(({ data }) => {
        setAuto((data as unknown as Auto) ?? null);
        setCargando(false);
      });
  }, [codigo]);

  if (cargando) return <main className="det"><p className="sub">Cargando...</p></main>;

  if (!auto) {
    return (
      <main className="det">
        <h1>Auto no disponible</h1>
        <p className="sub">Este auto ya no está publicado o el enlace no es correcto.</p>
        <Link className="btn fill" href="/#autos">Autos en exhibición</Link>
      </main>
    );
  }

  const fotos = auto.fotos ?? [];
  const n = fotos.length;
  const actual = n ? fotos[Math.min(i, n - 1)] : null;
  const titulo = auto.marca + " " + auto.modelo + (auto.version ? " " + auto.version : "");
  const datos: [string, string | null][] = [
    ["Año", String(auto.anio)],
    ["Kilometraje", auto.km ? auto.km.toLocaleString("es-CL") + " km" : null],
    ["Combustible", auto.combustible],
    ["Transmisión", auto.transmision],
    ["Color", auto.color],
    ["Tipo", auto.tipo],
    ["Ubicación", auto.ubicacion],
    ["Código", auto.codigo],
  ];

  return (
    <main className="det">
      <Link href="/catalogo" className="det-volver">← Volver a catálogo</Link>
      <div className="det-grid">
        <div>
          <div className="gal-main">
            {actual ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img {...foto(actual, "(max-width: 900px) 100vw, 60vw")} alt={titulo} decoding="async" />
            ) : (
              <div className="foto" style={{ height: "100%" }}>Foto próximamente</div>
            )}
            {n > 1 && (
              <>
                <button className="gal-nav izq" onClick={() => setI((i - 1 + n) % n)} aria-label="Foto anterior">‹</button>
                <button className="gal-nav der" onClick={() => setI((i + 1) % n)} aria-label="Foto siguiente">›</button>
                <span className="gal-cuenta">{Math.min(i, n - 1) + 1} / {n}</span>
              </>
            )}
          </div>
          {n > 1 && (
            <div className="gal-thumbs">
              {fotos.map((u, k) => (
                <button key={u} className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={"Ver foto " + (k + 1)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img {...foto(u, "120px")} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1>{titulo}</h1>
          {auto.estado === "reservado" && <p className="det-reservado">RESERVADO</p>}
          <div className="precio" style={{ fontSize: "2.2rem" }}>${auto.precio.toLocaleString("es-CL")}</div>
          <dl className="det-specs">
            {datos.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          {auto.descripcion && (
            <>
              <h2 style={{ fontSize: "1.5rem", marginTop: 20 }}>Descripción</h2>
              <p style={{ whiteSpace: "pre-line" }}>{auto.descripcion}</p>
            </>
          )}
          <a
            className="btn fill"
            style={{ marginTop: 16 }}
            href={wa("Hola, me interesa el " + titulo + " " + auto.anio + " (Ref " + auto.codigo + ")")}
          >
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
