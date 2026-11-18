"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FotoFondo } from "@/lib/autos";
import { useRotacion } from "@/lib/useRotacion";
import { imgSrc, imgSrcSet } from "@/lib/img";

export default function FondoAutos({
  fotos,
  intervalo = 4000,
  pie = true,
}: {
  fotos: FotoFondo[];
  intervalo?: number;
  pie?: boolean;
}) {
  const n = fotos.length;
  const { ref, indice: actual, visto, ir } = useRotacion<HTMLDivElement>(
    fotos.map((f) => f.url),
    intervalo
  );

  // Solo la foto visible se descarga al inicio; las demás, cuando la página ya cargó.
  const [listo, setListo] = useState(false);
  useEffect(() => {
    let id = 0;
    const marcar = () => {
      id = window.setTimeout(() => setListo(true), 1200);
    };
    if (document.readyState === "complete") marcar();
    else window.addEventListener("load", marcar, { once: true });
    return () => {
      window.removeEventListener("load", marcar);
      window.clearTimeout(id);
    };
  }, []);

  return (
    <div className="fa" ref={ref}>
      {fotos.map((f, k) =>
        k === actual || (listo && visto) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.url + k}
            src={imgSrc(f.url, 640, 45)}
            srcSet={imgSrcSet(f.url, 45)}
            sizes="(max-width: 760px) 100vw, 1080px"
            alt=""
            decoding="async"
            fetchPriority={k === 0 ? "high" : "low"}
            className={"fa-img" + (k === actual ? " on" : "")}
          />
        ) : null
      )}
      <div className="fa-sombra" />

      {pie && n > 0 && (
        <div className="fa-pie">
          <Link href={"/autos/" + fotos[actual].codigo} className="fa-titulo">
            {fotos[actual].titulo}
          </Link>
          {n > 1 && (
            <div className="fa-puntos" role="group" aria-label="Elegir foto">
              {fotos.map((f, k) => (
                <button
                  key={f.url + k}
                  type="button"
                  className={"fa-punto" + (k === actual ? " on" : "")}
                  aria-label={"Ver " + f.titulo}
                  aria-pressed={k === actual}
                  onClick={() => ir(k)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
