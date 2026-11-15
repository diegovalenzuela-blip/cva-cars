"use client";

import { wa } from "@/lib/datos";

const PASOS = [
  { n: "1", t: "Nos cuentas de tu auto", d: "Nos envías los datos y las fotos por WhatsApp, o completas el formulario de abajo." },
  { n: "2", t: "Lo publicamos", d: "Lo mostramos en nuestra página y en nuestras redes, con fotos y video." },
  { n: "3", t: "Atendemos a los interesados", d: "Respondemos las consultas y coordinamos las visitas para que no pierdas tiempo." },
];

export default function Consignacion() {
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const km = f.get("k") ? ", con " + f.get("k") + " km" : "";
    const precio = f.get("p") ? ". Precio que espero: $" + f.get("p") : "";
    window.open(
      wa("Hola, soy " + f.get("n") + ". Quiero dejar mi " + f.get("a") + km + precio + " en consignación."),
      "_blank"
    );
  }

  return (
    <main className="det">
      <h1>Consignación</h1>
      <p className="sub">
        ¿Quieres vender tu auto sin complicarte? Déjalo con nosotros y nos encargamos de publicarlo y atender a los interesados.
      </p>

      <div className="pasos">
        {PASOS.map((p) => (
          <div className="paso" key={p.n}>
            <b>{p.n}</b>
            <strong>{p.t}</strong>
            <p style={{ margin: "6px 0 0" }}>{p.d}</p>
          </div>
        ))}
      </div>

      <div className="info-card">
        <h2>Condiciones y comisión</h2>
        <p style={{ margin: 0 }}>Escríbenos por WhatsApp y te explicamos cómo funciona en tu caso.</p>
      </div>

      <h2>Cuéntanos de tu auto</h2>
      <form onSubmit={enviar} style={{ maxWidth: 520 }}>
        <label>Tu nombre<input name="n" required autoComplete="name" /></label>
        <label>Marca, modelo y año<input name="a" required placeholder="Ejemplo: Chevrolet C10 1985" /></label>
        <label>Kilometraje aproximado<input name="k" inputMode="numeric" /></label>
        <label>Precio que esperas (opcional)<input name="p" inputMode="numeric" /></label>
        <button className="btn fill" type="submit">Enviar por WhatsApp</button>
      </form>
    </main>
  );
}
