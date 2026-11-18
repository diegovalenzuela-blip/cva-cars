import "./revision.css";
import type { Metadata } from "next";
import Image from "next/image";
import { wa } from "@/lib/datos";

export const metadata: Metadata = {
  alternates: { canonical: "/revision-tecnica" },
  title: "Revisión técnica en Chillán | Chillán Vende Autos",
  description: "Nos encargamos de coordinar y gestionar la revisión técnica de tu vehículo en Chillán, sin trámites ni complicaciones.",
};

const SOLICITAR = wa("Hola, quiero solicitar el servicio de revisión técnica para mi vehículo.");

const PASOS = [
  { t: "Nos contactas", d: "Nos entregas los datos de tu vehículo y coordinamos el servicio." },
  { t: "Nosotros gestionamos", d: "Nos encargamos de coordinar y realizar las gestiones necesarias." },
  { t: "Resultado", d: "Te informamos del resultado de la revisión y de los pasos siguientes si existen observaciones." },
];

export default function RevisionTecnica() {
  return (
    <main className="rv">
      <section className="rv-hero">
        <Image src="/revision-planta.webp" alt="Línea de inspección en una planta de revisión técnica en Chile" fill priority sizes="100vw" />
        <div className="wrap">
          <span className="rv-kicker">Revisión técnica</span>
          <h1>Tu revisión técnica, sin complicaciones</h1>
          <p>Nos encargamos de gestionar todo el proceso para que no tengas que preocuparte por trámites ni coordinaciones.</p>
          <a className="btn fill" href={SOLICITAR}>Solicitar revisión técnica</a>
        </div>
      </section>

      <section className="rv-intro">
        <div className="wrap">
          <div>
            <h2>Nos encargamos de tu revisión técnica</h2>
            <p>Tu tiempo vale. Coordinamos y gestionamos el proceso, y te acompañamos hasta tener claro el resultado y qué sigue.</p>
            <p className="rv-nota">La aprobación depende de que el vehículo cumpla las condiciones técnicas y legales correspondientes.</p>
          </div>
          <div className="rv-foto">
            <Image src="/revision-linea.webp" alt="Vehículo en la línea de inspección técnica" fill sizes="(max-width: 860px) 100vw, 500px" />
          </div>
        </div>
      </section>

      <section className="rv-pasos">
        <div className="wrap">
          <h2>¿Cómo funciona?</h2>
          <ol>
            {PASOS.map((p, i) => (
              <li key={p.t}>
                <b aria-hidden="true">{i + 1}</b>
                <strong>{p.t}</strong>
                <p>{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rv-cta">
        <div className="wrap">
          <h2>Deja la gestión en nuestras manos</h2>
          <a className="btn" href={SOLICITAR}>Solicitar revisión técnica</a>
        </div>
      </section>

      <p className="rv-credito wrap">
        Fotos: «Revisión Técnica UVT Maipú» de{" "}
        <a href="https://commons.wikimedia.org/wiki/File:Revisi%C3%B3n_T%C3%A9cnica_UVT_Maip%C3%BA_-_2.jpg" target="_blank" rel="noopener noreferrer">Jorgebarrios</a>,{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>;
        {" "}recortada y con la patente difuminada. La planta no está vinculada a este servicio.
      </p>
    </main>
  );
}
