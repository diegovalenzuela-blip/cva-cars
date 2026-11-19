"use client";

import "./secciones.css";
import "./consignacion.css";
import Link from "next/link";
import type { CSSProperties } from "react";
import { imgSrc, imgSrcSet } from "@/lib/img";
import { useReveal } from "@/lib/useReveal";
import FormularioEvaluacion from "./FormularioEvaluacion";

const PASOS = [
  { n: "1", t: "Cuéntanos de tu auto", d: "Marca, modelo, año y kilometraje." },
  { n: "2", t: "Te escribimos por WhatsApp", d: "Conversamos y coordinamos una visita." },
  { n: "3", t: "Lo publicamos y atendemos", d: "Nos encargamos de las consultas." },
];

const retraso = (ms: number): CSSProperties => ({ transitionDelay: ms + "ms" });

export default function VendeTuAuto({ fotosFondo }: { fotosFondo: string[] }) {
  const foto = fotosFondo[1] ?? fotosFondo[0] ?? "";
  const { ref, visto } = useReveal<HTMLElement>();
  return (
    <section id="vende" className={"vta" + (visto ? " in" : "")} ref={ref}>
      <div className="wrap">
        <h2 className="rvx" style={retraso(0)}>Vende tu auto con nosotros</h2>
        <p className="sub rvx" style={retraso(80)}>
          Cuéntanos qué auto tienes y te contactamos por WhatsApp con una propuesta.
        </p>

        <div className="vta-grid">
          <div className="vta-visual rvx" style={retraso(140)}>
            {foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc(foto, 640, 60)}
                srcSet={imgSrcSet(foto, 60)}
                sizes="(max-width: 860px) 100vw, 520px"
                alt=""
                loading="lazy"
                decoding="async"
              />
            )}
            <span className="vta-badge">Consignación</span>
            <ol className="vta-pasos">
              {PASOS.map((p) => (
                <li key={p.n}>
                  <b>{p.n}</b>
                  <div>
                    <strong>{p.t}</strong>
                    <span>{p.d}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* La solicitud llega al CRM (Solicitudes de evaluación), igual que la de /consignacion. */}
          <div className="vta-form rvx" style={retraso(240)}>
            <h3>Pide la evaluación de tu auto</h3>
            <FormularioEvaluacion compacto />
            <Link className="vta-link" href="/consignacion">Conoce cómo funciona la consignación →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}