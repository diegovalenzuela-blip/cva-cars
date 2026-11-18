import type { MetadataRoute } from "next";
import { getAutosPublicos } from "@/lib/autos";

// Se regenera cada hora: así Google se entera de los autos nuevos y de los vendidos.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.chillanvendeautos.cl";
  const paginas = [
    "",
    "/catalogo",
    "/nosotros",
    "/contacto",
    "/consignacion",
    "/servicios",
  ];

  const fijas: MetadataRoute.Sitemap = paginas.map((pagina) => ({
    url: baseUrl + pagina,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: pagina === "" ? 1 : pagina === "/catalogo" ? 0.9 : 0.6,
  }));

  // Cada auto en venta con su foto principal, para que aparezca también en Google Imágenes.
  const autos = await getAutosPublicos();
  const fichas: MetadataRoute.Sitemap = autos.map((a) => ({
    url: baseUrl + "/autos/" + encodeURIComponent(a.codigo),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
    images: a.fotos.slice(0, 1),
  }));

  return [...fijas, ...fichas];
}
