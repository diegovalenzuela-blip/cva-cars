"use client";

import "./destacados.css";
import Link from "next/link";
import { wa } from "@/lib/datos";
import { imgSrc, imgSrcSet } from "@/lib/img";
import Aparece from "./Aparece";

export type AutoVitrina = {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  anio: number;
  km: number | null;
  precio: number;
  estado: string;
  fotos: string[];
  ubicacion: string | null;
  destacado?: boolean | null;
};

const plata = (n: number) => "$" + n.toLocaleString("es-CL");

function Pin() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

export default function Vitrina({
  autos,
  cargando,
}: {
  autos: AutoVitrina[];
  cargando: boolean;
}) {
  const ordenados = [...autos].sort(
    (a, b) => Number(!!b.destacado) - Number(!!a.destacado)
  );
  const estrella = ordenados[0];
  const resto = ordenados.slice(1, 7);

  const fotoEstrella = estrella && estrella.fotos && estrella.fotos[0] ? estrella.fotos[0] : "";
  const datos = estrella
    ? [
        String(estrella.anio),
        estrella.km ? estrella.km.toLocaleString("es-CL") + " km" : "km por confirmar",
        estrella.ubicacion ?? "",
        "Ref " + estrella.codigo,
      ].filter(Boolean)
    : [];

  return (
    <section id="autos" className="vit">
      {/* Fondo liso: sin foto detrás para que los autos resalten. */}
      <div className="wrap">
        <Aparece>
          <h2 className="vit-titulo">Autos en exhibición</h2>
          <p className="sub">Nuestra vitrina: toca un auto para ver todas sus fotos y su descripción.</p>
        </Aparece>

        {estrella && (
          <Aparece retraso={80}>
            <article className="vit-estrella">
              <Link
                href={"/autos/" + estrella.codigo}
                className="vit-estrella-foto"
                aria-label={"Ver " + estrella.marca + " " + estrella.modelo}
              >
                {fotoEstrella ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgSrc(fotoEstrella, 828, 60)}
                    srcSet={imgSrcSet(fotoEstrella, 60)}
                    sizes="(max-width: 860px) 100vw, 640px"
                    alt={estrella.marca + " " + estrella.modelo}
                    decoding="async"
                    fetchPriority="low"
                  />
                ) : (
                  <div className="foto">Foto próximamente</div>
                )}
                <span className="vit-cinta">
                  {estrella.destacado ? "★ Destacado" : "Recién llegado"}
                </span>
                <span className="vit-brillo" aria-hidden="true" />
              </Link>

              <div className="vit-estrella-info">
                <h3>{estrella.marca} {estrella.modelo}</h3>
                <ul className="vit-datos">
                  {datos.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                {estrella.estado === "reservado" && <p className="det-reservado">RESERVADO</p>}
                <div className="vit-precio">{plata(estrella.precio)}</div>
                <div className="acc">
                  <Link className="btn fill" href={"/autos/" + estrella.codigo}>
                    Ver fotos y detalles
                  </Link>
                  <a
                    className="btn"
                    href={wa(
                      "Hola, me interesa el " + estrella.marca + " " + estrella.modelo + " " +
                        estrella.anio + " (Ref " + estrella.codigo + ")"
                    )}
                  >
                    Consultar por WhatsApp
                  </a>
                </div>
              </div>
            </article>
          </Aparece>
        )}

        <div className="vit-grid">
          {resto.map((x, i) => {
            const foto = x.fotos && x.fotos[0] ? x.fotos[0] : "";
            return (
              <Aparece key={x.id} retraso={(i % 4) * 90}>
                <article className="vit-card">
                  <Link href={"/autos/" + x.codigo} className="vit-foto" aria-label={"Ver " + x.marca + " " + x.modelo}>
                    {foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgSrc(foto, 640, 60)}
                        srcSet={imgSrcSet(foto, 60)}
                        sizes="(max-width: 760px) 92vw, 360px"
                        alt={x.marca + " " + x.modelo}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="foto">Foto próximamente</div>
                    )}
                    <span className="vit-precio-tag">{plata(x.precio)}</span>
                    {x.destacado && <span className="vit-estrellita" aria-label="Destacado">★</span>}
                    <span className="vit-brillo" aria-hidden="true" />
                  </Link>
                  <div className="vit-info">
                    <h3>
                      <Link href={"/autos/" + x.codigo}>{x.marca} {x.modelo}</Link>
                    </h3>
                    <p className="dat">
                      {x.anio} · {x.km ? x.km.toLocaleString("es-CL") + " km" : "km por confirmar"} · Ref {x.codigo}
                      {x.estado === "reservado" ? " · RESERVADO" : ""}
                    </p>
                    {x.ubicacion && (
                      <p className="ubic">
                        <Pin />
                        {x.ubicacion}
                      </p>
                    )}
                    <div className="vit-acc">
                      <Link className="btn" href={"/autos/" + x.codigo}>Ver fotos y detalles</Link>
                      <a
                        className="btn"
                        href={wa(
                          "Hola, me interesa el " + x.marca + " " + x.modelo + " " + x.anio + " (Ref " + x.codigo + ")"
                        )}
                      >
                        Consultar por WhatsApp
                      </a>
                    </div>
                  </div>
                </article>
              </Aparece>
            );
          })}
        </div>

        {!cargando && autos.length === 0 && (
          <p className="sub">Pronto publicaremos nuevos autos.</p>
        )}

        {autos.length > 0 && (
          <div className="vit-mas">
            <Link className="btn fill" href="/catalogo">
              Ver catálogo completo
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}