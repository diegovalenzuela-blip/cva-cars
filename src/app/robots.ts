import type { MetadataRoute } from "next";

// Le dice a Google qué puede revisar (todo menos el panel de administración)
// y dónde está la lista de páginas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin"] },
    sitemap: "https://www.chillanvendeautos.cl/sitemap.xml",
    host: "https://www.chillanvendeautos.cl",
  };
}
