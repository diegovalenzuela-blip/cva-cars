"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
};

export default function Home() {
  const [autos, setAutos] = useState<Auto[]>([]);
  const [cargando, setCargando] = useState(true);

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
      <div className="wrap">
        <header className="hero">
          <div>
            <h1>Tu próximo auto está en Chillán</h1>
            <p>
              Camionetas y autos revisados, con ficha clara y trato directo.
              Escríbenos y lo vemos en persona.
            </p>
            <div className="acc">
              <a className="btn fill" href="#autos">Ver autos disponibles</a>
              <a className="btn" href={wa("Hola, vi la página de Chillán Vende Autos y quiero consultar.")}>
                Hablar por WhatsApp
              </a>
            </div>
          </div>
          <Image
            className="hero-img"
            src="/logo.jpg"
            alt="Logo de Chillán Vende Autos: camioneta roja clásica frente a las montañas"
            width={520}
            height={520}
            priority
          />
        </header>
      </div>

      <section id="videos">
        <div className="wrap">
          <h2>Míralos en video</h2>
          <p className="sub">Toca un video para verlo con sonido.</p>
          <div className="reels">
            {VIDEOS.map((src) => (
              <video
                key={src}
                className="reel"
                src={src + "#t=0.5"} poster={src + ".png"}
                controls
                playsInline
                preload="metadata"
              />
            ))}
          </div>
        </div>
      </section>

      <section id="autos">
        <div className="wrap">
          <h2>Autos disponibles</h2>
          <p className="sub">Toca un auto para ver todas sus fotos y su descripción.</p>
          <div className="grid">
            {autos.slice(0, 8).map((x) => (
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
          {!cargando && autos.length === 0 && (         
            <div style={{ marginTop: 24 }}>
              <Link className="btn fill" href="/catalogo">
                Ver catálogo completo ({autos.length} autos)
              </Link>
            </div>
          )} 
            <p className="sub">Pronto publicaremos nuevos autos.</p>
        </div>
      </section>

      <section id="vende">
        <div className="wrap dos">
          <div>
            <h2>Vende tu auto con nosotros</h2>
            <p className="sub">Cuéntanos qué auto tienes y te respondemos por WhatsApp con una propuesta.</p>
          </div>
          <form onSubmit={enviarVenta}>
            <label>Tu nombre<input name="n" required autoComplete="name" /></label>
            <label>Marca, modelo y año<input name="a" required placeholder="Ejemplo: Chevrolet C10 1985" /></label>
            <label>Kilometraje aproximado<input name="k" inputMode="numeric" /></label>
            <button className="btn fill" type="submit">Enviar por WhatsApp</button>
          </form>
        </div>
      </section>

      <section id="contacto">
        <div className="wrap">
          <h2>Dónde estamos</h2>
          <p className="sub">
            Dirección: {DIRECCION}<br />
            Horario: {HORARIO}
          </p>
          <div className="acc">
            <a className="btn" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a className="btn" href={FACEBOOK} target="_blank" rel="noopener noreferrer">Facebook</a>
            <a className="btn" href={TIKTOK} target="_blank" rel="noopener noreferrer">TikTok</a>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>© Chillán Vende Autos</span>
          <span>Hecho con CVA Cars</span>
        </div>
      </footer>
    </>
  );
}