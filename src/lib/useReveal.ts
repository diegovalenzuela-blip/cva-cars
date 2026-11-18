"use client";

import { useEffect, useRef, useState } from "react";

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sinMovimiento || typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setVisto(true));
      return () => cancelAnimationFrame(id);
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisto(true);
          io.disconnect();
        }
      },
      // Aparece apenas asoma (y un poco antes): con un % del elemento, las secciones
      // altas quedaban en blanco media pantalla al bajar rápido.
      { threshold: 0, rootMargin: "0px 0px 10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visto };
}
