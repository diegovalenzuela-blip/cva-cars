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

  return (
    <div className="fp" aria-hidden="true">
      {fotos.map((f, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={f.url + k}
          src={f.url}
          alt=""
          className={"fp-img" + (k === actual ? " on" : "")}
        />
      ))}
      <div className="fp-sombra" />
    </div>
  );
}
