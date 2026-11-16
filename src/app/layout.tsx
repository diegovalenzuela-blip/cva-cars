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
