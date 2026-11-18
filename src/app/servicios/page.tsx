import "./servicios.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { INSTAGRAM_PERSONAL, wa, TIKTOK_PERSONAL } from "@/lib/datos";
import { getFotosServicios } from "@/lib/autos";
import { fondoCss, imgSrc, imgSrcSet } from "@/lib/img";

// ================= EDITA AQUÍ =================
// Auto cuyas fotos se usan. Deja AUTO_CODIGO vacío para buscar la Ford F-150.
// Para elegir otro auto, escribe su código, por ejemplo "CV-0007".
const AUTO_CODIGO = "";
const AUTO_MARCA = "ford";
const AUTO_MODELO = "150";

const SERVICIOS = {
  transferencia: {
    id: "transferencias",
    t: "Transferencias 24/7",
    d: "Nos encargamos del trámite de transferencia de tu vehículo, con atención todos los días y a cualquier hora.",
    b: "Te ahorras filas y trámites",
    boton: "Solicitar transferencia",
  },
  lavado: {
    id: "lavado",
    t: "Lavado de vehículos",
    d: "Dejamos tu auto limpio por dentro y por fuera, listo para entregar o para lucirlo como nuevo.",
    b: "Tu auto impecable, sin hacer nada",
    boton: "Agendar lavado",
  },
  fotos: {
    id: "fotos",
    t: "Fotos de autos",
    d: "Fotografías con buena luz y los ángulos que más venden, para tu página y tus redes.",
    b: "Tu auto destaca desde la primera foto",
    boton: "Cotizar fotos",
  },
  videos: {
    id: "videos",
    t: "Videos publicitarios",
    d: "Videos cortos y verticales para Instagram, TikTok y Facebook, que muestran tu auto en movimiento.",
    b: "Más atención en redes",
    boton: "Cotizar video",
  },
  contenido: {
    id: "contenido",
    t: "Creación de contenido automotriz",
    d: "Reels, historias y publicaciones para automotoras y dueños de autos que quieren destacar.",
    b: "Tus redes activas, sin dedicarles tu tiempo",
    boton: "Hablemos de tu contenido",
  },
};
// ===============================================

type Servicio = (typeof SERVICIOS)[keyof typeof SERVICIOS];

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/servicios" },
  title: "Servicios | Chillán Vende Autos",
  description: "Transferencias, lavado, fotos, videos y contenido automotriz en Chillán.",
};

function Texto({ s }: { s: Servicio }) {
  return (
    <>
      <h2>{s.t}</h2>
      <p className="sv-desc">{s.d}</p>
      <p className="sv-beneficio">{s.b}</p>
      <a className="btn fill" href={wa("Hola, quiero consultar por el servicio de " + s.t + ".")}>
        {s.boton}
      </a>
    </>
  );
}

function Foto({ src, sizes, className }: { src: string; sizes: string; className?: string }) {
  if (!src) return <div className={"sv-foto vacia " + (className ?? "")} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={"sv-foto " + (className ?? "")}
      src={imgSrc(src, 640, 60)}
      srcSet={imgSrcSet(src, 60)}
      sizes={sizes}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}

function Telefono({ n, className }: { n: number; className?: string }) {
  return (
    <div className={"sv-tel " + (className ?? "")}>
      <Image src={`/videos/video${n}.jpg`} alt="" fill sizes="(max-width: 760px) 44vw, 240px" />
      <span className="sv-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </span>
    </div>
  );
}

export default async function Servicios() {
  const fotos = await getFotosServicios(AUTO_CODIGO, AUTO_MARCA, AUTO_MODELO);
  const foto = (i: number) => (fotos.length ? fotos[i % fotos.length] : "");
  const { transferencia, lavado, fotos: sFotos, videos, contenido } = SERVICIOS;

  return (
    <main className="sv">
      <section
        className="sv-hero"
        style={
          foto(0)
            ? { backgroundImage: "linear-gradient(90deg, rgba(0,0,0,.9), rgba(0,0,0,.35)), " + fondoCss(foto(0), 1080, 45) }
            : undefined
        }
      >
        <div className="wrap">
          <span className="sv-kicker">Servicios</span>
          <h1>Todo para tu vehículo, en un solo lugar</h1>
          <p>Trámites, cuidado y contenido para tu auto. Elige lo que necesitas y lo coordinamos por WhatsApp.</p>
          <nav className="sv-indice" aria-label="Servicios disponibles">
            {Object.values(SERVICIOS).map((s) => (
              <a key={s.id} href={"#" + s.id}>{s.t.replace(" automotriz", "")}</a>
            ))}
            <Link href="/revision-tecnica">Revisión técnica</Link>
          </nav>
        </div>
      </section>

      <section id={transferencia.id} className="sv-transfer" style={foto(1) ? { backgroundImage: "linear-gradient(0deg, rgba(0,0,0,.92), rgba(0,0,0,.45)), " + fondoCss(foto(1), 1080, 45) } : undefined}>
        <div className="wrap sv-transfer-in">
          <strong className="sv-247" aria-hidden="true">24/7</strong>
          <div><Texto s={transferencia} /></div>
        </div>
      </section>

      <section id={lavado.id} className="sv-lavado">
        <div className="wrap sv-dos">
          <div><Texto s={lavado} /></div>
          <Foto src={foto(2)} sizes="(max-width: 860px) 100vw, 520px" className="sv-redonda" />
        </div>
      </section>

      <section id={sFotos.id} className="sv-galeria">
        <div className="wrap">
          <div className="sv-collage">
            <Foto src={foto(3)} sizes="(max-width: 860px) 100vw, 560px" className="a" />
            <Foto src={foto(4)} sizes="(max-width: 860px) 50vw, 280px" className="b" />
            <Foto src={foto(5)} sizes="(max-width: 860px) 50vw, 280px" className="c" />
          </div>
          <div className="sv-galeria-texto"><Texto s={sFotos} /></div>
        </div>
      </section>

      <section id={videos.id} className="sv-videos">
        <div className="wrap sv-dos">
          <Telefono n={2} className="solo" />
          <div><Texto s={videos} /></div>
        </div>
      </section>

      <section id={contenido.id} className="sv-contenido">
        <div className="wrap sv-dos">
          <div>
            <Texto s={contenido} />
            <ul className="sv-formatos" aria-label="Formatos">
              <li>Reels</li><li>Historias</li><li>Publicaciones</li>
            </ul>
          </div>
          <div className="sv-tels">
            <Telefono n={1} />
            <Telefono n={3} className="baja" />
          </div>
        </div>
      </section>

      <section className="sv-revision">
        <div className="wrap">
          <div>
            <h2>¿Te toca la revisión técnica?</h2>
            <p>Coordinamos y gestionamos el proceso por ti.</p>
          </div>
          <Link className="btn" href="/revision-tecnica">Ver cómo funciona</Link>
        </div>
      </section>

      <section className="srv-fin">
        <div className="wrap">
          <h2>Mira mi trabajo en Instagram y TikTok</h2>
          <p>Fotos, videos y contenido automotriz que hacemos para nuestros clientes.</p>
          <div className="srv-redes">
            <a className="ig-btn" href={INSTAGRAM_PERSONAL} target="_blank" rel="noopener noreferrer">
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
