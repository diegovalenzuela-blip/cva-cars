"use client";

import "./destacados.css";
import { useRef, useState } from "react";
import { VIDEOS } from "@/lib/datos";
import { useReveal } from "@/lib/useReveal";
import Aparece from "./Aparece";

function Tarjeta({
  src,
  indice,
  alReproducir,
}: {
  src: string;
  indice: number;
  alReproducir: (v: HTMLVideoElement) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const { ref: refTarjeta, visto: tarjetaVista } = useReveal<HTMLDivElement>();
  const [jugando, setJugando] = useState(false);
  const [iniciado, setIniciado] = useState(false);

  function reproducir() {
    const v = video.current;
    if (!v) return;
    v.play().catch(() => {});
  }

  return (
    <div className={"vid" + (jugando ? " jugando" : "")} ref={refTarjeta}>
      <video
        ref={video}
        className="vid-video"
        src={src + "#t=0.5"}
        poster={tarjetaVista ? src.replace(".mp4", ".jpg") : undefined}
        playsInline
        preload="none"
        controls={iniciado}
        onPlay={() => {
          setJugando(true);
          setIniciado(true);
          if (video.current) alReproducir(video.current);
        }}
        onPause={() => setJugando(false)}
        onEnded={() => setJugando(false)}
      />
      <span className="vid-tag">Video {indice + 1}</span>
      {!jugando && (
        <button
          type="button"
          className="vid-play"
          onClick={reproducir}
          aria-label={"Reproducir video " + (indice + 1)}
        >
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function VideosDestacados() {
  const seccion = useRef<HTMLElement>(null);

  function alReproducir(actual: HTMLVideoElement) {
    seccion.current?.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (v !== actual) v.pause();
    });
  }

  return (
    <section id="videos" className="vid-sec" ref={seccion}>
      <div className="wrap">
        <Aparece>
          <h2 className="vid-titulo">Míralos en video</h2>
          <p className="sub">Toca un video para verlo con sonido.</p>
        </Aparece>

        <div className="vid-fila">
          {VIDEOS.map((src, i) => (
            <Aparece
              key={src}
              retraso={i * 140}
              className={"vid-item" + (VIDEOS.length === 3 && i === 1 ? " centro" : "")}
            >
              <Tarjeta src={src} indice={i} alReproducir={alReproducir} />
            </Aparece>
          ))}
        </div>
      </div>
    </section>
  );
}