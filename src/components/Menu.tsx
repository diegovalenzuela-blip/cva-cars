"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { wa } from "@/lib/datos";

const LINKS = [
  { href: "/", t: "Inicio" },
  { href: "/catalogo", t: "Catálogo completo" },
  { href: "/consignacion", t: "Consignación" },
  { href: "/nosotros", t: "Quiénes somos" },
  { href: "/contacto", t: "Contacto" },
];

export default function Menu() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <nav className="topbar" aria-label="Principal">
        <Link href="/" className="topbar-logo">Chillán Vende Autos</Link>
        <button
          className="topbar-btn"
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
          aria-controls="menu-panel"
          aria-label="Abrir menú"
        >
          <span /><span /><span />
        </button>
      </nav>
      {abierto && (
        <div className="menu-fondo" onClick={() => setAbierto(false)}>
          <div id="menu-panel" className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <button className="menu-x" onClick={() => setAbierto(false)} aria-label="Cerrar menú">×</button>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={"menu-link" + (pathname === l.href ? " on" : "")}
                onClick={() => setAbierto(false)}
              >
                {l.t}
              </Link>
            ))}
            <a className="btn fill" href={wa("Hola, quiero consultar por un auto.")}>
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
