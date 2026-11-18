import type { Metadata } from "next";
import { INSTAGRAM_PERSONAL, wa, TIKTOK_PERSONAL } from "@/lib/datos";
import { getFotosServicios } from "@/lib/autos";
import { fondoCss, imgSrc, imgSrcSet } from "@/lib/img";

// ================= EDITA AQUÍ =================
// Auto cuyas fotos se usan. Deja AUTO_CODIGO vacío para buscar la Ford F-150.
// Para elegir otro auto, escribe su código, por ejemplo "CV-0007".
const AUTO_CODIGO = "";
const AUTO_MARCA = "ford";
const AUTO_MODELO = "150";

const SERVICIOS = [
  {
    n: "01",
    t: "Transferencias 24/7",
    d: "Nos encargamos del trámite de transferencia de tu vehículo, con atención todos los días y a cualquier hora. Escríbenos y lo coordinamos.",
  },
  {
    n: "02",
    t: "Lavado de vehículos",
    d: "Dejamos tu auto limpio por dentro y por fuera, listo para entregar o para lucirlo como nuevo.",
  },
  {
    n: "03",
    t: "Fotos de autos",
    d: "Fotografías con buena luz y los ángulos que más venden, para publicar tu auto en tu página y en tus redes.",
  },
  {
    n: "04",
    t: "Videos publicitarios",
    d: "Videos cortos y verticales, pensados para Instagram, TikTok y Facebook, que muestran tu auto en movimiento.",
  },
  {
    n: "05",
    t: "Creación de contenido automotriz",
    d: "Reels, historias y publicaciones para automotoras y dueños de autos que quieren destacar en redes.",
  },
];
// ===============================================

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/servicios" },
  title: "Servicios | Chillán Vende Autos",
  description: "Transferencias, lavado, fotos, videos y contenido automotriz.",
};

export default async function Servicios() {
  const fotos = await getFotosServicios(AUTO_CODIGO, AUTO_MARCA, AUTO_MODELO);

  const foto = (i: number) => (fotos.length ? fotos[i % fotos.length] : "");
  const hero = foto(0);

  return (
    <main>
      <section
        className="srv-hero"
        style={
          hero
            ? {
                backgroundImage:
                  "linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.88)), " + fondoCss(hero, 828, 45),
              }
            : undefined
        }
      >
        <div className="wrap">
          <h1>Servicios</h1>
          <p>Todo lo que necesitas para tu vehículo, en un solo lugar.</p>
        </div>
      </section>

      {SERVICIOS.map((s, i) => (
        <section className="srv" key={s.n}>
          <div className="wrap srv-fila">
            <div className="srv-texto">
              <span className="srv-n">{s.n}</span>
              <h2>{s.t}</h2>
              <p>{s.d}</p>
              <a className="btn fill" href={wa("Hola, quiero consultar por el servicio de " + s.t + ".")}>
                Consultar por WhatsApp
              </a>
            </div>
            {foto(i + 1) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="srv-foto"
                src={imgSrc(foto(i + 1), 640, 60)}
                srcSet={imgSrcSet(foto(i + 1), 60)}
                sizes="(max-width: 860px) 100vw, 520px"
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="srv-foto vacio">Foto</div>
            )}
          </div>
        </section>
      ))}
              <section className="srv-fin">
        <div className="wrap">
          <h2>Mira mi trabajo en Instagram y TikTok</h2>
          <p>Fotos, videos y contenido automotriz que hacemos para nuestros clientes.</p>

          <div className="srv-redes">
            <a
            className="ig-btn"
            href={INSTAGRAM_PERSONAL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver mi Instagram
          </a>
            <a className="tt-btn" href={TIKTOK_PERSONAL} target="_blank" rel="noopener noreferrer">
              Ver mi TikTok
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
