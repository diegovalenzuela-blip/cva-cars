"use client";

import "./paginas.css";
import Link from "next/link";
import { useState } from "react";
import { wa } from "@/lib/datos";
import { useAutosFondo } from "@/lib/useAutosFondo";
import Aparece from "./Aparece";
import FondoAutos from "./FondoAutos";

// Tiempo entre fotos, en milisegundos (3000 = 3 segundos, 4000 = 4 segundos)
const INTERVALO = 4000;

const PASOS = [
  { n: "1", t: "Nos cuentas de tu auto", d: "Nos envías los datos y las fotos por WhatsApp, o completas el formulario de abajo." },
  { n: "2", t: "Lo publicamos", d: "Lo mostramos en nuestra página y en nuestras redes, con fotos y video." },
  { n: "3", t: "Atendemos a los interesados", d: "Respondemos las consultas y coordinamos las visitas para que no pierdas tiempo." },
];

const BENEFICIOS = [
  { t: "Publicación en la página y en redes", d: "Tu auto se muestra en el catálogo y en nuestras cuentas." },
  { t: "Fotos y videos de calidad", d: "Ofrecemos fotos y video publicitario para que tu auto destaque." },
  { t: "Atención a los interesados", d: "Nosotros respondemos las consultas y coordinamos las visitas." },
  { t: "Código único para tu auto", d: "Cada vehículo tiene su referencia, para que todos hablen del mismo auto." },
];

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ConsignacionPagina() {
  const fotos = useAutosFondo(6);
  const [enviado, setEnviado] = useState(false);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const km = f.get("k") ? ", con " + f.get("k") + " km" : "";
    const precio = f.get("p") ? ". Precio que espero: $" + f.get("p") : "";
    window.open(
      wa("Hola, soy " + f.get("n") + ". Quiero dejar mi " + f.get("a") + km + precio + " en consignación."),
      "_blank"
    );
    setEnviado(true);
  }

  return (
    <main className="csg">
      <section className="csg-hero">
        <FondoAutos fotos={fotos} intervalo={INTERVALO} />
        <div className="wrap">
          <span className="csg-etiqueta">Vende sin complicarte</span>
          <h1>
            <span className="pal2">Consignación</span>
          </h1>
          <span className="csg-linea" aria-hidden="true" />
          <p>Déjalo con nosotros: lo publicamos, lo mostramos y atendemos a los interesados.</p>
          <div className="acc">
            <a className="btn fill" href="#formulario">Dejar mi auto</a>
            <a className="btn" href={wa("Hola, quiero consultar por la consignación de mi auto.")}>
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="csg-sec">
        <div className="wrap">
          <Aparece>
            <h2>Cómo funciona</h2>
          </Aparece>
          <div className="csg-pasos">
            {PASOS.map((p, i) => (
              <Aparece key={p.n} retraso={i * 120}>
                <div className="csg-paso">
                  <b>{p.n}</b>
                  <strong>{p.t}</strong>
                  <p>{p.d}</p>
                </div>
              </Aparece>
            ))}
          </div>
        </div>
      </section>

      <section className="csg-sec">
        <div className="wrap">
          <Aparece>
            <h2>Por qué consignar con nosotros</h2>
          </Aparece>
          <div className="csg-benef">
            {BENEFICIOS.map((b, i) => (
              <Aparece key={b.t} retraso={(i % 4) * 100}>
                <div className="csg-b">
                  <span className="csg-check"><Check /></span>
                  <div>
                    <strong>{b.t}</strong>
                    <p>{b.d}</p>
                  </div>
                </div>
              </Aparece>
            ))}
          </div>
        </div>
      </section>

      <section className="csg-sec" id="formulario">
        <div className="wrap csg-form-sec">
          <Aparece>
            <h2>Cuéntanos de tu auto</h2>
            <p className="sub">Te respondemos por WhatsApp con una propuesta.</p>
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
              <button className="btn fill" type="submit">Enviar por WhatsApp</button>
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