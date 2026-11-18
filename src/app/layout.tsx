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
