import type { Metadata } from "next";
import CatalogoCliente from "./CatalogoCliente";
import { getAutosPublicos } from "@/lib/autos";
import { JsonLd, catalogoJson } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Catálogo de autos y camionetas usados en Chillán | Chillán Vende Autos",
  description:
    "Todos nuestros autos y camionetas usados en venta en Chillán y Ñuble: filtra por marca, tipo y precio. Fotos reales y precio claro.",
  alternates: { canonical: "/catalogo" },
};

export default async function CatalogoPage() {
  const autos = await getAutosPublicos("general");

  return (
    <>
      <JsonLd datos={catalogoJson(autos)} />
      <CatalogoCliente autosInicial={autos} />
    </>
  );
}
