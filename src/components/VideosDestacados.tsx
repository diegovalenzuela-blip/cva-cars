"use client";

import "./destacados.css";
import { useEffect, useRef, useState } from "react";
import { VIDEOS } from "@/lib/datos";
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
  const [jugando, setJugando] = useState(false);
  const [iniciado, setIniciado] = useState(false);

  function reproducir() {
    const v = video.current;
    if (!v) return;
    v.play().catch(() => {});
  }

  return (
    <div className={"vid" + (jugando ? " jugando" : "")}>
      <video
        ref={video}
        className="vid-video"
        src={src + "#t=0.5"}
        poster={src.replace(".mp4", ".jpg")}
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

export default function VideosDestacados({ fotosFondo }: { fotosFondo: string[] }) {
  const seccion = useRef<HTMLElement>(null);
  const [fotoIndex, setFotoIndex] = useState(0);

  useEffect(() => {
    if (fotosFondo.length < 2) return;

    const intervalo = window.setInterval(() => {
      setFotoIndex((actual) => (actual + 1) % fotosFondo.length);
    }, 5000);

    return () => window.clearInterval(intervalo);
  }, [fotosFondo.length]);

  function alReproducir(actual: HTMLVideoElement) {
    seccion.current?.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (v !== actual) v.pause();
    });
  }

  return (
    <section id="videos" className="vid-sec" ref={seccion}>
      {fotosFondo.length > 0 && (
        <div className="vid-fondo" aria-hidden="true">
          <div
            key={fotoIndex}
            className="vid-fondo-foto"
            style={{
              backgroundImage: `url("${fotosFondo[fotoIndex]}")`,
            }}
          />
        </div>
      )}
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