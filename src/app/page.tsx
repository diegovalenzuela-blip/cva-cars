import Portada from "@/components/Portada";
import VideosDestacados from "@/components/VideosDestacados";
import Vitrina from "@/components/Vitrina";
import VendeTuAuto from "@/components/VendeTuAuto";
import DondeEstamos from "@/components/DondeEstamos";
import { getAutosExhibicion } from "@/lib/autos";
import type { FotoFondo } from "@/lib/autos";

export const revalidate = 60;

export default async function Home() {
  const autos = await getAutosExhibicion();

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
      <Portada fotos={fotosPortada} />
      {/* Los autos primero: es lo que viene a ver el comprador. */}
      <Vitrina autos={autos} cargando={false} />
      <VideosDestacados />
      <VendeTuAuto fotosFondo={fotosFondo} />
      <DondeEstamos banner={fotosFondo[2] ?? fotosFondo[0] ?? ""} />

      <footer>
        <div className="wrap">
          <span>© Chillán Vende Autos</span>
          <span>Hecho con CVA Cars</span>
        </div>
      </footer>
    </>
  );
}
