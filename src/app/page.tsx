import type { Metadata } from "next";
import Portada from "@/components/Portada";
import VideosDestacados from "@/components/VideosDestacados";
import Vitrina from "@/components/Vitrina";
import VendeTuAuto from "@/components/VendeTuAuto";
import DondeEstamos from "@/components/DondeEstamos";
import { getAutosExhibicion, getAutosPublicos } from "@/lib/autos";
import type { FotoFondo } from "@/lib/autos";
import { VIDEOS } from "@/lib/datos";

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

  // Máximo 5 fotos de fondo: más que eso solo gasta datos y memoria en el teléfono.
  const fotosFondo = autos
    .flatMap((auto) => (auto.fotos && auto.fotos.length > 0 ? [auto.fotos[0]] : []))
    .slice(0, 5);

  // Fotos de la portada: primero los destacados.
  const conFoto = [...autos]
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

  return (
    <>
      <main>
      <Portada fotos={fotosPortada} />
      {/* Los autos primero: es lo que viene a ver el comprador. */}
      <Vitrina autos={autos} cargando={false} />
      <VideosDestacados videos={videos} />
      <VendeTuAuto fotosFondo={fotosFondo} />
      <DondeEstamos banner={fotosFondo[2] ?? fotosFondo[0] ?? ""} />
      </main>

      <footer>
        <div className="wrap">
          <span>© Chillán Vende Autos</span>
          <span>Hecho con CVA Cars</span>
        </div>
      </footer>
    </>
  );
}
