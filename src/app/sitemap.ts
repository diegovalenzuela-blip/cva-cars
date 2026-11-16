import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://" + "chillanvendeautos.cl";
  const paginas = [
    "",
    "/catalogo",
    "/nosotros",
    "/contacto",
    "/consignacion",
    "/servicios",
  ];

  return paginas.map((pagina) => ({
    url: baseUrl + pagina,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: pagina === "" ? 1 : 0.8,
  }));
}
