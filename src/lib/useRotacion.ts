"use client";

import { useEffect, useRef, useState } from "react";
import { imgSrc } from "@/lib/img";

/**
 * Rota entre fotos de fondo, pero solo mientras la sección se ve en pantalla.
 * Así el teléfono no trabaja de más cuando la sección está fuera de vista,
 * y se respeta "reducir movimiento". Además precarga la foto que viene.
 */
export function useRotacion<T extends HTMLElement>(urls: string[], ms = 6000) {
  const ref = useRef<T>(null);
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(false);
  const [visto, setVisto] = useState(false);
  const total = urls.length;
  const clave = urls.join("|");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting);
      if (e.isIntersecting) setVisto(true);
    }, {
      rootMargin: "200px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [clave]);

  useEffect(() => {
    if (total < 2 || !visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setI((x) => (x + 1) % total);
    }, ms);
    return () => window.clearInterval(id);
  }, [total, ms, visible]);

  const indice = total ? i % total : 0;

  useEffect(() => {
    if (total < 2 || !visible) return;
    const siguiente = new window.Image();
    siguiente.decoding = "async";
    siguiente.src = imgSrc(urls[(indice + 1) % total], 828, 45);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, visible, total, clave]);

  return { ref, indice, visto, ir: (k: number) => setI(k) };
}
