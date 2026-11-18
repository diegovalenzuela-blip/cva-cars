"use client";

import "./paginas.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { TEL, DIRECCION, HORARIO, INSTAGRAM, FACEBOOK, TIKTOK, wa } from "@/lib/datos";
import type { FotoFondo } from "@/lib/autos";
import Aparece from "./Aparece";
import FondoAutos from "./FondoAutos";

function formatoTel(t: string) {
  return /^56\d{9}$/.test(t) ? "+56 " + t[2] + " " + t.slice(3, 7) + " " + t.slice(7) : "+" + t;
}

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONO_WSP = (
  <Icono>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </Icono>
);
const ICONO_TEL = (
  <Icono>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icono>
);
const ICONO_PIN = (
  <Icono>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Icono>
);
const ICONO_RELOJ = (
  <Icono>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icono>
);
const ICONO_REDES = (
  <Icono>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Icono>
);

export default function ContactoPagina({ fotos }: { fotos: FotoFondo[] }) {
  const portada = fotos.slice(0, 1);

  const mapa = "https://www.google.com/maps?q=" + encodeURIComponent(DIRECCION) + "&output=embed";

  return (
    <main className="cto">
      <section className="cto-hero">
        <FondoAutos fotos={portada} pie={false} />
        <div className="wrap">
          <h1>
            <span className="pal2">Contáctanos</span>
          </h1>
          <span className="csg-linea" aria-hidden="true" />
          <p>Escríbenos o llámanos y coordinamos tu atención en Chillán.</p>
        </div>
      </section>

      <div className="wrap">
        <div className="cto-acciones">
          <Aparece>
            <a className="cto-accion" href={wa("Hola, quiero hacer una consulta.")}>
              <span className="cto-ic wsp">{ICONO_WSP}</span>
              <span>
                <small>Escríbenos</small>
                <strong>WhatsApp</strong>
              </span>
            </a>
          </Aparece>
          <Aparece retraso={110}>
            <a className="cto-accion" href={"tel:+" + TEL}>
              <span className="cto-ic">{ICONO_TEL}</span>
              <span>
                <small>Llámanos</small>
                <strong>{formatoTel(TEL)}</strong>
              </span>
            </a>
          </Aparece>
          <Aparece retraso={220}>
            <a className="cto-accion" href={wa("Hola, quiero coordinar una visita.")}>
              <span className="cto-ic">{ICONO_PIN}</span>
              <span>
                <small>En Chillán</small>
                <strong>Coordinar visita</strong>
              </span>
            </a>
          </Aparece>
        </div>

        <div className="cto-grid">
          <div className="cto-cards">
            <Aparece>
              <div className="cto-card">
                <span className="cto-ic">{ICONO_PIN}</span>
                <div>
                  <h3>Ubicación</h3>
                  <p>{DIRECCION}</p>
                  <a className="btn" href={wa("Hola, quiero coordinar una visita.")}>Coordinar visita</a>
                </div>
              </div>
            </Aparece>
            <Aparece retraso={100}>
              <div className="cto-card">
                <span className="cto-ic">{ICONO_RELOJ}</span>
                <div>
                  <h3>Atención</h3>
                  <p>{HORARIO}</p>
                </div>
              </div>
            </Aparece>
            <Aparece retraso={200}>
              <div className="cto-card">
                <span className="cto-ic">{ICONO_REDES}</span>
                <div>
                  <h3>Redes sociales</h3>
                  <div className="cto-redes">
                    <a className="btn" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
                    <a className="btn" href={FACEBOOK} target="_blank" rel="noopener noreferrer">Facebook</a>
                    <a className="btn" href={TIKTOK} target="_blank" rel="noopener noreferrer">TikTok</a>
                  </div>
                </div>
              </div>
            </Aparece>
          </div>

          <Aparece retraso={150}>
            <div className="cto-mapa">
              <iframe
                src={mapa}
                title="Mapa de Chillán Vende Autos"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Aparece>
        </div>

        <Aparece>
          <div className="csg-band">
            <h2>¿Quieres vender tu auto?</h2>
            <p>Déjalo en consignación y nos encargamos de publicarlo y atender a los interesados.</p>
            <div className="acc" style={{ justifyContent: "center" }}>
              <Link className="btn fill" href="/consignacion">Conocer la consignación</Link>
              <Link className="btn" href="/catalogo">Ver catálogo</Link>
            </div>
          </div>
        </Aparece>
      </div>
    </main>
  );
}