import type { Metadata } from "next";
import { Oswald, Archivo } from "next/font/google";
import "./globals.css";
import Menu from "@/components/Menu";
import WhatsAppFlotante from "@/components/WhatsAppFlotante";
import InstagramFlotante from "@/components/InstagramFlotante";
import TikTokFlotante from "@/components/TikTokFlotante";
import { JsonLd, automotora } from "@/lib/seo";
import Suscripcion from "@/components/Suscripcion";
import PiePagina from "@/components/PiePagina";

const oswald = Oswald({ subsets: ["latin"], weight: ["500", "700"], display: "swap", variable: "--f-titulo" });
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "600"], display: "swap", variable: "--f-texto" });

// Título y descripción con lo que la gente busca en Google: "autos usados Chillán",
// "camionetas en venta Ñuble", "consignación de autos".
const TITULO = "Autos y camionetas usados en Chillán | Chillán Vende Autos";
const DESCRIPCION =
  "Compra y venta de autos y camionetas usados en Chillán, región de Ñuble. Vehículos revisados, fotos reales y precio claro. Consignamos tu auto. Escríbenos por WhatsApp.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  keywords: [
    "autos usados Chillán",
    "camionetas usadas Chillán",
    "venta de autos Ñuble",
    "automotora Chillán",
    "consignación de autos Chillán",
    "autos en venta Chillán",
  ],
  metadataBase: new URL("https://www.chillanvendeautos.cl"),
  robots: { index: true, follow: true },
  // Prueba de que la página es nuestra para Google Search Console. No borrar:
  // si se quita, Google deja de mostrar los datos de búsqueda.
  verification: { google: "Y2aGTzYc-mFUFdYR9PudKnKCHzFyjKwM61uC8G8fKbA" },
  // Vista previa al compartir el link por WhatsApp, Facebook, etc.
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: "/",
    siteName: "Chillán Vende Autos",
    locale: "es_CL",
    type: "website",
    images: [{ url: "/logo.jpg", width: 1024, height: 1024, alt: "Chillán Vende Autos" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={oswald.variable + " " + archivo.variable}>
      <body>
        <JsonLd datos={automotora} />
        <Menu />
        {children}
        <PiePagina />
        <InstagramFlotante />
        <TikTokFlotante />
        <WhatsAppFlotante />
        <Suscripcion />
      </body>
    </html>
  );
}
