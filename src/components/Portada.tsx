"use client";

import "./destacados.css";
import "./portada.css";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { wa } from "@/lib/datos";
import { useAutosFondo } from "@/lib/useAutosFondo";
import FondoPortada from "./FondoPortada";

// Tiempo entre fotos de fondo, en milisegundos (4500 = 4,5 segundos)
const INTERVALO = 4500;

const PALABRAS = ["Tu", "próximo", "auto", "está", "en", "Chillán"];

export default function Portada() {
  const ref = useRef<HTMLDivElement>(null);
  const fotos = useAutosFondo(4);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", x.toFixed(3));
        el.style.setProperty("--my", y.toFixed(3));
      });
    };
    const salir = () => {
      el.style.setProperty("--mx", "0");
      el.style.setProperty("--my", "0");
    };

    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", salir);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", salir);
    };
  }, []);

  return (
    <div className="por-sec" ref={ref}>
      <FondoPortada fotos={fotos} intervalo={INTERVALO} />
      <div className="wrap">
        <header className="hero por">
          <div className="por-texto">
            <h1 className="por-titulo">
              {PALABRAS.map((p, i) => (
                <span
                  key={p + i}
                  className={"pal" + (p === "Chillán" ? " rojo" : "")}
                  style={{ animationDelay: 0.15 + i * 0.1 + "s" }}
                >
                  {p}
                </span>
              ))}
            </h1>
            <span className="por-linea" aria-hidden="true" />
            <p>
              Camionetas y autos revisados, con ficha clara y trato directo.
              Escríbenos y lo vemos en persona.
            </p>
            <div className="acc">
              <a className="btn fill" href="#autos">Autos en exhibición</a>
              <a className="btn" href={wa("Hola, vi la página de Chillán Vende Autos y quiero consultar.")}>
                Hablar por WhatsApp
              </a>
              <a className="btn" href="/catalogo">Catálogo</a>
            </div>
          </div>

          <div className="por-logo">
            <div className="por-halo" aria-hidden="true" />
            <div className="por-logo-mov">
              <Image
                className="por-img"
                src="/logo.jpg"
                alt="Logo de Chillán Vende Autos: camioneta roja clásica frente a las montañas"
                width={520}
                height={520}
                priority
              />
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}