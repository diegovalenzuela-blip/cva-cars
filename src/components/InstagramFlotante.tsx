"use client";

import { usePathname } from "next/navigation";
import { INSTAGRAM_PERSONAL } from "@/lib/datos";

export default function InstagramFlotante() {
  const pathname = usePathname();
  if (pathname !== "/servicios") return null;

  return (
    <a
      className="ig"
      href={INSTAGRAM_PERSONAL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir mi Instagram"
    >
      <span className="ig-etiqueta">Mi Instagram</span>
      <span className="ig-boton">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
    </a>
  );
}
