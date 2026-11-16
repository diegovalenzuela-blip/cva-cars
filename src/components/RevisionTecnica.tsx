"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { wa } from "@/lib/datos";

export default function RevisionTecnica({
  fotosFondo,
}: {
  fotosFondo: string[];
}) {
  const [fotoIndex, setFotoIndex] = useState(0);

  useEffect(() => {
    if (fotosFondo.length < 2) return;

    const intervalo = window.setInterval(() => {
      setFotoIndex((actual) => (actual + 1) % fotosFondo.length);
    }, 5000);

    return () => window.clearInterval(intervalo);
  }, [fotosFondo.length]);

  return (
    <section id="revision-tecnica" className="rt-section">
      {fotosFondo.length > 0 && (
        <div className="fondo-exhibicion" aria-hidden="true">
          <div
            key={fotoIndex}
            className="fondo-exhibicion-foto rt-fondo-animado"
            style={{
              backgroundImage: `url("${fotosFondo[fotoIndex % fotosFondo.length]}")`,
            }}
          />
        </div>
      )}

      <div className="wrap rt-grid">
        <div className="rt-foto">
          <Image
            src="/revision-tecnica.jpg"
            alt="Planta de revisión técnica de vehículos"
            fill
            sizes="(max-width: 860px) 100vw, 50vw"
            className="rt-imagen"
          />
          <div className="rt-foto-sombra" />
          <span className="rt-etiqueta">Servicio para todos</span>
          <p className="rt-foto-texto">Tu vehículo al día, sin complicaciones.</p>
        </div>

        <div className="rt-contenido">
          <span className="rt-kicker">Nuevo servicio</span>
          <h2>Nos encargamos de tu revisión técnica</h2>
          <h3>Tú nos entregas las llaves. Nosotros nos encargamos de todo.</h3>

          <p className="rt-descripcion">
            Retiramos tu vehículo, solicitamos la hora y lo llevamos a realizar
            la revisión técnica. Gestionamos el proceso y, si presenta
            observaciones, coordinamos lo necesario para solucionarlas y
            continuar hasta dejar tu vehículo al día.
          </p>

          <ul className="rt-lista">
            <li>Retiro y entrega del vehículo</li>
            <li>Gestión de hora y trámite</li>
            <li>Coordinación ante observaciones</li>
          </ul>

          <a
            className="btn fill rt-boton"
            href={wa("Hola, quiero cotizar el servicio de revisión técnica para mi vehículo.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Consulta el precio por WhatsApp
          </a>

          <p className="rt-nota">
            Servicio disponible aunque no hayas comprado ni vendido tu auto con nosotros.
          </p>
        </div>
      </div>
    </section>
  );
}
