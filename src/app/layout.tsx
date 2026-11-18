import type { Metadata } from "next";
import { Oswald, Archivo } from "next/font/google";
import "./globals.css";
import Menu from "@/components/Menu";
import WhatsAppFlotante from "@/components/WhatsAppFlotante";
import InstagramFlotante from "@/components/InstagramFlotante";
import TikTokFlotante from "@/components/TikTokFlotante";

const oswald = Oswald({ subsets: ["latin"], weight: ["500", "700"], display: "swap", variable: "--f-titulo" });
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "600"], display: "swap", variable: "--f-texto" });

export const metadata: Metadata = {
  title: "Chillán Vende Autos",
  description: "Autos y camionetas en Chillán, región de Ñuble. Compra y consignación.",
  metadataBase: new URL("https://www.chillanvendeautos.cl"),
  // Vista previa al compartir el link por WhatsApp, Facebook, etc.
  openGraph: {
    title: "Chillán Vende Autos",
    description: "Autos y camionetas en Chillán, región de Ñuble. Compra y consignación.",
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
        <Menu />
        {children}
        <InstagramFlotante />
        <TikTokFlotante />
        <WhatsAppFlotante />
      </body>
    </html>
  );
}
