import { FACEBOOK, INSTAGRAM, TEL, TIKTOK } from "@/lib/datos";
import type { AutoDetalle, AutoPublico } from "@/lib/autos";

// Datos para que Google entienda la página (datos estructurados de schema.org).
// Los ve el buscador, no la persona: sirven para resultados con precio, fotos y
// ubicación, y para que Google Ads tenga mejor información de cada auto.

export const SITIO = "https://www.chillanvendeautos.cl";
export const NOMBRE = "Chillán Vende Autos";

// Sin dirección exacta todavía: solo ciudad y región (no se publican datos a medias).
const direccion = {
  "@type": "PostalAddress",
  addressLocality: "Chillán",
  addressRegion: "Ñuble",
  addressCountry: "CL",
};

export const automotora = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  "@id": SITIO + "/#automotora",
  name: NOMBRE,
  url: SITIO,
  logo: SITIO + "/logo.jpg",
  image: SITIO + "/logo.jpg",
  telephone: "+" + TEL,
  address: direccion,
  areaServed: [
    { "@type": "City", name: "Chillán" },
    { "@type": "AdministrativeArea", name: "Región de Ñuble" },
  ],
  priceRange: "$$",
  sameAs: [INSTAGRAM, FACEBOOK, TIKTOK].map((u) => u.split("?")[0]),
};

function urlAuto(codigo: string) {
  return SITIO + "/autos/" + encodeURIComponent(codigo);
}

function oferta(a: AutoPublico) {
  return {
    "@type": "Offer",
    price: a.precio,
    priceCurrency: "CLP",
    availability:
      a.estado === "reservado" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
    itemCondition: "https://schema.org/UsedCondition",
    url: urlAuto(a.codigo),
    seller: { "@id": SITIO + "/#automotora" },
  };
}

export function autoJson(a: AutoDetalle) {
  const nombre = [a.marca, a.modelo, a.version, a.anio].filter(Boolean).join(" ");
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: nombre,
    url: urlAuto(a.codigo),
    sku: a.codigo,
    brand: { "@type": "Brand", name: a.marca },
    model: a.modelo,
    vehicleModelDate: String(a.anio),
    ...(a.km ? { mileageFromOdometer: { "@type": "QuantitativeValue", value: a.km, unitCode: "KMT" } } : {}),
    ...(a.combustible ? { fuelType: a.combustible } : {}),
    ...(a.transmision ? { vehicleTransmission: a.transmision } : {}),
    ...(a.color ? { color: a.color } : {}),
    ...(a.tipo ? { bodyType: a.tipo } : {}),
    ...(a.descripcion ? { description: a.descripcion.slice(0, 500) } : {}),
    image: a.fotos.slice(0, 6),
    itemCondition: "https://schema.org/UsedCondition",
    offers: oferta(a),
  };
}

export function catalogoJson(autos: AutoPublico[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Autos y camionetas en venta en Chillán",
    numberOfItems: autos.length,
    itemListElement: autos.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: urlAuto(a.codigo),
      name: a.marca + " " + a.modelo + " " + a.anio,
    })),
  };
}

// Inserta el JSON en la página. "<" se escapa para que ningún texto de la base
// de datos pueda cerrar la etiqueta <script>.
export function JsonLd({ datos }: { datos: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
    />
  );
}
