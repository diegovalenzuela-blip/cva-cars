import type { Metadata } from "next";
import ConsignacionPagina from "@/components/ConsignacionPagina";

export const metadata: Metadata = {
  title: "Consignación | Chillán Vende Autos",
  description: "Deja tu auto en consignación: lo publicamos, lo mostramos y atendemos a los interesados.",
};

export default function Page() {
  return <ConsignacionPagina />;
}
