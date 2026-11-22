"use client";

import "./compartir.css";
import { useEffect, useId, useRef, useState } from "react";
import { SITIO } from "@/lib/seo";

type Props = {
  codigo: string;
  // Nombre visible del auto, por ejemplo "Ford F-150 2020". Solo datos públicos.
  titulo: string;
  // "icono": botón redondo sobre la foto de la tarjeta. "chico": el mismo botón
  // redondo, en línea (junto al precio). "boton": botón con texto (ficha).
  variante?: "icono" | "chico" | "boton";
};

// Enlace público de la ficha del auto. Siempre el dominio oficial, para que el
// enlace compartido funcione aunque se comparta desde otra dirección.
export const enlaceAuto = (codigo: string) => SITIO + "/autos/" + encodeURIComponent(codigo);
export const textoAuto = (titulo: string) => titulo + " en Chillán Vende Autos";
export const enlaceWhatsApp = (codigo: string, titulo: string) =>
  "https://wa.me/?text=" + encodeURIComponent(textoAuto(titulo) + " " + enlaceAuto(codigo));

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Navegadores sin portapapeles moderno.
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function CompartirAuto({ codigo, titulo, variante = "icono" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [nativo, setNativo] = useState(false);
  const [aviso, setAviso] = useState("");
  const caja = useRef<HTMLDivElement>(null);
  const idMenu = useId();
  const url = enlaceAuto(codigo);

  // El menú nativo solo se conoce en el navegador (no en el servidor).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende del navegador
    setNativo(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  useEffect(() => {
    if (!aviso) return;
    const id = window.setTimeout(() => setAviso(""), 3000);
    return () => window.clearTimeout(id);
  }, [aviso]);

  async function copiarEnlace(mensaje = "Enlace copiado") {
    setAbierto(false);
    setAviso((await copiar(url)) ? mensaje : "No se pudo copiar. Mantén presionado el enlace: " + url);
  }

  async function menuNativo() {
    setAbierto(false);
    try {
      await navigator.share({ title: titulo, text: textoAuto(titulo), url });
    } catch (e) {
      // Si la persona cierra el menú no pasa nada; si falla, queda copiar.
      if ((e as Error)?.name !== "AbortError") await copiarEnlace();
    }
  }

  // Instagram no permite publicar enlaces desde una página: se usa el menú del
  // teléfono (donde aparece Instagram si está instalado) o se copia el enlace.
  function instagram() {
    if (nativo) menuNativo();
    else copiarEnlace("Enlace copiado. Pégalo en tu historia o mensaje de Instagram");
  }

  return (
    <div
      className={"cmp " + (variante === "icono" ? "cmp-sobre-foto" : variante === "chico" ? "cmp-en-linea" : "cmp-en-ficha")}
      ref={caja}
    >
      <button
        type="button"
        className={variante === "boton" ? "btn cmp-boton" : "cmp-icono"}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        aria-label={variante === "boton" ? undefined : "Compartir " + titulo}
        onClick={() => setAbierto((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {variante === "boton" && <span>Compartir</span>}
      </button>
      {abierto && (
        <div className="cmp-menu" role="menu" id={idMenu}>
          <a role="menuitem" href={enlaceWhatsApp(codigo, titulo)} target="_blank" rel="noopener noreferrer" onClick={() => setAbierto(false)}>
            WhatsApp
          </a>
          <button type="button" role="menuitem" onClick={instagram}>Instagram</button>
          <button type="button" role="menuitem" onClick={() => copiarEnlace()}>Copiar enlace</button>
          {nativo && <button type="button" role="menuitem" onClick={menuNativo}>Más opciones…</button>}
        </div>
      )}
      <span className="cmp-aviso" role="status" aria-live="polite">{aviso}</span>
    </div>
  );
}
