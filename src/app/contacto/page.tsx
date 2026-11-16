import type { Metadata } from "next";
import ContactoPagina from "@/components/ContactoPagina";

export const metadata: Metadata = {
  title: "Contacto | Chillán Vende Autos",
  description: "Escríbenos por WhatsApp, llámanos o visítanos en Chillán.",
};

export default function Page() {
  return <ContactoPagina />;
}
