import type { Metadata } from "next";
import ContactoPagina from "@/components/ContactoPagina";
import { getFotosFondo } from "@/lib/autos";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/contacto" },
  title: "Contacto | Chillán Vende Autos",
  description: "Escríbenos por WhatsApp o llámanos y coordinamos tu atención en Chillán.",
};

export default async function Page() {
  const fotos = await getFotosFondo(6);
  return <ContactoPagina fotos={fotos} />;
}
