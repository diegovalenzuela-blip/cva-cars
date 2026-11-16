"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SLUG } from "@/lib/datos";
import "@/components/secciones.css";

export default function Nosotros() {
  const [fotosFondo, setFotosFondo] = useState<string[]>([]);
  const [fotoIndex, setFotoIndex] = useState(0);

  useEffect(() => {
    let activo = true;

    supabase
      .from("autos")
      .select("fotos,automotoras!inner(slug)")
      .eq("automotoras.slug", SLUG)
      .eq("en_exhibicion", true)
      .in("estado", ["disponible", "reservado"])
      .order("creado_en", { ascending: false })
      .then(({ data }) => {
        if (!activo) return;

        const filas = (data as unknown as { fotos: string[] | null }[] | null) ?? [];
        const fotos = filas.flatMap((auto) =>
          auto.fotos && auto.fotos.length > 0 ? [auto.fotos[0]] : []
        );

        setFotosFondo(fotos);
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (fotosFondo.length < 2) return;

    const intervalo = window.setInterval(() => {
      setFotoIndex((actual) => (actual + 1) % fotosFondo.length);
    }, 5000);

    return () => window.clearInterval(intervalo);
  }, [fotosFondo.length]);

  return (
    <main className="nosotros-seccion">
      {fotosFondo.length > 0 && (
        <div className="fondo-exhibicion" aria-hidden="true">
          <div
            key={fotoIndex}
            className="fondo-exhibicion-foto"
            style={{
              backgroundImage: `url("${fotosFondo[fotoIndex % fotosFondo.length]}")`,
            }}
          />
        </div>
      )}

      <div className="det">
        <h1>Quiénes somos</h1>
        <div style={{ maxWidth: 680, marginTop: 16 }}>
          <p style={{ fontSize: "1.1rem" }}>
            Somos Chillán Vende Autos, una automotora de la región de Ñuble dedicada a la venta y consignación de autos y camionetas.
          </p>
          <p style={{ fontSize: "1.1rem" }}>
            Cada vehículo se publica con su ficha, fotos reales y un código único, para que sepas exactamente qué estás viendo.
          </p>
          <p style={{ fontSize: "1.1rem" }}>
            Si buscas tu próximo auto o quieres vender el tuyo, escríbenos y lo vemos en persona.
          </p>
        </div>
        <div className="acc" style={{ marginTop: 20 }}>
          <Link className="btn fill" href="/catalogo">Ver catálogo</Link>
          <Link className="btn" href="/consignacion">Dejar mi auto en consignación</Link>
        </div>
      </div>
    </main>
  );
}