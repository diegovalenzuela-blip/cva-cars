"use client";

import { useEffect, useState } from "react";
import type { FotoFondo } from "@/lib/autos";
import { useRotacion } from "@/lib/useRotacion";
import { imgSrc, imgSrcSet } from "@/lib/img";

export default function FondoPortada({
  fotos,
  intervalo = 4500,
}: {
  fotos: FotoFondo[];
  intervalo?: number;
}) {
  const n = fotos.length;
  const { ref, indice: actual } = useRotacion<HTMLDivElement>(
    fotos.map((f) => f.url),
    intervalo
  );

  // Al inicio solo se descarga la foto principal (es la que define cuánto tarda la
  // portada). Las vecinas se piden recién cuando la página terminó de cargar.
  const [listo, setListo] = useState(false);
  useEffect(() => {
    let id = 0;
    const marcar = () => {
      id = window.setTimeout(() => setListo(true), 1200);
    };
    if (document.readyState === "complete") {
      marcar();
    } else {
      window.addEventListener("load", marcar, { once: true });
    }
    return () => {
      window.removeEventListener("load", marcar);
      window.clearTimeout(id);
    };
  }, []);

  if (n === 0) return null;

  const cerca = (k: number) =>
    k === actual || k === (actual + 1) % n || k === (actual - 1 + n) % n;

  return (
    <div className="fp" aria-hidden="true" ref={ref}>
      {fotos.map((f, k) =>
        k === actual || (listo && cerca(k)) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.url + k}
            src={imgSrc(f.url, 640, 45)}
            srcSet={imgSrcSet(f.url, 45)}
            sizes="(max-width: 760px) 40vw, 1080px"
            alt=""
            decoding="async"
            fetchPriority={k === 0 ? "high" : "low"}
            className={"fp-img" + (k === actual ? " on" : "")}
          />
        ) : null
      )}
      <div className="fp-sombra" />
    </div>
  );
}
