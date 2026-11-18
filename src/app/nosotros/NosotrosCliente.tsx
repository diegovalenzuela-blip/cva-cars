"use client";

import Link from "next/link";
import { useRotacion } from "@/lib/useRotacion";
import { fondoCss } from "@/lib/img";
import "@/components/secciones.css";

export default function NosotrosCliente({ fotosFondo }: { fotosFondo: string[] }) {
  const { ref: refFondo, indice: fotoIndex, visto } = useRotacion<HTMLDivElement>(fotosFondo);

  return (
    <main className="nosotros-seccion">
      {fotosFondo.length > 0 && (
        <div className="fondo-exhibicion" aria-hidden="true" ref={refFondo}>
          {visto && (
            <div
              key={fotoIndex}
              className="fondo-exhibicion-foto"
              style={{ backgroundImage: fondoCss(fotosFondo[fotoIndex % fotosFondo.length]) }}
            />
          )}
        </div>
      )}

      <div className="det">
        <h1>Quiénes somos</h1>
        <div style={{ maxWidth: 680, marginTop: 16 }}>
          <p style={{ fontSize: "1.1rem" }}>
            Somos Chillán Vende Autos, una automotora de la región de Ñuble dedicada a la venta y consignación de autos y camionetas.
          </p>
          <p style={{ fontSize: "1.1rem" }}>
            Cada vehículo se publica con su ficha, fotos reales y un código único, para que sepas exactamente qué estás viendo.
          </p>
          <p style={{ fontSize: "1.1rem" }}>
            Si buscas tu próximo auto o quieres vender el tuyo, escríbenos y lo vemos en persona.
          </p>
        </div>
        <div className="acc" style={{ marginTop: 20 }}>
          <Link className="btn fill" href="/catalogo">Ver catálogo</Link>
          <Link className="btn" href="/consignacion">Dejar mi auto en consignación</Link>
        </div>
      </div>
    </main>
  );
}