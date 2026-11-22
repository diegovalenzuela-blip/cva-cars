"use client";

import "./destacados.css";
import Link from "next/link";
import { wa } from "@/lib/datos";
import { imgSrc, imgSrcSet } from "@/lib/img";
import Aparece from "./Aparece";
import CompartirAuto from "./CompartirAuto";

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
          <Aparece retraso={80} className="vit-foco">
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
                <div className="vit-precio-fila">
                  <div className="vit-precio">{plata(estrella.precio)}</div>
                  <CompartirAuto
                    variante="chico"
                    codigo={estrella.codigo}
                    titulo={estrella.marca + " " + estrella.modelo + " " + estrella.anio}
                  />
                </div>
                <div className="acc vit-estrella-acc">
                  <Link
                    className="btn fill"
                    href={"/autos/" + estrella.codigo}
                    aria-label={"Ver fotos y detalles de " + estrella.marca + " " + estrella.modelo}
                  >
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
                  <Link href={"/autos/" + x.codigo} className="vit-foto" tabIndex={-1} aria-hidden="true">
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
                  <CompartirAuto codigo={x.codigo} titulo={x.marca + " " + x.modelo + " " + x.anio} />
                  <div className="vit-info">
                    <h3>
                      {/* Toda la tarjeta lleva a la ficha (el enlace se estira sobre ella). */}
                      <Link className="vit-enlace" href={"/autos/" + x.codigo}>{x.marca} {x.modelo}</Link>
                    </h3>
                    <p className="dat">
                      {x.anio} · {x.km ? x.km.toLocaleString("es-CL") + " km" : "km por confirmar"} · <span className="vit-ref">Ref {x.codigo}</span>
                      {x.estado === "reservado" ? " · RESERVADO" : ""}
                    </p>
                    {x.ubicacion && (
                      <p className="ubic">
                        <Pin />
                        {x.ubicacion}
                      </p>
                    )}
                    <div className="vit-acc">
                      <a
                        className="vit-wsp"
                        href={wa(
                          "Hola, me interesa el " + x.marca + " " + x.modelo + " " + x.anio + " (Ref " + x.codigo + ")"
                        )}
                        aria-label={"Consultar por WhatsApp por el " + x.marca + " " + x.modelo}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3z" /></svg>
                        Consultar
                      </a>
                      <span className="vit-ver" aria-hidden="true">Ver ficha →</span>
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