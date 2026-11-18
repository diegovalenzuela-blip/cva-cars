// Validación compartida por el formulario público y su ruta de servidor.

import { normalizarTelefono } from "../app/admin/crm/tipos.ts";
import { normalizarPatente, patenteValida } from "../app/admin/crm/importador/reconocer.ts";

export const MAX_FOTOS_EVALUACION = 10;

export type BorradorEvaluacion = {
  nombre: string;
  telefono: string;
  email: string;
  comuna: string;
  marca: string;
  modelo: string;
  version: string;
  anio: string;
  km: string;
  patente: string;
  precio_esperado: string;
  observaciones: string;
};

export type DatosEvaluacion = {
  nombre: string;
  telefono: string;
  email: string | null;
  comuna: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number;
  km: number;
  patente: string | null;
  precio_esperado: number | null;
  observaciones: string | null;
};

export const BORRADOR_EVALUACION: BorradorEvaluacion = {
  nombre: "", telefono: "", email: "", comuna: "", marca: "", modelo: "", version: "",
  anio: "", km: "", patente: "", precio_esperado: "", observaciones: "",
};

const opcional = (t: string) => t.trim() || null;
const entero = (t: string) => {
  const limpio = t.replace(/\D/g, "");
  return limpio ? Number(limpio) : null;
};

export function validarEvaluacion(b: BorradorEvaluacion, hoy = new Date()) {
  const errores: Partial<Record<keyof BorradorEvaluacion, string>> = {};
  const telefono = normalizarTelefono(b.telefono);
  const email = opcional(b.email)?.toLowerCase() ?? null;
  const anio = entero(b.anio);
  const km = entero(b.km);
  const precio = entero(b.precio_esperado);
  const patente = opcional(b.patente) ? normalizarPatente(b.patente) : null;

  if (b.nombre.trim().length < 3 || b.nombre.trim().length > 120) errores.nombre = "Escribe tu nombre completo.";
  if (!telefono) errores.telefono = "Escribe un número válido. Ejemplo: 9 1234 5678.";
  if (email && (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) errores.email = "Revisa tu correo.";
  if (b.comuna.trim().length < 2 || b.comuna.trim().length > 80) errores.comuna = "Indica tu ciudad o comuna.";
  if (!b.marca.trim() || b.marca.trim().length > 60) errores.marca = "Indica la marca.";
  if (!b.modelo.trim() || b.modelo.trim().length > 80) errores.modelo = "Indica el modelo.";
  if (b.version.trim().length > 120) errores.version = "La versión es demasiado larga.";
  if (!anio || anio < 1950 || anio > hoy.getFullYear() + 1) errores.anio = "Revisa el año.";
  if (km === null || km > 3_000_000) errores.km = "Indica el kilometraje.";
  if (patente && !patenteValida(patente)) errores.patente = "Revisa la patente. Ejemplo: ABCD12.";
  if (b.precio_esperado.trim() && (!precio || precio > 10_000_000_000)) errores.precio_esperado = "Revisa el precio.";
  if (b.observaciones.trim().length > 2000) errores.observaciones = "Usa hasta 2.000 caracteres.";

  if (Object.keys(errores).length) return { errores };
  const datos: DatosEvaluacion = {
    nombre: b.nombre.trim(),
    telefono: telefono!,
    email,
    comuna: b.comuna.trim(),
    marca: b.marca.trim(),
    modelo: b.modelo.trim(),
    version: opcional(b.version),
    anio: anio!,
    km: km!,
    patente,
    precio_esperado: precio,
    observaciones: opcional(b.observaciones),
  };
  return { datos };
}
