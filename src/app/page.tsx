import type { Metadata } from "next";
import Portada from "@/components/Portada";
import VideosDestacados from "@/components/VideosDestacados";
import Vitrina from "@/components/Vitrina";
import VendeTuAuto from "@/components/VendeTuAuto";
import DondeEstamos from "@/components/DondeEstamos";
import { getAutosExhibicion, getAutosPublicos } from "@/lib/autos";
import type { FotoFondo } from "@/lib/autos";
import { VIDEOS, INSTAGRAM, FACEBOOK, TIKTOK } from "@/lib/datos";
import Link from "next/link";

export const revalidate = 60;

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const [autos, publicos] = await Promise.all([getAutosExhibicion(), getAutosPublicos()]);

  // Cada video muestra el auto que aparece en él, si sigue en venta.
  const videos = VIDEOS.map(({ codigo, ...v }) => {
    const a = codigo ? publicos.find((x) => x.codigo === codigo) : undefined;
    return {
      ...v,
      auto: a
        ? { codigo: a.codigo, nombre: a.marca + " " + a.modelo + " " + a.anio, precio: a.precio, reservado: a.estado === "reservado" }
        : null,
    };
  });

  // Los fondos son solo de autos y camionetas: una moto detrás del título confunde.
  const sinMotos = autos.filter((a) => !/moto/i.test(a.tipo ?? ""));

  // Máximo 5 fotos de fondo: más que eso solo gasta datos y memoria en el teléfono.
  const fotosFondo = sinMotos
    .flatMap((auto) => (auto.fotos && auto.fotos.length > 0 ? [auto.fotos[0]] : []))
    .slice(0, 5);

  // Fotos de la portada: primero los destacados.
  const conFoto = [...sinMotos]
    .sort((a, b) => Number(!!b.destacado) - Number(!!a.destacado))
    .filter((a) => a.fotos && a.fotos.length > 0);
  const nombre = (a: (typeof autos)[number]) => a.marca + " " + a.modelo + " " + a.anio;
  const fotosPortada: FotoFondo[] = conFoto
    .slice(0, 4)
    .map((a) => ({ url: a.fotos[0], titulo: nombre(a), codigo: a.codigo }));
  if (fotosPortada.length < 3 && conFoto[0]) {
    conFoto[0].fotos.slice(1, 4).forEach((u) => {
      fotosPortada.push({ url: u, titulo: nombre(conFoto[0]), codigo: conFoto[0].codigo });
    });
  }

  // Tarjeta de la portada: el auto o camioneta publicado más reciente que no sea el de la
  // vitrina (la vitrina ya muestra el destacado justo debajo, así no se repite).
  const estrella = [...autos].sort((a, b) => Number(!!b.destacado) - Number(!!a.destacado))[0];
  const reciente = sinMotos.find((a) => a !== estrella && a.fotos.length > 0) ?? (estrella?.fotos.length ? estrella : undefined);
  const destacado = reciente
    ? {
        codigo: reciente.codigo,
        nombre: reciente.marca + " " + reciente.modelo,
        detalle: [String(reciente.anio), reciente.km ? reciente.km.toLocaleString("es-CL") + " km" : "", reciente.ubicacion ?? ""]
          .filter(Boolean)
          .join(" · "),
        precio: reciente.precio,
        foto: reciente.fotos[0],
        reservado: reciente.estado === "reservado",
        etiqueta: reciente === estrella ? "Auto destacado" : "Recién publicado",
      }
    : null;

  // Tipos para el buscador rápido: los del catálogo general, que es adonde lleva.
  const generales = publicos.filter((a) => a.catalogo === "general");
  const datos = { tipos: Array.from(new Set(generales.map((a) => a.tipo ?? "").filter(Boolean))).sort() };

  return (
    <>
      <main>
      <Portada fotos={fotosPortada} destacado={destacado} datos={datos} />
      {/* Los autos primero: es lo que viene a ver el comprador. */}
      <Vitrina autos={autos} cargando={false} />
      <VideosDestacados videos={videos} />
      <VendeTuAuto fotosFondo={fotosFondo} />
      <DondeEstamos banner={fotosFondo[2] ?? fotosFondo[0] ?? ""} />
      </main>

      <footer className="pie">
        <div className="wrap pie-grid">
          <div>
            <strong className="pie-marca">Chillán Vende Autos</strong>
            <p>Autos y camionetas usados en Chillán y la Región de Ñuble.</p>
          </div>
          <nav aria-label="Enlaces del sitio">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/vehiculos-de-trabajo">Vehículos de trabajo</Link>
            <Link href="/consignacion">Vende tu auto</Link>
            <a href="#contacto">Contacto</a>
          </nav>
          <nav aria-label="Redes sociales">
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href={FACEBOOK} target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href={TIKTOK} target="_blank" rel="noopener noreferrer">TikTok</a>
          </nav>
        </div>
        <div className="wrap pie-final">
          <span>© Chillán Vende Autos</span>
          <span>Hecho con CVA Cars</span>
        </div>
      </footer>
    </>
  );
}
