"use client";

import { useState } from "react";
import { imgSrc, imgSrcSet } from "@/lib/img";

export default function Galeria({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [i, setI] = useState(0);
  const n = fotos.length;
  const actual = n ? fotos[Math.min(i, n - 1)] : null;

  return (
    <div>
      <div className="gal-main">
        {actual ? (
          <>
          {/* Fondo difuminado de la misma foto: las fotos verticales llenan el cuadro sin franjas negras. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="gal-fondo" src={imgSrc(actual, 384, 45)} alt="" aria-hidden="true" decoding="async" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="gal-foto"
            src={imgSrc(actual, 828, 75)}
            srcSet={imgSrcSet(actual, 75)}
            sizes="(max-width: 860px) 100vw, 680px"
            alt={titulo}
            decoding="async"
            fetchPriority="high"
          />
          </>
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
            <button key={u + k} className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={"Ver foto " + (k + 1)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc(u, 384, 45)} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
