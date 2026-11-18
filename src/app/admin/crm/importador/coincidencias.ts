// Compara lo extraído con la base. Solo propone: la decisión siempre es del usuario.

import type { BloqueExtraido, EntidadCampo } from "./extractor.ts";
import { plegar } from "./reconocer.ts";

export type ClienteBase = { id: string; nombre: string; rut: string | null; telefono: string | null; email: string | null };
export type VehiculoBase = {
  id: string;
  cliente_id: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
  version: string | null;
  anio: number | null;
  km: number | null;
};
export type ConsignacionBase = {
  id: string;
  vehiculo_id: string;
  propietario_id: string;
  estado: string;
  precio_solicitado: number | null;
  precio_minimo: number | null;
  comision_tipo: string | null;
  comision_valor: number | null;
};
export type BaseCRM = { clientes: ClienteBase[]; vehiculos: VehiculoBase[]; consignaciones: ConsignacionBase[] };

export type Candidato = { id: string; motivo: string; confianza: "exacta" | "probable" };
export type Propuesta = {
  candidatos: Candidato[];
  sugerido: string | null;
  ambiguo: boolean;
};
export type CambioPropuesto = {
  entidad: EntidadCampo;
  id: string;
  campo: string;
  de: string | null;
  a: string;
};
export type ResultadoCoincidencia = {
  cliente: Propuesta;
  vehiculo: Propuesta;
  consignacion: string | null;
  propietario_distinto: boolean;
  cambios: CambioPropuesto[];
  avisos: string[];
};

const agregar = (lista: Candidato[], c: Candidato) => {
  const previo = lista.find((x) => x.id === c.id);
  if (!previo) lista.push(c);
  else if (!previo.motivo.includes(c.motivo)) {
    previo.motivo += ` y ${c.motivo}`;
    if (c.confianza === "exacta") previo.confianza = "exacta";
  }
};

export function nombresCompatibles(a: string, b: string) {
  const x = plegar(a).split(/\s+/).filter(Boolean);
  const y = plegar(b).split(/\s+/).filter(Boolean);
  if (!x.length || !y.length) return false;
  const [corto, largo] = x.length <= y.length ? [x, y] : [y, x];
  return corto.every((p) => largo.includes(p));
}

function decidir(candidatos: Candidato[]): Propuesta {
  const exactos = candidatos.filter((c) => c.confianza === "exacta");
  if (exactos.length === 1) return { candidatos, sugerido: exactos[0].id, ambiguo: false };
  if (exactos.length > 1) return { candidatos, sugerido: null, ambiguo: true };
  return { candidatos, sugerido: null, ambiguo: candidatos.length > 1 };
}

/** Compara lo revisado con los registros elegidos, sin modificar nada. */
export function calcularCambios(
  b: { campos: { entidad: EntidadCampo; campo: string; valor: string | null }[] },
  base: BaseCRM,
  clienteId: string | null,
  vehiculoId: string | null
) {
  const dato = (entidad: EntidadCampo, campo: string) =>
    b.campos.find((c) => c.entidad === entidad && c.campo === campo)?.valor ?? null;
  const cambios: CambioPropuesto[] = [];
  const comparar = (entidad: EntidadCampo, id: string, campo: string, actual: unknown) => {
    const nuevo = dato(entidad, campo);
    if (nuevo === null) return;
    const de = actual === null || actual === undefined ? null : String(actual);
    if (de !== nuevo) cambios.push({ entidad, id, campo, de, a: nuevo });
  };
  const cliente = base.clientes.find((c) => c.id === clienteId);
  if (cliente) {
    comparar("cliente", cliente.id, "rut", cliente.rut);
    comparar("cliente", cliente.id, "telefono", cliente.telefono);
    comparar("cliente", cliente.id, "email", cliente.email);
    const nombre = dato("cliente", "nombre");
    if (nombre && nombre.split(" ").length > cliente.nombre.split(" ").length) {
      comparar("cliente", cliente.id, "nombre", cliente.nombre);
    }
  }
  const vehiculo = base.vehiculos.find((v) => v.id === vehiculoId);
  if (vehiculo) {
    for (const campo of ["marca", "modelo", "version", "anio", "km"] as const) comparar("vehiculo", vehiculo.id, campo, vehiculo[campo]);
    const vigente = base.consignaciones.find((c) => c.vehiculo_id === vehiculo.id && ["por_confirmar", "activa"].includes(c.estado));
    if (vigente) {
      for (const campo of ["precio_solicitado", "precio_minimo", "comision_tipo", "comision_valor"] as const) {
        comparar("consignacion", vigente.id, campo, vigente[campo]);
      }
    }
  }
  return cambios;
}

