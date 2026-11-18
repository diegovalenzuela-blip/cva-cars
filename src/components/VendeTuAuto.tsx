"use client";

import "./secciones.css";
import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";
import { wa } from "@/lib/datos";
import { useRotacion } from "@/lib/useRotacion";
import { useReveal } from "@/lib/useReveal";

const PASOS = [
  { n: "1", t: "Cuéntanos de tu auto", d: "Marca, modelo, año y kilometraje." },
  { n: "2", t: "Te escribimos por WhatsApp", d: "Conversamos y coordinamos una visita." },
  { n: "3", t: "Lo publicamos y atendemos", d: "Nos encargamos de las consultas." },
];

const retraso = (ms: number): CSSProperties => ({ transitionDelay: ms + "ms" });

export default function VendeTuAuto({ fotosFondo }: { fotosFondo: string[] }) {
  const { ref: refFondo, indice: fotoIndex } = useRotacion<HTMLDivElement>(fotosFondo);
  const foto = fotosFondo[1] ?? fotosFondo[0] ?? "";
  const { ref, visto } = useReveal<HTMLElement>();
  const [enviado, setEnviado] = useState(false);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const km = f.get("k") ? ", con " + f.get("k") + " km" : "";
    const precio = f.get("p") ? ". Precio que espero: $" + f.get("p") : "";
    window.open(
      wa("Hola, soy " + f.get("n") + ". Quiero vender mi " + f.get("a") + km + precio + "."),
      "_blank"
    );
    setEnviado(true);
  }

  return (
    <section id="vende" className={"vta" + (visto ? " in" : "")} ref={ref}>
      {fotosFondo.length > 0 && (
        <div className="fondo-exhibicion" aria-hidden="true" ref={refFondo}>
          <div
            key={fotoIndex}
            className="fondo-exhibicion-foto"
            style={{
              backgroundImage: `url("${fotosFondo[fotoIndex % fotosFondo.length]}")`,
            }}
          />
        </div>
      )}
      <div className="wrap">
        <h2 className="rvx" style={retraso(0)}>Vende tu auto con nosotros</h2>
        <p className="sub rvx" style={retraso(80)}>
          Cuéntanos qué auto tienes y te respondemos por WhatsApp con una propuesta.
        </p>

        <div className="vta-grid">
          <div className="vta-visual rvx" style={retraso(140)}>
            {foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" loading="lazy" decoding="async" />
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

          <form className="vta-form rvx" onSubmit={enviar} style={retraso(240)}>
            <h3>Cuéntanos de tu auto</h3>
            <label>Tu nombre<input name="n" required autoComplete="name" /></label>
            <label>Marca, modelo y año<input name="a" required placeholder="Ejemplo: Chevrolet C10 1985" /></label>
            <label>Kilometraje aproximado<input name="k" inputMode="numeric" /></label>
            <label>Precio que esperas (opcional)<input name="p" inputMode="numeric" /></label>
            <button className="btn fill vta-enviar" type="submit">Enviar por WhatsApp</button>
            {enviado && (
              <p className="vta-ok" role="status">Abrimos WhatsApp con tus datos. ¡Gracias!</p>
            )}
            <Link className="vta-link" href="/consignacion">Conoce cómo funciona la consignación →</Link>
          </form>
        </div>
      </div>
    </section>
  );
}