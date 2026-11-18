// Revisa las fotos elegidas en el panel antes de agregarlas al formulario.

type ArchivoFoto = Pick<File, "name" | "type">;

const EXTENSION_HEIC = /\.(heic|heif)$/i;
const TIPO_HEIC = /^image\/hei[cf](-sequence)?$/i;

export const esHeic = (f: ArchivoFoto) => TIPO_HEIC.test(f.type) || EXTENSION_HEIC.test(f.name);
export const esImagenAdmitida = (f: ArchivoFoto) => f.type.startsWith("image/") || esHeic(f);

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
