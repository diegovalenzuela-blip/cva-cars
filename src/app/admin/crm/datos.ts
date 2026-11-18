// Acceso a datos del CRM. Las pantallas no hablan directo con Supabase, así una
// integración futura puede reutilizar estas funciones sin tocar la interfaz.

import { supabase } from "@/lib/supabase";
import type {
  Actividad,
  AutoCRM,
  Canal,
  Cliente,
  DatosCliente,
  DatosOportunidad,
  Etapa,
  Oportunidad,
  TipoActividad,
} from "./tipos";

import type { BaseCRM, ClienteBase, ConsignacionBase, DocumentoBase, VehiculoBase } from "./importador/coincidencias";

export type ImportacionGuardada = {
  id: string;
  estado: "pendiente" | "confirmada" | "descartada";
  creado_en: string;
  confirmado_en: string | null;
  resultado: { creados?: Record<string, number>; actualizados?: Record<string, number> };
  mensajes: MensajeGuardado[];
};
export type MensajeGuardado = {
  id: string;
  importacion_id: string;
  orden: number;
  autor: string | null;
  enviado_texto: string | null;
  texto: string;
};
export type CambioCRM = {
  id: number;
  operacion: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  creado_en: string;
};

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
  if (e.message.startsWith("CRM: ")) throw new ErrorCRM(e.message.slice(5));
  if (e.message.includes("crm_consignaciones_vigente_unica")) throw new ErrorCRM("Este vehículo ya tiene una consignación vigente.");
  if (e.message.includes("crm_vehiculos_patente_unica")) throw new ErrorCRM("Esa patente ya está registrada.");
  if (e.code === "23505") throw new ErrorCRM("Ya existe un cliente con ese RUT, teléfono o correo.");
  if (e.code === "23503") throw new ErrorCRM("No se puede eliminar porque tiene vehículos o consignaciones asociados.");
  if (e.code === "23514") throw new ErrorCRM("Hay un dato con formato no válido. Revísalo e intenta de nuevo.");
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

export async function obtenerAutomotora() {
  const { data, error } = await supabase.from("perfiles").select("automotora_id").maybeSingle();
  if (error) fallar(error);
  return (data?.automotora_id as string | undefined) ?? null;
}

export async function cargarAutosCRM(automotoraId: string) {
  const autos: AutoCRM[] = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await supabase
      .from("autos")
      .select("id,codigo,marca,modelo,anio,precio,estado")
      .eq("automotora_id", automotoraId)
      .order("creado_en", { ascending: false })
      .order("id")
      .range(desde, desde + POR_PAGINA - 1);
    if (error) fallar(error);
    autos.push(...((data ?? []) as AutoCRM[]));
    if (!data || data.length < POR_PAGINA) return autos;
  }
}

export async function marcarAutoVendido(id: string, automotoraId: string) {
  const { error } = await supabase
    .from("autos")
    .update({ estado: "vendido", en_exhibicion: false })
    .eq("id", id)
    .eq("automotora_id", automotoraId);
  if (error) fallar(error);
}

export async function cargarCRM(automotoraId: string) {
  const [clientes, oportunidades] = await Promise.all([
    todas<Cliente>("crm_clientes", automotoraId),
    todas<Oportunidad>("crm_oportunidades", automotoraId),
  ]);
  return { clientes, oportunidades };
}

export async function cargarBaseImportacion(automotoraId: string): Promise<BaseCRM> {
  const [clientes, vehiculos, consignaciones] = await Promise.all([
    todas<ClienteBase>("crm_clientes", automotoraId),
    todas<VehiculoBase>("crm_vehiculos", automotoraId),
    todas<ConsignacionBase>("crm_consignaciones", automotoraId),
  ]);
  const documentos = await todas<DocumentoBase>("crm_vehiculo_documentos", automotoraId);
  return { clientes, vehiculos, consignaciones, documentos };
}

export async function confirmarImportacion(solicitud: object) {
  const { data, error } = await supabase.rpc("crm_confirmar_importacion", { p: solicitud });
  if (error) fallar(error);
  return data as { estado: string; creados: Record<string, number>; actualizados: Record<string, number> };
}

export async function listarImportaciones(automotoraId: string) {
  const { data, error } = await supabase
    .from("crm_importaciones")
    .select("id,estado,creado_en,confirmado_en,resultado")
    .eq("automotora_id", automotoraId)
    .order("creado_en", { ascending: false })
    .limit(20);
  if (error) fallar(error);
  const lista = (data ?? []) as Omit<ImportacionGuardada, "mensajes">[];
  if (!lista.length) return [] as ImportacionGuardada[];
  const { data: mensajes, error: errorMensajes } = await supabase
    .from("crm_importacion_mensajes")
    .select("id,importacion_id,orden,autor,enviado_texto,texto")
    .in("importacion_id", lista.map((i) => i.id))
    .order("orden");
  if (errorMensajes) fallar(errorMensajes);
  return lista.map((i) => ({
    ...i,
    mensajes: ((mensajes ?? []) as MensajeGuardado[]).filter((m) => m.importacion_id === i.id),
  }));
}

export async function borrarImportacion(id: string) {
  const { error } = await supabase.from("crm_importaciones").delete().eq("id", id);
  if (error) fallar(error);
}

export async function actualizarEstadoConsignacion(id: string, estado: string) {
  const { error } = await supabase.from("crm_consignaciones").update({ estado }).eq("id", id);
  if (error) fallar(error);
}

export async function listarCambiosRegistro(vehiculoId: string) {
  const { data, error } = await supabase
    .from("crm_cambios")
    .select("id,operacion,campo,valor_anterior,valor_nuevo,creado_en")
    .eq("vehiculo_id", vehiculoId)
    .order("creado_en", { ascending: false })
    .limit(100);
  if (error) fallar(error);
  return (data ?? []) as CambioCRM[];
}

export async function mensajesDeRegistro(registroId: string) {
  const { data, error } = await supabase
    .from("crm_importacion_campos")
    .select("mensaje_id")
    .eq("registro_id", registroId);
  if (error) fallar(error);
  const ids = [...new Set((data ?? []).map((c) => c.mensaje_id as string | null).filter((x): x is string => !!x))];
  if (!ids.length) return [] as MensajeGuardado[];
  const { data: mensajes, error: errorMensajes } = await supabase
    .from("crm_importacion_mensajes")
    .select("id,importacion_id,orden,autor,enviado_texto,texto")
    .in("id", ids);
  if (errorMensajes) fallar(errorMensajes);
  return (mensajes ?? []) as MensajeGuardado[];
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
