// Fotos de Supabase pasadas por el optimizador de Next (/_next/image):
// el teléfono recibe una versión del tamaño justo en WebP, no la foto completa.
const ANCHOS = [384, 640, 828, 1080];
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function origen(): string {
  try {
    return new URL(BASE).origin;
  } catch {
    return "";
  }
}

function sePuedeOptimizar(url: string): boolean {
  const o = origen();
  return !!o && url.startsWith(o + "/");
}

export function imgSrc(url: string, ancho = 640, calidad = 60): string {
  if (!sePuedeOptimizar(url)) return url;
  return "/_next/image?url=" + encodeURIComponent(url) + "&w=" + ancho + "&q=" + calidad;
}

export function imgSrcSet(url: string, calidad = 60): string | undefined {
  if (!sePuedeOptimizar(url)) return undefined;
  return ANCHOS.map((w) => imgSrc(url, w, calidad) + " " + w + "w").join(", ");
}

// Para usar dentro de style={{ backgroundImage }}. Siempre devuelve una url(...)
// segura: nada que venga de la base de datos puede cerrar las comillas y meter CSS.
export function fondoCss(url: string, ancho = 828, calidad = 45): string {
  const u = imgSrc(url, ancho, calidad);
  return 'url("' + u.replace(/["\\\n\r()]/g, (c) => encodeURIComponent(c)) + '")';
}
