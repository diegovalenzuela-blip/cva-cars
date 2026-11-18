"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FotoFondo } from "@/lib/useAutosFondo";
import { fondo } from "@/lib/foto";

export default function FondoAutos({
  fotos,
  intervalo = 4000,
  pie = true,
}: {
  fotos: FotoFondo[];
  intervalo?: number;
  pie?: boolean;
}) {
  const [i, setI] = useState(0);
  const n = fotos.length;
  const actual = n ? i % n : 0;

  useEffect(() => {
    if (n < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setI((x) => (x + 1) % n);
    }, intervalo);
    return () => window.clearInterval(id);
  }, [n, intervalo]);

  return (
    <div className="fa">
      {fotos.map((f, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={f.url + k}
          src={fondo(f.url)}
          alt=""
          decoding="async"
          className={"fa-img" + (k === actual ? " on" : "")}
        />
      ))}
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
                  onClick={() => setI(k)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}