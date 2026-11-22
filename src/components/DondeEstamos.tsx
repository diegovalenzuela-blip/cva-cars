"use client";

import "./secciones.css";
import type { CSSProperties, ReactNode } from "react";
import { DIRECCION, HORARIO, INSTAGRAM, FACEBOOK, TIKTOK, TEL, wa } from "@/lib/datos";
import { useReveal } from "@/lib/useReveal";
import { fondoCss } from "@/lib/img";

const retraso = (ms: number): CSSProperties => ({ transitionDelay: ms + "ms" });

// "56922328543" → "+56 9 2232 8543"
const telefono = TEL.replace(/^56(\d)(\d{4})(\d{4})$/, "+56 $1 $2 $3");

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

// Sin dirección física: la sección invita a escribir y coordinar dónde ver el auto,
// en vez de mostrar un mapa de toda la ciudad que no ayuda a llegar a ningún lado.
export default function DondeEstamos({ banner = "" }: { banner?: string }) {
  const { ref, visto } = useReveal<HTMLElement>();

  return (
    <section id="contacto" className={"don" + (visto ? " in" : "")} ref={ref}>
      <div
        className="don-banner"
        style={
          banner && visto
            ? {
                backgroundImage:
                  "linear-gradient(180deg, rgba(0,0,0,.4), rgba(0,0,0,.92)), " + fondoCss(banner, 828, 45),
              }
            : undefined
        }
      >
        <div className="wrap">
          <h2 className="rvx" style={retraso(0)}>Contacto</h2>
          <p className="rvx" style={retraso(100)}>
            Atendemos en {DIRECCION}. Escríbenos y coordinamos dónde mostrarte el auto.
          </p>
        </div>
      </div>

      <div className="wrap don-cuerpo">
        <div className="don-panel rvx" style={retraso(160)}>
          <div className="don-wsp">
            <span className="don-icono">
              <Icono>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </Icono>
            </span>
            <div>
              <h3>Escríbenos por WhatsApp</h3>
              <p>Consultas, visitas y evaluación de tu auto. Te respondemos por mensaje.</p>
              <a className="btn fill don-btn" href={wa("Hola, vi la página de Chillán Vende Autos y quiero hacer una consulta.")}>
                {telefono}
              </a>
            </div>
          </div>

          <ul className="don-datos">
            <li>
              <Icono>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </Icono>
              <div>
                <strong>Zona</strong>
                <span>{DIRECCION}</span>
              </div>
            </li>
            <li>
              <Icono>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </Icono>
              <div>
                <strong>Atención</strong>
                <span>{HORARIO}</span>
              </div>
            </li>
            <li>
              <Icono>
                {/* Auto visto de frente */}
                <path d="M5 11l1.6-4.4A2 2 0 0 1 8.5 5h7a2 2 0 0 1 1.9 1.6L19 11" />
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M6 17v2M18 17v2" />
                <circle cx="7.5" cy="14" r="1" />
                <circle cx="16.5" cy="14" r="1" />
              </Icono>
              <div>
                <strong>Visitas</strong>
                <span>Te mostramos el auto en el lugar que acordemos.</span>
              </div>
            </li>
          </ul>

          <div className="don-redes">
            <span>Síguenos</span>
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href={FACEBOOK} target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href={TIKTOK} target="_blank" rel="noopener noreferrer">TikTok</a>
          </div>
        </div>
      </div>
    </section>
  );
}
