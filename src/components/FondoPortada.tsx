"use client";

import type { FotoFondo } from "@/lib/useAutosFondo";
import { useRotacion } from "@/lib/useRotacion";
import { fondo } from "@/lib/foto";

export default function FondoPortada({
  fotos,
  intervalo = 4500,
}: {
  fotos: FotoFondo[];
  intervalo?: number;
}) {
  const n = fotos.length;
  const urls = fotos.map((f) => fondo(f.url));
  const { ref, indice: actual } = useRotacion<HTMLDivElement>(urls, intervalo);

  if (n === 0) return null;

  const cerca = (k: number) =>
    k === actual || k === (actual + 1) % n || k === (actual - 1 + n) % n;

  return (
    <div className="fp" aria-hidden="true" ref={ref}>
      {fotos.map((f, k) =>
        cerca(k) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.url + k}
            src={urls[k]}
            alt=""
            decoding="async"
            fetchPriority={k === 0 ? "high" : "auto"}
            className={"fp-img" + (k === actual ? " on" : "")}
          />
        ) : null
      )}
      <div className="fp-sombra" />
    </div>
  );
}
