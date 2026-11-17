"use client";

import { useEffect, useState } from "react";
import type { FotoFondo } from "@/lib/useAutosFondo";

export default function FondoPortada({
  fotos,
  intervalo = 4500,
}: {
  fotos: FotoFondo[];
  intervalo?: number;
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

  if (n === 0) return null;

  const cerca = (k: number) =>
    k === actual || k === (actual + 1) % n || k === (actual - 1 + n) % n;

  return (
    <div className="fp" aria-hidden="true">
      {fotos.map((f, k) =>
        cerca(k) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.url + k}
            src={f.url}
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
