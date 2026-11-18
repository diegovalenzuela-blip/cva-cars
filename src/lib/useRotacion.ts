"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rota entre fotos de fondo, pero solo mientras la sección se ve en pantalla.
 * Así el teléfono no trabaja de más cuando la sección está fuera de vista,
 * y se respeta "reducir movimiento". Además precarga la foto que viene.
 */
export function useRotacion<T extends HTMLElement>(urls: string[], ms = 6000) {
  const ref = useRef<T>(null);
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(false);
  const total = urls.length;
  const clave = urls.join("|");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "120px",
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
    siguiente.src = urls[(indice + 1) % total];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, visible, total, clave]);

  return { ref, indice };
}
