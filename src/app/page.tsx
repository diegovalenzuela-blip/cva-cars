import Portada from "@/components/Portada";
import VideosDestacados from "@/components/VideosDestacados";
import Vitrina from "@/components/Vitrina";
import VendeTuAuto from "@/components/VendeTuAuto";
import DondeEstamos from "@/components/DondeEstamos";
import { getAutosExhibicion } from "@/lib/autos";

export const revalidate = 60;

export default async function Home() {
  const autos = await getAutosExhibicion();

  const fotosFondo = autos.flatMap((auto) =>
    auto.fotos && auto.fotos.length > 0 ? [auto.fotos[0]] : []
  );

  return (
    <>
      <Portada />
      <VideosDestacados fotosFondo={fotosFondo} />
      <Vitrina autos={autos} cargando={false} />
      <VendeTuAuto fotosFondo={fotosFondo} />
      <DondeEstamos />

      <footer>
        <div className="wrap">
          <span>© Chillán Vende Autos</span>
          <span>Hecho con CVA Cars</span>
        </div>
      </footer>
    </>
  );
}
