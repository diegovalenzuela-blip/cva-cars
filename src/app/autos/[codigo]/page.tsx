import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAutoPorCodigo, getAutosPublicos } from "@/lib/autos";
import type { AutoPublico } from "@/lib/autos";
import { wa } from "@/lib/datos";
import { imgSrc, imgSrcSet } from "@/lib/img";
import { JsonLd, autoJson } from "@/lib/seo";
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
  const km = auto.km ? ", " + auto.km.toLocaleString("es-CL") + " km" : "";
  const descripcion =
    titulo + " " + auto.anio + km + " en venta en Chillán, Ñuble. Precio $" +
    auto.precio.toLocaleString("es-CL") + ". Mira fotos y detalles, y consulta por WhatsApp.";
  const ruta = "/autos/" + encodeURIComponent(auto.codigo);
  return {
    title: titulo + " " + auto.anio + " usado en Chillán | Chillán Vende Autos",
    description: descripcion,
    alternates: { canonical: ruta },
    // Al compartir el link de un auto se ve la foto del auto, no el logo.
    openGraph: {
      title: titulo + " " + auto.anio + " · $" + auto.precio.toLocaleString("es-CL"),
      description: descripcion,
      url: ruta,
      type: "website",
      images: auto.fotos[0] ? [{ url: auto.fotos[0], alt: titulo + " " + auto.anio }] : undefined,
    },
  };
}

const plata = (n: number) => "$" + n.toLocaleString("es-CL");

// Tres autos para seguir mirando: primero los del mismo tipo, y entre ellos los de precio más parecido.
function similares(auto: AutoPublico, todos: AutoPublico[]): AutoPublico[] {
  const otros = todos.filter((a) => a.codigo !== auto.codigo && a.fotos.length > 0);
  const distancia = (a: AutoPublico) => Math.abs(a.precio - auto.precio) / Math.max(auto.precio, 1);
  const mismoTipo = (a: AutoPublico) => (auto.tipo && a.tipo === auto.tipo ? 0 : 1);
  return [...otros].sort((a, b) => mismoTipo(a) - mismoTipo(b) || distancia(a) - distancia(b)).slice(0, 3);
}

export default async function Detalle({ params }: Props) {
  const { codigo } = await params;
  const auto = await getAutoPorCodigo(decodificar(codigo));
  if (!auto) notFound();
  const parecidos = similares(auto, await getAutosPublicos(auto.catalogo));

  const titulo = auto.marca + " " + auto.modelo + (auto.version ? " " + auto.version : "");
  const datos: [string, string | null][] = [
    ["Año", String(auto.anio)],
    ["Kilometraje", auto.km ? auto.km.toLocaleString("es-CL") + " km" : null],
    ["Combustible", auto.combustible],
    ["Transmisión", auto.transmision],
    ["Color", auto.color],
    ["Tipo", auto.tipo],
    ["Dueños", auto.duenos != null ? String(auto.duenos) : null],
    ["Ubicación", auto.ubicacion],
    ["Código", auto.codigo],
  ];
  // Solo se muestra lo que la automotora completó en el panel.
  const respaldo: [string, string][] = (
    [
      ["Papeles", auto.estado_papeles],
      ["Mantenciones", auto.mantenciones],
      ["Revisión técnica", auto.revision_tecnica],
    ] as [string, string | null][]
  ).filter((d): d is [string, string] => Boolean(d[1]));

  const consulta = wa("Hola, me interesa el " + titulo + " " + auto.anio + " (Ref " + auto.codigo + ")");

  const condiciones = [
    auto.acepta_parte_pago ? "Acepta vehículo en parte de pago" : null,
    auto.precio_negociable ? "Precio negociable" : null,
  ].filter((c): c is string => Boolean(c));

  return (
    <main className="det">
      <JsonLd datos={autoJson(auto)} />
      <Link href={auto.catalogo === "trabajo" ? "/vehiculos-de-trabajo" : "/catalogo"} className="det-volver">
        ← Volver a {auto.catalogo === "trabajo" ? "vehículos de trabajo" : "catálogo"}
      </Link>
      <div className="det-grid">
        <Galeria fotos={auto.fotos} titulo={titulo} />

        <div>
          <h1>{titulo}</h1>
          {auto.estado === "reservado" && <p className="det-reservado">RESERVADO</p>}
          <div className="precio" style={{ fontSize: "2.2rem" }}>${auto.precio.toLocaleString("es-CL")}</div>
          {/* El botón va junto al precio: es lo primero que se busca al decidir escribir. */}
          <div className="det-acciones">
            <a className="btn fill" href={consulta} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
          </div>
          <dl className="det-specs">
            {datos.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          {condiciones.length > 0 && (
            <section className="det-respaldo det-condiciones" aria-labelledby="condiciones-titulo">
              <h2 id="condiciones-titulo">Condiciones comerciales</h2>
              <ul>{condiciones.map((c) => <li key={c}>{c}</li>)}</ul>
            </section>
          )}
          {respaldo.length > 0 && (
            <section className="det-respaldo" aria-labelledby="respaldo-titulo">
              <h2 id="respaldo-titulo">Respaldo del vehículo</h2>
              <dl>
                {respaldo.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            </section>
          )}
          {auto.descripcion && (
            <>
              <h2 style={{ fontSize: "1.5rem", marginTop: 20 }}>Descripción</h2>
              <p style={{ whiteSpace: "pre-line" }}>{auto.descripcion}</p>
            </>
          )}
          <a className="btn fill" style={{ marginTop: 16 }} href={consulta} target="_blank" rel="noopener noreferrer">
            Consultar por WhatsApp
          </a>
        </div>
      </div>

      {parecidos.length > 0 && (
        <section className="det-similares" aria-labelledby="similares-titulo">
          <h2 id="similares-titulo">También te puede interesar</h2>
          <div className="det-similares-grid">
            {parecidos.map((a) => (
              <Link key={a.codigo} className="det-similar" href={"/autos/" + a.codigo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc(a.fotos[0], 640, 60)}
                  srcSet={imgSrcSet(a.fotos[0], 60)}
                  sizes="(max-width: 760px) 92vw, 340px"
                  alt={a.marca + " " + a.modelo}
                  loading="lazy"
                  decoding="async"
                />
                <span className="det-similar-info">
                  <strong>{a.marca} {a.modelo}</strong>
                  <span>{a.anio}{a.km ? " · " + a.km.toLocaleString("es-CL") + " km" : ""}</span>
                  <b>{plata(a.precio)}</b>
                </span>
              </Link>
            ))}
          </div>
          <Link className="btn" href={auto.catalogo === "trabajo" ? "/vehiculos-de-trabajo" : "/catalogo"}>
            Ver todos los {auto.catalogo === "trabajo" ? "vehículos de trabajo" : "autos"}
          </Link>
        </section>
      )}

      {/* Barra fija en el celular: el precio y WhatsApp siempre a mano mientras se baja. */}
      <div className="det-barra">
        <span>
          <small>{titulo}</small>
          <b>{plata(auto.precio)}</b>
        </span>
        <a className="btn fill" href={consulta} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
    </main>
  );
}
