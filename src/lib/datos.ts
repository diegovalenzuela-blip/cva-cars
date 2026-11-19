export const SLUG = "chillan-vende-autos";
export const TEL = "56922328543"; // WhatsApp con código de país, sin + ni espacios
export const DIRECCION = "Chillán, Región de Ñuble";
export const HORARIO = "Coordinamos la atención por WhatsApp";
export const INSTAGRAM = "https://www.instagram.com/chillanvendeautos?exln=MW9iMDRpMjloZWc1aA==";
export const FACEBOOK = "https://www.facebook.com/share/1A3wS4eB7K/?mibextid=wwXIfr";
export const TIKTOK = "https://www.tiktok.com/@chillanvendeautos?_r=1&_t=ZS-9BOIMgDYvLC";
// Videos de la portada. "avance" es un clip corto y sin sonido que se reproduce solo;
// "codigo" enlaza el video con la ficha del auto que aparece en él (solo si está en venta).
export type VideoDato = { src: string; avance: string; poster: string; codigo?: string };
export const VIDEOS: VideoDato[] = [
  { src: "/videos/video1.mp4", avance: "/videos/video1-avance.mp4", poster: "/videos/video1.jpg" },
  { src: "/videos/video2.mp4", avance: "/videos/video2-avance.mp4", poster: "/videos/video2.jpg", codigo: "CV-0019" },
  { src: "/videos/video3.mp4", avance: "/videos/video3-avance.mp4", poster: "/videos/video3.jpg", codigo: "CV-0003" },
];

export function wa(texto: string) {
  return "https://wa.me/" + TEL + "?text=" + encodeURIComponent(texto);
}
export const INSTAGRAM_PERSONAL = "https://www.instagram.com/chillanvendeautos?exln=MW9iMDRpMjloZWc1aA==";
export const TIKTOK_PERSONAL = "https://www.tiktok.com/@chillanvendeautos?_r=1&_t=ZS-9BOIMgDYvLC";

