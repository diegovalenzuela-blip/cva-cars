// Tipos, listas y utilidades del CRM. No dependen de React ni de Supabase.

export const ETAPAS = [
  { v: "nuevo", t: "Nuevo" },
  { v: "contactado", t: "Contactado" },
  { v: "visita", t: "Visita agendada" },
  { v: "negociacion", t: "Negociación" },
  { v: "vendido", t: "Vendido" },
  { v: "perdido", t: "Perdido" },
] as const;

export type Etapa = (typeof ETAPAS)[number]["v"];

export const CANALES = [
  { v: "whatsapp", t: "WhatsApp" },
  { v: "instagram", t: "Instagram" },
  { v: "facebook", t: "Facebook" },
  { v: "tiktok", t: "TikTok" },
  { v: "correo", t: "Correo" },
  { v: "web", t: "Página web" },
  { v: "llamada", t: "Llamada" },
  { v: "presencial", t: "En persona" },
  { v: "recomendacion", t: "Recomendación" },
  { v: "otro", t: "Otro" },
] as const;

export type Canal = (typeof CANALES)[number]["v"];

export const GESTIONES = [
  { v: "nota", t: "Nota" },
  { v: "llamada", t: "Llamada" },
  { v: "mensaje", t: "Mensaje" },
  { v: "visita", t: "Visita" },
] as const;

export type TipoActividad = (typeof GESTIONES)[number]["v"] | "etapa";

export const MOTIVOS_PERDIDA = [
  "Compró en otro lugar",
  "Precio",
  "No obtuvo financiamiento",
  "Dejó de responder",
  "Ya no busca vehículo",
  "El vehículo se vendió",
  "Otro",
];

export type Cliente = {
  id: string;
  automotora_id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  red_social: string | null;
  comuna: string | null;
  notas: string | null;
  creado_en: string;
};

export type Oportunidad = {
  id: string;
  automotora_id: string;
  cliente_id: string;
  auto_id: string | null;
  auto_resumen: string | null;
  interes: string | null;
  canal: Canal;
  presupuesto: number | null;
  etapa: Etapa;
  motivo_perdida: string | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  cerrado_en: string | null;
  creado_en: string;
};

export type Actividad = {
  id: string;
  cliente_id: string;
  oportunidad_id: string | null;
  tipo: TipoActividad;
  canal: Canal | null;
  contenido: string;
  creado_en: string;
};

export type AutoCRM = {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  anio: number;
  precio: number;
  estado: string;
};

export type DatosCliente = Pick<Cliente, "nombre" | "telefono" | "email" | "red_social" | "comuna" | "notas">;

export type DatosOportunidad = Pick<
  Oportunidad,
  "auto_id" | "auto_resumen" | "interes" | "canal" | "presupuesto" | "proxima_accion" | "proxima_fecha"
>;

export type BorradorCliente = {
  nombre: string;
  telefono: string;
  email: string;
  red_social: string;
  comuna: string;
  notas: string;
};

export type BorradorOportunidad = {
  auto_id: string;
  interes: string;
  canal: Canal;
  presupuesto: string;
  proxima_accion: string;
  proxima_fecha: string;
};

export const estaAbierta = (o: Pick<Oportunidad, "etapa">) => o.etapa !== "vendido" && o.etapa !== "perdido";
export const nombreEtapa = (e: Etapa) => ETAPAS.find((x) => x.v === e)?.t ?? e;
export const nombreCanal = (c: Canal | null) => CANALES.find((x) => x.v === c)?.t ?? "";
export const plata = (n: number) => "$" + n.toLocaleString("es-CL");
export const resumirAuto = (a: AutoCRM) => `${a.marca} ${a.modelo} ${a.anio} (${a.codigo})`;
export const vehiculoDe = (o: Oportunidad) => o.auto_resumen || o.interes || "Vehículo por definir";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Fecha de hoy según el reloj del usuario, en formato de base de datos. */
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

export function sumarDias(iso: string, dias: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(a, m - 1, d + dias);
  return `${f.getFullYear()}-${dosDigitos(f.getMonth() + 1)}-${dosDigitos(f.getDate())}`;
}

