
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Portada from "@/components/Portada";
import VideosDestacados from "@/components/VideosDestacados";
import Vitrina from "@/components/Vitrina";
import VendeTuAuto from "@/components/VendeTuAuto";
import DondeEstamos from "@/components/DondeEstamos";
import { SLUG, DIRECCION, HORARIO, INSTAGRAM, FACEBOOK, TIKTOK, VIDEOS, wa } from "@/lib/datos";

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
};

export default function Home() {
  const [autos, setAutos] = useState<Auto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fondoIndex, setFondoIndex] = useState(0);

  useEffect(() => {
    supabase
      .from("autos")
      .select("id,codigo,marca,modelo,anio,km,precio,estado,fotos,ubicacion,destacado,automotoras!inner(slug)")
      .eq("automotoras.slug", SLUG)
      .eq("en_exhibicion", true)
      .in("estado", ["disponible", "reservado"])
      .order("creado_en", { ascending: false })
      .then(({ data }) => {
        setAutos((data as unknown as Auto[]) ?? []);
        setCargando(false);
      });
  }, []);
    const fotosFondo = autos
    .filter((auto) => auto.fotos && auto.fotos.length > 0)
    .map((auto) => auto.fotos[0]);

  useEffect(() => {
    if (fotosFondo.length < 2) return;

    const intervalo = window.setInterval(() => {
      setFondoIndex((actual) => (actual + 1) % fotosFondo.length);
    }, 5000);

    return () => window.clearInterval(intervalo);
  }, [fotosFondo.length]);
    const fotoFondo = fotosFondo.length > 0
  ? fotosFondo[fondoIndex % fotosFondo.length]
  : "";

  function enviarVenta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const km = f.get("k") ? ", con " + f.get("k") + " km" : "";
    window.open(
      wa("Hola, soy " + f.get("n") + ". Quiero vender mi " + f.get("a") + km + "."),
      "_blank"
    );
  }

  return (
    <>
      <Portada />

      <VideosDestacados fotosFondo={fotosFondo} />

      <Vitrina autos={autos} cargando={cargando} />

      <VendeTuAuto fotosFondo={fotosFondo} />

      <DondeEstamos />

      <footer>
        <div className="wrap">
          <span>© Chillán Vende Autos</span>
          <span>Hecho con CVA Cars</span>
        </div>
      </footer>
    </>
  );
}
