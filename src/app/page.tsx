import Portada from "@/components/Portada";
import VideosDestacados from "@/components/VideosDestacados";
import Vitrina from "@/components/Vitrina";
import VendeTuAuto from "@/components/VendeTuAuto";
import DondeEstamos from "@/components/DondeEstamos";
import { getAutosPublicos } from "@/lib/autos";

export const revalidate = 60;

export default async function Home() {
  const autos = await getAutosPublicos();

  return (
    <>
      <Portada />
      <VideosDestacados />
      <Vitrina autos={autos} cargando={false} />
      <VendeTuAuto />
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
