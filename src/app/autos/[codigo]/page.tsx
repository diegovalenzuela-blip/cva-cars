import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAutoPorCodigo } from "@/lib/autos";
import { wa } from "@/lib/datos";
import Galeria from "./Galeria";

export const revalidate = 60;

type Props = { params: Promise<{ codigo: string }> };

// Un enlace roto como /autos/%E0%A4%A hacía caer la página: aquí se decodifica con cuidado.
function decodificar(c: string): string {
  try {
    return decodeURIComponent(c);
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  const auto = await getAutoPorCodigo(decodificar(codigo));
  if (!auto) return { title: "Auto no disponible | Chillán Vende Autos", robots: { index: false } };
  const titulo = auto.marca + " " + auto.modelo + (auto.version ? " " + auto.version : "");
  return {
    title: titulo + " " + auto.anio + " | Chillán Vende Autos",
    description:
      titulo + " " + auto.anio + " en Chillán, $" + auto.precio.toLocaleString("es-CL") + ". Mira fotos y detalles.",
  };
}

export default async function Detalle({ params }: Props) {
  const { codigo } = await params;
  const auto = await getAutoPorCodigo(decodificar(codigo));
  if (!auto) notFound();

  const titulo = auto.marca + " " + auto.modelo + (auto.version ? " " + auto.version : "");
  const datos: [string, string | null][] = [
    ["Año", String(auto.anio)],
    ["Kilometraje", auto.km ? auto.km.toLocaleString("es-CL") + " km" : null],
    ["Combustible", auto.combustible],
    ["Transmisión", auto.transmision],
    ["Color", auto.color],
    ["Tipo", auto.tipo],
    ["Ubicación", auto.ubicacion],
    ["Código", auto.codigo],
  ];

  return (
    <main className="det">
      <Link href="/catalogo" className="det-volver">← Volver a catálogo</Link>
      <div className="det-grid">
        <Galeria fotos={auto.fotos} titulo={titulo} />

        <div>
          <h1>{titulo}</h1>
          {auto.estado === "reservado" && <p className="det-reservado">RESERVADO</p>}
          <div className="precio" style={{ fontSize: "2.2rem" }}>${auto.precio.toLocaleString("es-CL")}</div>
          <dl className="det-specs">
            {datos.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          {auto.descripcion && (
            <>
              <h2 style={{ fontSize: "1.5rem", marginTop: 20 }}>Descripción</h2>
              <p style={{ whiteSpace: "pre-line" }}>{auto.descripcion}</p>
            </>
          )}
          <a
            className="btn fill"
            style={{ marginTop: 16 }}
            href={wa("Hola, me interesa el " + titulo + " " + auto.anio + " (Ref " + auto.codigo + ")")}
          >
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
