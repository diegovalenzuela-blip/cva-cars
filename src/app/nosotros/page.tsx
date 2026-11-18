import type { Metadata } from "next";
import NosotrosCliente from "./NosotrosCliente";
import { getAutosExhibicion } from "@/lib/autos";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Quiénes somos | Chillán Vende Autos",
  description: "Automotora de la región de Ñuble: venta y consignación de autos y camionetas.",
};

export default async function Page() {
  const autos = await getAutosExhibicion();
  const fotos = autos.flatMap((a) => (a.fotos[0] ? [a.fotos[0]] : [])).slice(0, 5);
  return <NosotrosCliente fotosFondo={fotos} />;
}
