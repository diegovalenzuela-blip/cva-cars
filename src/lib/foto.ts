import { getImageProps } from "next/image";

/**
 * Atributos src/srcSet/sizes para una foto de auto, servida por el optimizador
 * de Next en el tamaño justo para cada pantalla (en vez de la original de 960×1280).
 * `sizes` dice qué ancho ocupa la foto en pantalla, por ejemplo "(max-width: 760px) 90vw, 320px".
 */
export function foto(src: string, sizes: string) {
  const { props } = getImageProps({ src, alt: "", width: 960, height: 1280, sizes });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}

/**
 * URL optimizada de una foto usada como fondo (va oscurecida detrás del contenido,
 * así que basta una versión mediana y liviana).
 */
export function fondo(src: string) {
  if (!src) return src;
  return "/_next/image?url=" + encodeURIComponent(src) + "&w=828&q=75";
}
