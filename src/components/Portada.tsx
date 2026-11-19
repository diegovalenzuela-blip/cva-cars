"use client";

import "./destacados.css";
import "./portada.css";
import Image from "next/image";
import Link from "next/link";
import { wa } from "@/lib/datos";
import type { FotoFondo } from "@/lib/autos";
import { imgSrc, imgSrcSet } from "@/lib/img";
import FondoPortada from "./FondoPortada";

// Tiempo entre fotos de fondo, en milisegundos (4500 = 4,5 segundos)
const INTERVALO = 4500;

const PALABRAS = ["Tu", "próximo", "auto", "está", "en", "Chillán"];

const PRESUPUESTOS = [5_000_000, 10_000_000, 15_000_000, 20_000_000, 30_000_000];

export type AutoPortada = {
  codigo: string;
  nombre: string;
  detalle: string;
  precio: number;
  foto: string;
  reservado: boolean;
  etiqueta: string;
};

export type DatosPortada = { tipos: string[] };

const plata = (n: number) => "$" + n.toLocaleString("es-CL");

export default function Portada({
  fotos,
  destacado,
  datos,
}: {
  fotos: FotoFondo[];
  destacado: AutoPortada | null;
  datos: DatosPortada;
}) {
  return (
    <div className="por-sec">
      <FondoPortada fotos={fotos} intervalo={INTERVALO} />
      <div className="wrap">
        <header className="hero por">
          <div className="por-texto">
            <h1 className="por-titulo">
              {PALABRAS.map((p, i) => (
                <span
                  key={p + i}
                  className={"pal" + (p === "Chillán" ? " rojo" : "")}
                  style={{ animationDelay: i * 0.06 + "s" }}
                >
                  {p}
                </span>
              ))}
            </h1>
            <span className="por-linea" aria-hidden="true" />
            <p>
              Camionetas y autos revisados, con ficha clara y trato directo.
              Escríbenos y lo vemos en persona.
            </p>
            <div className="acc">
              <a className="btn fill" href="#autos">Autos en exhibición</a>
              <a className="btn" href={wa("Hola, vi la página de Chillán Vende Autos y quiero consultar.")}>
                Hablar por WhatsApp
              </a>
              <Link className="btn" href="/catalogo">Catálogo</Link>
            </div>

            {/* Buscador rápido: lleva al catálogo con el filtro ya puesto. Funciona sin JavaScript. */}
            <form className="por-busca" action="/catalogo" method="get">
              <label>
                <span>¿Qué buscas?</span>
                <select name="tipo" defaultValue="">
                  <option value="">Todos los tipos</option>
                  {datos.tipos.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Presupuesto</span>
                <select name="max" defaultValue="">
                  <option value="">Sin límite</option>
                  {PRESUPUESTOS.map((p) => (
                    <option key={p} value={p}>Hasta {plata(p)}</option>
                  ))}
                </select>
              </label>
              <button className="btn fill" type="submit">Buscar</button>
            </form>
          </div>

          {destacado ? (
            <Link className="por-auto" href={"/autos/" + destacado.codigo}>
              <span className="por-auto-foto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc(destacado.foto, 828, 60)}
                  srcSet={imgSrcSet(destacado.foto, 60)}
                  sizes="(max-width: 760px) 92vw, 460px"
                  alt={destacado.nombre}
                  fetchPriority="high"
                  decoding="async"
                />
                <span className="por-auto-tag">{destacado.reservado ? "Reservado" : destacado.etiqueta}</span>
              </span>
              <span className="por-auto-info">
                <strong>{destacado.nombre}</strong>
                <span className="por-auto-dat">{destacado.detalle}</span>
                <span className="por-auto-pie">
                  <span className="por-auto-precio">{plata(destacado.precio)}</span>
                  <span className="por-auto-ver">Ver ficha →</span>
                </span>
              </span>
            </Link>
          ) : (
            <div className="por-logo">
              <Image
                className="por-img"
                src="/logo.jpg"
                alt="Logo de Chillán Vende Autos: camioneta roja clásica frente a las montañas"
                width={520}
                height={520}
                sizes="(max-width: 760px) 218px, 520px"
                quality={60}
                loading="eager"
              />
            </div>
          )}
        </header>
      </div>
    </div>
  );
}
