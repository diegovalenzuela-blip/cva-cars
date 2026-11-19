"use client";

import "./destacados.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TIKTOK, wa } from "@/lib/datos";
import Aparece from "./Aparece";

export type AutoDeVideo = { codigo: string; nombre: string; precio: number; reservado: boolean };
export type VideoConAuto = { src: string; avance: string; poster: string; auto: AutoDeVideo | null };

const plata = (n: number) => "$" + n.toLocaleString("es-CL");

// Sin avances automáticos si la persona pidió menos movimiento o ahorro de datos.
function sinAvances() {
  const ahorro = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  return ahorro || matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Tarjeta({
  video,
  indice,
  alReproducir,
}: {
  video: VideoConAuto;
  indice: number;
  alReproducir: (v: HTMLVideoElement) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const completo = useRef(false);
  const [modo, setModo] = useState<"avance" | "completo">("avance");
  const [jugando, setJugando] = useState(false);
  const [cerca, setCerca] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (v) {
      v.muted = true;
      v.loop = true;
    }
    const el = caja.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setCerca(true);
        setVisible(e.intersectionRatio >= 0.6);
      },
      { threshold: [0, 0.6] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // El avance (5 s, sin sonido, ~360 KB) corre solo mientras la tarjeta está a la vista.
  useEffect(() => {
    const v = ref.current;
    if (!v || completo.current) return;
    if (visible && !sinAvances()) {
      if (!v.dataset.cargado) {
        v.dataset.cargado = "1";
        v.src = video.avance;
      }
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [visible, video.avance]);

  // El video completo, con sonido, se carga recién al tocarlo.
  function reproducir() {
    const v = ref.current;
    if (!v) return;
    if (!completo.current) {
      completo.current = true;
      setModo("completo");
      v.loop = false;
      v.src = video.src;
      v.dataset.cargado = "1";
    }
    v.muted = false;
    v.play().catch(() => {});
  }

  const enCompleto = modo === "completo";
  const auto = video.auto;
  const texto = auto
    ? `Hola, vi el video de la ${auto.nombre} en la página. ¿Sigue disponible?`
    : "Hola, vi sus videos en la página y quiero más información.";

  return (
    <>
      <div className={"vid" + (enCompleto && jugando ? " jugando" : "")} ref={caja}>
        <video
          ref={ref}
          className="vid-video"
          poster={cerca ? video.poster : undefined}
          playsInline
          preload="none"
          controls={enCompleto}
          aria-label={auto ? "Video de " + auto.nombre : "Video " + (indice + 1)}
          onPlay={() => {
            setJugando(true);
            if (completo.current && ref.current) alReproducir(ref.current);
          }}
          onPause={() => setJugando(false)}
          onEnded={() => setJugando(false)}
        />
        <span className="vid-tag">Video {indice + 1}</span>
        {!enCompleto && jugando && <span className="vid-avance">Avance sin sonido</span>}
        {!(enCompleto && jugando) && (
          <button
            type="button"
            className="vid-play"
            onClick={reproducir}
            aria-label={(enCompleto ? "Seguir viendo el video " : "Ver con sonido el video ") + (indice + 1)}
          >
            <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="vid-play-txt" aria-hidden="true">{enCompleto ? "Seguir viendo" : "Ver con sonido"}</span>
          </button>
        )}
        <span className="vid-brillo" aria-hidden="true" />
      </div>

      <div className="vid-info">
        {auto ? (
          <>
            <h3>
              <Link href={"/autos/" + auto.codigo}>{auto.nombre}</Link>
            </h3>
            <p className="vid-precio">
              {plata(auto.precio)}
              {auto.reservado && <span className="vid-reservado">Reservado</span>}
            </p>
          </>
        ) : (
          <>
            <h3>Más autos en el catálogo</h3>
            <p className="vid-nota">Revisa fotos, precios y detalles.</p>
          </>
        )}
        <div className="vid-acc">
          <Link className="fill" href={auto ? "/autos/" + auto.codigo : "/catalogo"}>
            {auto ? "Ver ficha" : "Ver catálogo"}
          </Link>
          <a href={wa(texto)} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}

export default function VideosDestacados({ videos }: { videos: VideoConAuto[] }) {
  const seccion = useRef<HTMLElement>(null);
  const fila = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const [cabe, setCabe] = useState(true);

  const medir = useCallback(() => {
    const f = fila.current;
    if (!f) return;
    setCabe(f.scrollWidth <= f.clientWidth + 2);
    const items = Array.from(f.children) as HTMLElement[];
    if (!items.length) return;
    const distancia = (it: HTMLElement) => Math.abs(it.offsetLeft - f.scrollLeft);
    let mejor = 0;
    items.forEach((it, i) => {
      if (distancia(it) < distancia(items[mejor])) mejor = i;
    });
    // Al llegar al final, el último cuenta como actual aunque no quede alineado a la izquierda.
    if (f.scrollLeft > 0 && f.scrollLeft + f.clientWidth >= f.scrollWidth - 4) mejor = items.length - 1;
    setPos(mejor);
  }, []);

  useEffect(() => {
    const f = fila.current;
    if (!f) return;
    let cuadro = 0;
    const alMover = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(medir);
    };
    alMover();
    f.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => {
      cancelAnimationFrame(cuadro);
      f.removeEventListener("scroll", alMover);
      window.removeEventListener("resize", alMover);
    };
  }, [medir]);

  function mover(paso: number) {
    const f = fila.current;
    const items = f ? (Array.from(f.children) as HTMLElement[]) : [];
    const destino = items[Math.min(items.length - 1, Math.max(0, pos + paso))];
    if (f && destino) f.scrollTo({ left: destino.offsetLeft, behavior: "smooth" });
  }

  function alReproducir(actual: HTMLVideoElement) {
    seccion.current?.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (v !== actual) v.pause();
    });
  }

  return (
    <section id="videos" className="vid-sec" ref={seccion}>
      <div className="wrap">
        <Aparece>
          <div className="vid-cab">
            <div>
              <h2 className="vid-titulo">Míralos en video</h2>
              <p className="sub">Mira el avance y tócalo para verlo completo con sonido.</p>
            </div>
            <a className="vid-tiktok" href={TIKTOK} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.77a5.74 5.74 0 0 0-.77-.05A5.68 5.68 0 1 0 15.54 15.4V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48z" />
              </svg>
              Síguenos en TikTok
            </a>
          </div>
        </Aparece>

        <div className={"vid-fila" + (cabe ? " cabe" : "")} ref={fila}>
          {videos.map((v, i) => (
            // "Aparece" va dentro del elemento del carrusel para no mezclar su animación con el tamaño de la tarjeta.
            <div key={v.src} className="vid-item">
              <Aparece retraso={i * 120} className="vid-item-in">
                <Tarjeta video={v} indice={i} alReproducir={alReproducir} />
              </Aparece>
            </div>
          ))}
        </div>

        {!cabe && (
          <div className="vid-nav">
            <button type="button" onClick={() => mover(-1)} disabled={pos === 0} aria-label="Video anterior">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M15.4 6.6 14 5.2 7.2 12l6.8 6.8 1.4-1.4L10 12z" /></svg>
            </button>
            <span aria-live="polite">
              {pos + 1} / {videos.length}
            </span>
            <button type="button" onClick={() => mover(1)} disabled={pos >= videos.length - 1} aria-label="Video siguiente">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="m8.6 17.4 1.4 1.4 6.8-6.8L10 5.2 8.6 6.6 14 12z" /></svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
