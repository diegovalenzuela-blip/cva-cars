// Revisa las fotos elegidas en el panel antes de agregarlas al formulario.

type ArchivoFoto = Pick<File, "name" | "type">;

const EXTENSION_HEIC = /\.(heic|heif)$/i;
const TIPO_HEIC = /^image\/hei[cf](-sequence)?$/i;

export const esHeic = (f: ArchivoFoto) => TIPO_HEIC.test(f.type) || EXTENSION_HEIC.test(f.name);
export const esImagenAdmitida = (f: ArchivoFoto) => f.type.startsWith("image/") || esHeic(f);

/** Extensión de los formatos que el panel puede subir. */
export const extensionFoto = (tipo: string) =>
  tipo === "image/webp" ? "webp" : tipo === "image/jpeg" ? "jpg" : null;

/** Comprueba que este navegador pueda mostrar y procesar la foto. */
export async function puedeAbrirse(file: Blob) {
  try {
    const imagen = await createImageBitmap(file);
    imagen.close();
    return true;
  } catch {
    return false;
  }
}

/** Achica la foto antes de subirla. Usa WebP y, si el navegador no puede, JPG. */
export async function reducirFoto(file: File, maximo = 1280): Promise<Blob> {
  const imagen = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const escala = Math.min(1, maximo / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    const contexto = lienzo.getContext("2d");
    if (!contexto) throw new Error("No se pudo procesar la foto");
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const generar = (tipo: string, calidad: number) =>
      new Promise<Blob>((ok, fallo) =>
        lienzo.toBlob((b) => (b ? ok(b) : fallo(new Error("No se pudo procesar la foto"))), tipo, calidad)
      );
    // Safari no genera WebP: en ese caso la foto se sube como JPG.
    let blob = await generar("image/webp", 0.8);
    if (!extensionFoto(blob.type)) blob = await generar("image/jpeg", 0.85);
    if (!extensionFoto(blob.type)) throw new Error("Este navegador no pudo preparar la foto");
    return blob;
  } finally {
    imagen.close();
  }
}
