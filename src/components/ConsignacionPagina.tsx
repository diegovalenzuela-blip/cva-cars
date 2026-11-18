"use client";

import "./paginas.css";
import "./consignacion.css";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { wa } from "@/lib/datos";
import type { FotoFondo } from "@/lib/autos";
import Aparece from "./Aparece";
import FondoAutos from "./FondoAutos";

// Tiempo entre fotos, en milisegundos (3000 = 3 segundos, 4000 = 4 segundos)
const INTERVALO = 4000;

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const PASOS = [
  {
    t: "Evaluamos tu vehículo",
    d: "Revisamos sus características, estado y antecedentes.",
    i: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  },
  {
    t: "Lo publicamos",
    d: "Creamos contenido, fotografías y publicaciones para promocionarlo.",
    i: <><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6l2-3h4l2 3" /></>,
  },
  {
    t: "Gestionamos los interesados",
    d: "Atendemos consultas, coordinamos visitas y negociamos con potenciales compradores.",
    i: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5A8 8 0 1 1 21 12Z" /></>,
  },
  {
    t: "Concretamos la venta",
    d: "Coordinamos el cierre de la operación y la transferencia correspondiente.",
    i: <><path d="M20 6 9 17l-5-5" /></>,
  },
];

const BENEFICIOS = [
  "No necesitas publicar tu vehículo por tu cuenta",
  "Nos encargamos de la promoción y difusión",
  "Gestionamos las consultas de los interesados",
  "Coordinamos las visitas",
  "Te mantenemos informado del proceso",
];

export default function ConsignacionPagina({ fotos }: { fotos: FotoFondo[] }) {
  const [enviado, setEnviado] = useState(false);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const km = f.get("k") ? ", con " + f.get("k") + " km" : "";
    const precio = f.get("p") ? ". Precio que espero: $" + f.get("p") : "";
    window.open(
      wa("Hola, soy " + f.get("n") + ". Quiero dejar mi " + f.get("a") + km + precio + " en consignación."),
      "_blank",
      "noopener,noreferrer"
    );
    setEnviado(true);
  }

  return (
    <main className="csg cs">
      <section className="csg-hero cs-hero">
        <FondoAutos fotos={fotos} intervalo={INTERVALO} />
        <div className="wrap">
          <span className="csg-etiqueta">Consignación</span>
          <h1><span className="pal2">Vende tu vehículo sin complicarte</span></h1>
          <span className="csg-linea" aria-hidden="true" />
          <p>
            Nosotros nos encargamos de mostrarlo, promocionarlo y encontrar un comprador.
            Tú mantienes la propiedad de tu vehículo hasta concretar la venta.
          </p>
          <div className="acc">
            <a className="btn fill" href="#formulario">Iniciar solicitud</a>
            <a className="btn" href={wa("Hola, quiero consultar por la consignación de mi auto.")}>
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="cs-proceso">
        <div className="wrap">
          <Aparece><h2>¿Cómo funciona?</h2></Aparece>
          <ol className="cs-ruta">
            {PASOS.map((p, i) => (
              <li key={p.t}>
                <Aparece retraso={i * 90}>
                  <span className="cs-ic"><Icono>{p.i}</Icono></span>
                  <small>Paso {i + 1}</small>
                  <strong>{p.t}</strong>
                  <p>{p.d}</p>
                </Aparece>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cs-razones">
        <div className="wrap cs-razones-in">
          <Aparece className="cs-destacado">
            <span>Sin pago inicial</span>
            <h2>¿Por qué elegirnos?</h2>
            <p>No necesitas realizar un pago inicial por el servicio, según las condiciones de consignación vigentes.</p>
          </Aparece>
          <ul className="cs-lista">
            {BENEFICIOS.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      </section>

      <section className="cs-cierre" id="formulario">
        <div className="wrap csg-form-sec">
          <Aparece>
            <h2>Tu próximo comprador puede estar más cerca de lo que imaginas</h2>
            <p className="sub">Cuéntanos de tu vehículo y te respondemos por WhatsApp con una propuesta.</p>
            <div className="csg-cond">
              <h3>Condiciones y comisión</h3>
              <p>Escríbenos por WhatsApp y te explicamos cómo funciona en tu caso.</p>
            </div>
          </Aparece>

          <Aparece retraso={140}>
            <form className="csg-form" onSubmit={enviar}>
              <label>Tu nombre<input name="n" required autoComplete="name" /></label>
              <label>Marca, modelo y año<input name="a" required placeholder="Ejemplo: Chevrolet C10 1985" /></label>
              <label>Kilometraje aproximado<input name="k" inputMode="numeric" /></label>
              <label>Precio que esperas (opcional)<input name="p" inputMode="numeric" /></label>
              <button className="btn fill" type="submit">Quiero vender mi vehículo</button>
              {enviado && <p className="csg-ok" role="status">Abrimos WhatsApp con tus datos. ¡Gracias!</p>}
            </form>
          </Aparece>
        </div>
      </section>

      <div className="wrap">
        <Aparece>
          <div className="csg-band">
            <h2>¿Prefieres ver cómo exhibimos los autos?</h2>
            <p>Mira el catálogo completo o conoce los otros servicios que ofrecemos.</p>
            <div className="acc" style={{ justifyContent: "center" }}>
              <Link className="btn fill" href="/catalogo">Ver catálogo completo</Link>
              <Link className="btn" href="/servicios">Conocer los servicios</Link>
            </div>
          </div>
        </Aparece>
      </div>
    </main>
  );
}
