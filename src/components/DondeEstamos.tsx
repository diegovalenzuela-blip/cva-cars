"use client";

import "./secciones.css";
import type { CSSProperties, ReactNode } from "react";
import { DIRECCION, HORARIO, INSTAGRAM, FACEBOOK, TIKTOK, wa } from "@/lib/datos";
import { useReveal } from "@/lib/useReveal";
import { fondoCss } from "@/lib/img";

const retraso = (ms: number): CSSProperties => ({ transitionDelay: ms + "ms" });

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function DondeEstamos({ banner = "" }: { banner?: string }) {
  const { ref, visto } = useReveal<HTMLElement>();

  const mapa = "https://www.google.com/maps?q=" + encodeURIComponent(DIRECCION) + "&output=embed";
  const comoLlegar = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(DIRECCION);

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
          <h2 className="rvx" style={retraso(0)}>Dónde estamos</h2>
          <p className="rvx" style={retraso(100)}>
            Visítanos en Chillán o escríbenos, te atendemos con gusto.
          </p>
        </div>
      </div>

      <div className="wrap don-cuerpo">
        <div className="don-grid">
          <div className="don-cards">
            <div className="don-card rvx" style={retraso(140)}>
              <span className="don-icono don-pin">
                <Icono>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </Icono>
              </span>
              <div>
                <h3>Dirección</h3>
                <p>{DIRECCION}</p>
                <a className="btn" href={comoLlegar} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
              </div>
            </div>

            <div className="don-card rvx" style={retraso(220)}>
              <span className="don-icono">
                <Icono>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </Icono>
              </span>
              <div>
                <h3>Horario</h3>
                <p>{HORARIO}</p>
              </div>
            </div>

            <div className="don-card rvx" style={retraso(300)}>
              <span className="don-icono">
                <Icono>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </Icono>
              </span>
              <div>
                <h3>WhatsApp</h3>
                <p>Respondemos tus consultas por mensaje.</p>
                <a className="btn fill" href={wa("Hola, quiero hacer una consulta.")}>Escribir ahora</a>
              </div>
            </div>

            <div className="don-card rvx" style={retraso(380)}>
              <span className="don-icono">
                <Icono>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </Icono>
              </span>
              <div>
                <h3>Redes sociales</h3>
                <div className="don-redes">
                  <a className="btn" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
                  <a className="btn" href={FACEBOOK} target="_blank" rel="noopener noreferrer">Facebook</a>
                  <a className="btn" href={TIKTOK} target="_blank" rel="noopener noreferrer">TikTok</a>
                </div>
              </div>
            </div>
          </div>

          <div className="don-mapa rvx" style={retraso(200)}>
            <iframe
              src={mapa}
              title="Mapa de Chillán Vende Autos"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}