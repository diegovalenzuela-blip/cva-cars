"use client";

import { usePathname } from "next/navigation";
import { TIKTOK_PERSONAL } from "@/lib/datos";

export default function TikTokFlotante() {
  const pathname = usePathname();
  if (pathname !== "/servicios") return null;

  return (
    <a
      className="tt"
      href={TIKTOK_PERSONAL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir mi TikTok"
    >
      <span className="tt-etiqueta">Mi TikTok</span>
      <span className="tt-boton">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
      </span>
    </a>
  );
}