export function buscarCoincidencias(b: BloqueExtraido, base: BaseCRM): ResultadoCoincidencia {
  const dato = (entidad: EntidadCampo, campo: string) =>
    b.campos.find((c) => c.entidad === entidad && c.campo === campo)?.valor ?? null;
  const avisos: string[] = [];

  const patente = dato("vehiculo", "patente");
  const modelo = dato("vehiculo", "modelo");
  const anio = dato("vehiculo", "anio");
  const rut = dato("cliente", "rut");
  const telefono = dato("cliente", "telefono");
  const email = dato("cliente", "email")?.toLowerCase() ?? null;
  const nombre = dato("cliente", "nombre");

  // Cliente: primero RUT y teléfono; el nombre por sí solo nunca se preselecciona.
  const clientes: Candidato[] = [];
  let conflictoCliente = false;
  for (const c of base.clientes) {
    if (rut && c.rut === rut) agregar(clientes, { id: c.id, motivo: "mismo RUT", confianza: "exacta" });
    if (telefono && c.telefono === telefono) agregar(clientes, { id: c.id, motivo: "mismo teléfono", confianza: "exacta" });
    if (email && c.email?.toLowerCase() === email) agregar(clientes, { id: c.id, motivo: "mismo correo", confianza: "exacta" });
  }
  for (const c of clientes) {
    const f = base.clientes.find((x) => x.id === c.id)!;
    if (rut && f.rut && f.rut !== rut) {
      c.confianza = "probable";
      conflictoCliente = true;
      avisos.push(`${f.nombre} tiene otro RUT registrado.`);
    }
  }
  if (nombre) {
    for (const c of base.clientes) {
      if (nombresCompatibles(nombre, c.nombre)) agregar(clientes, { id: c.id, motivo: "nombre parecido", confianza: "probable" });
    }
  }

  // Vehículo: primero patente; modelo y dueño solo como coincidencia secundaria.
  const vehiculos: Candidato[] = [];
  if (patente) {
    for (const v of base.vehiculos) {
      if (v.patente === patente) agregar(vehiculos, { id: v.id, motivo: "misma patente", confianza: "exacta" });
    }
  }
  if (!vehiculos.length && modelo) {
    const clientesPosibles = new Set(clientes.map((c) => c.id));
    for (const v of base.vehiculos) {
      if (!v.modelo || plegar(v.modelo) !== plegar(modelo)) continue;
      if (patente && v.patente !== patente) continue;
      if (anio && v.anio && String(v.anio) !== anio) continue;
      if (clientesPosibles.has(v.cliente_id)) {
        agregar(vehiculos, { id: v.id, motivo: "mismo modelo y cliente parecido", confianza: "probable" });
      } else if (!nombre && !rut && !telefono && anio) {
        agregar(vehiculos, { id: v.id, motivo: "mismo modelo y año", confianza: "probable" });
      }
    }
  }

  const vehiculo = decidir(vehiculos);
  // Una sola opción probable se muestra primero, pero sigue requiriendo confirmación.
  const elegido = vehiculo.sugerido ?? (vehiculos.length === 1 ? vehiculos[0].id : null);
  const fila = base.vehiculos.find((v) => v.id === elegido) ?? null;

  if (fila) {
    const dueno = base.clientes.find((c) => c.id === fila.cliente_id);
    if (dueno) agregar(clientes, { id: dueno.id, motivo: "dueño del vehículo", confianza: vehiculo.sugerido ? "exacta" : "probable" });
  }

  const cliente = decidir(clientes);
  const propietarioDistinto =
    !!fila && (
      (!!cliente.sugerido && cliente.sugerido !== fila.cliente_id) ||
      (!!nombre && !!base.clientes.find((c) => c.id === fila.cliente_id) &&
        !nombresCompatibles(nombre, base.clientes.find((c) => c.id === fila.cliente_id)!.nombre))
    );
  if (propietarioDistinto) avisos.push("El mensaje no coincide con el propietario registrado de este vehículo.");
  if (propietarioDistinto || conflictoCliente) {
    cliente.sugerido = null;
    cliente.ambiguo = true;
  }
  if (cliente.ambiguo) avisos.push("Hay más de un cliente posible.");
  if (vehiculo.ambiguo || (!vehiculo.sugerido && vehiculos.length > 1)) avisos.push("Hay más de un vehículo posible.");

  const vigente = fila
    ? base.consignaciones.find((c) => c.vehiculo_id === fila.id && ["por_confirmar", "activa"].includes(c.estado)) ?? null
    : null;

  const clienteId = propietarioDistinto ? null : cliente.sugerido ?? (clientes.length === 1 ? clientes[0].id : null);
  const cambios = calcularCambios(b, base, clienteId, fila?.id ?? null);

  return { cliente, vehiculo, consignacion: vigente?.id ?? null, propietario_distinto: propietarioDistinto, cambios, avisos };
}
