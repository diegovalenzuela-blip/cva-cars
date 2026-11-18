import type { Metadata } from "next";
import CatalogoCliente from "../catalogo/CatalogoCliente";
import { getAutosPublicos } from "@/lib/autos";
import { JsonLd, catalogoJson } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Vehículos de trabajo en Chillán | Chillán Vende Autos",
  description:
    "Camionetas, furgones y vehículos comerciales usados en Chillán y Ñuble: filtra por marca, modelo, año, precio y kilometraje.",
  alternates: { canonical: "/vehiculos-de-trabajo" },
};

export default async function VehiculosTrabajoPage() {
  const autos = await getAutosPublicos("trabajo");

  return (
    <>
      <JsonLd datos={catalogoJson(autos, "Vehículos de trabajo en venta en Chillán")} />
      <CatalogoCliente
        autosInicial={autos}
        titulo="Vehículos de trabajo"
        bajada="Camionetas, furgones y vehículos comerciales para tu negocio."
        filtrosAvanzados
        textoVacio="Estamos preparando nuevos vehículos de trabajo. Escríbenos y te contamos qué tenemos disponible."
      />
    </>
  );
}
