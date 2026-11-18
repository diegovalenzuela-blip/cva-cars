// Acceso a datos del CRM. Las pantallas no hablan directo con Supabase, así una
// integración futura puede reutilizar estas funciones sin tocar la interfaz.

import { supabase } from "@/lib/supabase";
import type {
  Actividad,
  Canal,
  Cliente,
  DatosCliente,
  DatosOportunidad,
  Etapa,
  Oportunidad,
  TipoActividad,
} from "./tipos";

const POR_PAGINA = 1000;

export class ErrorCRM extends Error {
  constructor(
    mensaje: string,
    readonly sinActivar = false
  ) {
    super(mensaje);
  }
}

function fallar(e: { code?: string; message: string }): never {
  if (e.code === "42P01" || e.code === "PGRST205") {
    throw new ErrorCRM("El CRM todavía no está activado en la base de datos.", true);
  }
  if (e.code === "23505") throw new ErrorCRM("Ya existe un cliente con ese teléfono o correo.");
  if (e.code === "42501") throw new ErrorCRM("Tu usuario no tiene permiso para hacer esto.");
  throw new ErrorCRM("No se pudo completar la acción: " + e.message);
}

async function todas<T>(tabla: string, automotoraId: string) {
  const filas: T[] = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await supabase
      .from(tabla)
      .select("*")
      .eq("automotora_id", automotoraId)
      .order("creado_en", { ascending: false })
      .order("id")
      .range(desde, desde + POR_PAGINA - 1);
    if (error) fallar(error);
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < POR_PAGINA) return filas;
  }
}

export async function cargarCRM(automotoraId: string) {
  const [clientes, oportunidades] = await Promise.all([
    todas<Cliente>("crm_clientes", automotoraId),
    todas<Oportunidad>("crm_oportunidades", automotoraId),
  ]);
  return { clientes, oportunidades };
}

export async function crearCliente(automotoraId: string, datos: DatosCliente) {
  const { data, error } = await supabase
    .from("crm_clientes")
    .insert({ ...datos, automotora_id: automotoraId })
    .select("*")
    .single();
  if (error) fallar(error);
  return data as Cliente;
}

export async function actualizarCliente(id: string, datos: DatosCliente) {
  const { error } = await supabase.from("crm_clientes").update(datos).eq("id", id);
  if (error) fallar(error);
}

export async function borrarCliente(id: string) {
  const { error } = await supabase.from("crm_clientes").delete().eq("id", id);
  if (error) fallar(error);
}

export async function crearOportunidad(automotoraId: string, clienteId: string, datos: DatosOportunidad) {
  const { data, error } = await supabase
    .from("crm_oportunidades")
    .insert({ ...datos, automotora_id: automotoraId, cliente_id: clienteId })
    .select("*")
    .single();
  if (error) fallar(error);
  return data as Oportunidad;
}

export async function actualizarOportunidad(
  id: string,
  datos: Partial<DatosOportunidad> & { etapa?: Etapa; motivo_perdida?: string | null }
) {
  const { error } = await supabase.from("crm_oportunidades").update(datos).eq("id", id);
  if (error) fallar(error);
}

export async function borrarOportunidad(id: string) {
  const { error } = await supabase.from("crm_oportunidades").delete().eq("id", id);
  if (error) fallar(error);
}

export async function listarActividades(clienteId: string) {
  const { data, error } = await supabase
    .from("crm_actividades")
    .select("id,cliente_id,oportunidad_id,tipo,canal,contenido,creado_en")
    .eq("cliente_id", clienteId)
    .order("creado_en", { ascending: false })
    .limit(200);
  if (error) fallar(error);
  return (data ?? []) as Actividad[];
}

export async function crearActividad(
  automotoraId: string,
  datos: {
    cliente_id: string;
    oportunidad_id: string | null;
    tipo: TipoActividad;
    canal: Canal | null;
    contenido: string;
  }
) {
  const { error } = await supabase.from("crm_actividades").insert({ ...datos, automotora_id: automotoraId });
  if (error) fallar(error);
}
