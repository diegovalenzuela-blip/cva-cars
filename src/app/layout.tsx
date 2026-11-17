import type { Metadata } from "next";
import "./globals.css";
import Menu from "@/components/Menu";
import WhatsAppFlotante from "@/components/WhatsAppFlotante";
import InstagramFlotante from "@/components/InstagramFlotante";
import TikTokFlotante from "@/components/TikTokFlotante";

export const metadata: Metadata = {
  title: "Chillán Vende Autos",
  description: "Autos y camionetas en Chillán, región de Ñuble. Compra y consignación.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Archivo:wght@400;600&display=swap"
        />
      </head>
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
