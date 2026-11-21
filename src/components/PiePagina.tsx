"use client";

import "./pie.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { INSTAGRAM, FACEBOOK, TIKTOK } from "@/lib/datos";

// Pie de página de todo el sitio público. En el panel de administración no se muestra.
export default function PiePagina() {
  const ruta = usePathname();
  if (ruta.startsWith("/admin")) return null;

  return (
    <footer className="pie">
      <div className="wrap pie-grid">
        <div>
          <strong className="pie-marca">Chillán Vende Autos</strong>
          <p>Autos y camionetas usados en Chillán y la Región de Ñuble.</p>
        </div>
        <nav aria-label="Enlaces del sitio">
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/vehiculos-de-trabajo">Vehículos de trabajo</Link>
          <Link href="/consignacion">Vende tu auto</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
        <nav aria-label="Redes sociales">
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={FACEBOOK} target="_blank" rel="noopener noreferrer">Facebook</a>
          <a href={TIKTOK} target="_blank" rel="noopener noreferrer">TikTok</a>
        </nav>
      </div>
      <div className="wrap pie-final">
        <span>© Chillán Vende Autos</span>
        <span>
          Hecho por{" "}
          <a href="https://www.instagram.com/valenzueladiegou/" target="_blank" rel="noopener noreferrer">
            Diego Valenzuela
          </a>
        </span>
      </div>
    </footer>
  );
}