/** Convierte una fecha guardada a la fecha local del usuario (AAAA-MM-DD). */
export function fechaLocal(iso: string) {
  if (iso.length === 10) return iso;
  const d = new Date(iso);
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

export function fechaCorta(iso: string) {
  const [a, m, d] = fechaLocal(iso).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Deja el teléfono como +569XXXXXXXX. Devuelve null si no parece un número válido. */
export function normalizarTelefono(texto: string) {
  const limpio = texto.trim();
  let digitos = limpio.replace(/\D/g, "");
  if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (!limpio.startsWith("+") && !limpio.startsWith("00")) {
    if (digitos.length === 8) digitos = "569" + digitos;
    else if (digitos.length === 9) digitos = "56" + digitos;
  }
  return /^[0-9]{8,15}$/.test(digitos) && (digitos.length !== 11 || digitos.startsWith("56") || limpio.startsWith("+"))
    ? "+" + digitos
    : null;
}

export function enlaceWhatsApp(c: Cliente, o?: Oportunidad) {
  if (!c.telefono) return null;
  const nombre = c.nombre.trim().split(/\s+/)[0];
  const sobre = o?.auto_resumen ? ` por el ${o.auto_resumen}` : "";
  const texto = `Hola ${nombre}, te escribo de Chillán Vende Autos${sobre}.`;
  return "https://wa.me/" + c.telefono.slice(1) + "?text=" + encodeURIComponent(texto);
}

export const borradorCliente = (c?: Cliente): BorradorCliente => ({
  nombre: c?.nombre ?? "",
  telefono: c?.telefono ?? "",
  email: c?.email ?? "",
  red_social: c?.red_social ?? "",
  comuna: c?.comuna ?? "",
  notas: c?.notas ?? "",
});

export const borradorOportunidad = (o?: Oportunidad, fecha = ""): BorradorOportunidad => ({
  auto_id: o?.auto_id ?? "",
  interes: o?.interes ?? "",
  canal: o?.canal ?? "whatsapp",
  presupuesto: o?.presupuesto ? String(o.presupuesto) : "",
  proxima_accion: o?.proxima_accion ?? "",
  proxima_fecha: o ? (o.proxima_fecha ?? "") : fecha,
});

const opcional = (t: string) => t.trim() || null;

/** Valida el formulario. Devuelve los datos listos o el mensaje que debe ver el usuario. */
export function validarCliente(b: BorradorCliente): { datos: DatosCliente } | { error: string } {
  const telefono = b.telefono.trim() ? normalizarTelefono(b.telefono) : null;
  if (!b.nombre.trim()) return { error: "Escribe el nombre del cliente." };
  if (b.telefono.trim() && !telefono) return { error: "Revisa el teléfono. Ejemplo: 9 1234 5678." };
  const email = opcional(b.email)?.toLowerCase() ?? null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Revisa el correo." };
  const red_social = opcional(b.red_social);
  if (!telefono && !email && !red_social) return { error: "Agrega al menos un teléfono, correo o usuario de red social." };
  return { datos: { nombre: b.nombre.trim(), telefono, email, red_social, comuna: opcional(b.comuna), notas: opcional(b.notas) } };
}

export function aDatosOportunidad(b: BorradorOportunidad, autos: AutoCRM[], actual?: Oportunidad): DatosOportunidad {
  const auto = autos.find((a) => a.id === b.auto_id);
  const mismoAuto = actual && (actual.auto_id ?? "") === b.auto_id;
  const presupuesto = Number(b.presupuesto.replace(/\D/g, ""));
  return {
    auto_id: b.auto_id || null,
    auto_resumen: auto ? resumirAuto(auto) : mismoAuto ? actual.auto_resumen : null,
    interes: opcional(b.interes),
    canal: b.canal,
    presupuesto: presupuesto > 0 ? presupuesto : null,
    proxima_accion: opcional(b.proxima_accion),
    proxima_fecha: b.proxima_fecha || null,
  };
}

/** CSV para Excel en español. El apóstrofo evita que una celda se ejecute como fórmula. */
export function aCSV(filas: string[][]) {
  const celda = (c: string) => {
    const seguro = /^[=+\-@\t\r]/.test(c) ? "'" + c : c;
    return '"' + seguro.replace(/"/g, '""') + '"';
  };
  return "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
}
