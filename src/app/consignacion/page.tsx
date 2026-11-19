import type { Metadata } from "next";
import ConsignacionPagina from "@/components/ConsignacionPagina";
import { getFotosFondo } from "@/lib/autos";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/consignacion" },
  title: "Consignación de autos en Chillán | Chillán Vende Autos",
  description: "Deja tu auto en consignación: lo publicamos, lo mostramos y atendemos a los interesados.",
};

export default async function Page() {
  const fotos = await getFotosFondo(6);
  return <ConsignacionPagina fotos={fotos} />;
}
