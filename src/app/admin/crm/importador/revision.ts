// Estado de la pantalla de revisión. Sin React, para poder probar sus reglas.

import { normalizarTelefono } from "../tipos.ts";
import {
  buscarCoincidencias,
  calcularCambios,
  nombresCompatibles,
  type BaseCRM,
  type CambioPropuesto,
  type ResultadoCoincidencia,
} from "./coincidencias.ts";
import type { BloqueExtraido, CampoExtraido, EntidadCampo, MensajeImportado, ResultadoExtraccion } from "./extractor.ts";
import { normalizarPatente, normalizarRut, patenteValida, rutValido } from "./reconocer.ts";

export type Decision = "sin_decision" | "aceptado" | "editado" | "rechazado";
export type CampoRevision = CampoExtraido & { id: string; detectado: string | null; decision: Decision };
export type ModoCliente = "crear" | "usar" | "bloque" | null;
export type ModoVehiculo = "crear" | "usar" | null;

export type BloqueRevision = {
  indice: number;
  mensaje_orden: number;
  tipo: BloqueExtraido["tipo"];
  hipotetico: boolean;
  omitido: boolean;
  campos: CampoRevision[];
  coincidencia: ResultadoCoincidencia;
  relacion: BloqueExtraido["propietario"];
  cliente: { modo: ModoCliente; id: string | null; bloque: number | null };
  vehiculo: { modo: ModoVehiculo; id: string | null };
  propietario_confirmado: boolean;
  cambiar_propietario: boolean;
  cambios_aceptados: string[];
};

export type Revision = { mensajes: MensajeImportado[]; bloques: BloqueRevision[]; fusionados: number };

export const ETIQUETAS: Record<string, string> = {
  "cliente.nombre": "Nombre", "cliente.rut": "RUT", "cliente.telefono": "Teléfono", "cliente.email": "Correo",
  "cliente.comuna": "Ciudad", "vehiculo.patente": "Patente", "vehiculo.marca": "Marca", "vehiculo.modelo": "Modelo",
  "vehiculo.version": "Versión", "vehiculo.anio": "Año", "vehiculo.km": "Kilometraje",
  "consignacion.estado": "Estado", "consignacion.precio_solicitado": "Precio solicitado",
  "consignacion.precio_minimo": "Precio mínimo", "consignacion.comision_tipo": "Tipo de comisión",
  "consignacion.comision_valor": "Comisión", "consignacion.condiciones": "Condiciones",
  "consignacion.observaciones": "Observaciones", "documento.revision_tecnica": "Revisión técnica",
  "documento.permiso_circulacion": "Permiso de circulación", "documento.soap": "SOAP",
};

export function etiquetaCampo(c: Pick<CampoExtraido, "entidad" | "campo">) {
  const directa = ETIQUETAS[`${c.entidad}.${c.campo}`];
  if (directa) return directa;
  if (c.entidad === "documento") {
    const vence = c.campo.endsWith("_vence");
    const base = c.campo.replace(/_vence$/, "");
    const nombre = base.startsWith("otro:") ? base.slice(5) : ETIQUETAS[`documento.${base}`] ?? base;
    return vence ? `${nombre}: vencimiento` : nombre;
  }
  return c.campo;
}

export const OPCIONES: Record<string, { v: string; t: string }[]> = {
  documento: [
    { v: "al_dia", t: "Al día" }, { v: "vencido", t: "Vencido" },
    { v: "pendiente", t: "Pendiente" }, { v: "no_informado", t: "No informado" },
  ],
  "consignacion.estado": [{ v: "por_confirmar", t: "Por confirmar" }, { v: "activa", t: "Activa" }],
  "consignacion.comision_tipo": [{ v: "porcentaje", t: "Porcentaje" }, { v: "monto", t: "Monto" }],
};

export const tipoControl = (c: Pick<CampoExtraido, "entidad" | "campo">) => {
  if (c.entidad === "documento") return c.campo.endsWith("_vence") ? "fecha" : "opciones";
  if (OPCIONES[`${c.entidad}.${c.campo}`]) return "opciones";
  if (["condiciones", "observaciones"].includes(c.campo)) return "area";
  if (["precio_solicitado", "precio_minimo", "comision_valor", "km", "anio"].includes(c.campo)) return "numero";
  return "texto";
};

/** Normaliza lo escrito por el usuario y explica el problema si no sirve. */
export function validarValor(c: Pick<CampoExtraido, "entidad" | "campo">, bruto: string): { valor: string | null; error?: string } {
  const texto = bruto.trim();
  if (!texto) return { valor: null };
  const clave = `${c.entidad}.${c.campo}`;
  if (clave === "cliente.rut") {
    const rut = normalizarRut(texto);
    return rut && rutValido(rut) ? { valor: rut } : { valor: texto, error: "RUT no válido." };
  }
  if (clave === "cliente.telefono") {
    const tel = normalizarTelefono(texto);
    return tel ? { valor: tel } : { valor: texto, error: "Teléfono no válido." };
  }
  if (clave === "cliente.email") {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(texto) ? { valor: texto.toLowerCase() } : { valor: texto, error: "Correo no válido." };
  }
  if (clave === "vehiculo.patente") {
    const p = normalizarPatente(texto);
    return patenteValida(p) ? { valor: p } : { valor: p, error: "Patente no válida." };
  }
  if (clave === "vehiculo.anio") {
    const n = Number(texto);
    return Number.isInteger(n) && n >= 1900 && n <= 2100 ? { valor: String(n) } : { valor: texto, error: "Año no válido." };
  }
  if (clave === "consignacion.comision_valor") {
    const n = Number(texto.replace(",", "."));
    return n > 0 ? { valor: String(n) } : { valor: texto, error: "Comisión no válida." };
  }
  if (["vehiculo.km", "consignacion.precio_solicitado", "consignacion.precio_minimo"].includes(clave)) {
    const n = Number(texto.replace(/\D/g, ""));
    return n > 0 ? { valor: String(n) } : { valor: texto, error: "Escribe solo el número." };
  }
  return { valor: texto };
}

export const errorCampo = (c: CampoRevision) =>
  c.decision === "rechazado" || c.valor === null ? undefined : validarValor(c, c.valor).error;

const aRevision = (c: CampoExtraido): CampoRevision => ({
  ...c, id: `${c.entidad}.${c.campo}`, detectado: c.valor, decision: "sin_decision",
});

function fusionar(destino: BloqueExtraido, origen: BloqueExtraido) {
  for (const c of origen.campos) {
    if (c.valor === null) continue;
    const previo = destino.campos.find((x) => x.entidad === c.entidad && x.campo === c.campo);
    if (!previo || previo.valor === null) {
      if (previo) destino.campos.splice(destino.campos.indexOf(previo), 1);
      destino.campos.push(c);
    } else if (previo.valor !== c.valor) {
      const nota = `Un mensaje posterior cambió este dato. Antes: ${previo.valor}.`;
      destino.campos.splice(destino.campos.indexOf(previo), 1, {
        ...c, estado: "por_confirmar", nota,
        alternativas: [{ valor: previo.valor, fragmento: previo.fragmento }],
      });
    }
  }
}

export function crearRevision(r: ResultadoExtraccion, base: BaseCRM): Revision {
  const copia: BloqueExtraido[] = r.bloques.map((b) => ({ ...b, campos: b.campos.map((c) => ({ ...c })) }));
  const quitados = new Set<number>();
  for (const b of copia) {
    if (b.actualiza_bloque === null) continue;
    let destino = b.actualiza_bloque;
    while (quitados.has(destino)) destino = copia[destino].actualiza_bloque ?? destino;
    fusionar(copia[destino], b);
    quitados.add(b.indice);
  }
  const visibles = copia.filter((b) => !quitados.has(b.indice));
  const posicion = new Map(visibles.map((b, i) => [b.indice, i]));

  const bloques = visibles.map((b, indice): BloqueRevision => {
    const coincidencia = buscarCoincidencias(b, base);
    const { cliente: cc, vehiculo: cv } = coincidencia;
    // Un único vehículo probable se muestra elegido; sus cambios siguen pidiendo confirmación.
    const vehiculoId = cv.sugerido ?? (cv.candidatos.length === 1 ? cv.candidatos[0].id : null);
    const dueno = base.vehiculos.find((v) => v.id === vehiculoId)?.cliente_id ?? null;
    const clienteId = cc.sugerido ?? (!cc.ambiguo && cc.candidatos.length === 1 && cc.candidatos[0].id === dueno ? dueno : null);
    const clienteModo: ModoCliente = clienteId ? "usar" : cc.candidatos.length ? null : "crear";
    const hayVehiculo = b.campos.some((c) => c.entidad === "vehiculo" && c.valor !== null);
    const posible = b.propietario.posible_bloque;
    return {
      indice,
      mensaje_orden: b.mensaje_orden,
      tipo: b.tipo,
      hipotetico: b.hipotetico,
      omitido: false,
      campos: b.campos.map(aRevision).map((c) => {
        // Lo que ya coincide con la ficha elegida no necesita otra confirmación.
        const vehiculo = base.vehiculos.find((v) => v.id === vehiculoId);
        const cliente = base.clientes.find((x) => x.id === clienteId);
        const igual =
          (c.entidad === "vehiculo" && c.valor !== null && String(vehiculo?.[c.campo as keyof typeof vehiculo] ?? "") === c.valor) ||
          (c.id === "cliente.nombre" && c.valor !== null && !!cliente && nombresCompatibles(c.valor, cliente.nombre));
        return igual && c.estado === "por_confirmar" ? { ...c, decision: "aceptado" as const } : c;
      }),
      coincidencia,
      relacion: {
        ...b.propietario,
        posible_bloque: posible === null ? null : posicion.get(posible) ?? null,
      },
      cliente: { modo: clienteModo, id: clienteId, bloque: null },
      vehiculo: {
        modo: vehiculoId ? "usar" : cv.candidatos.length ? null : hayVehiculo ? "crear" : null,
        id: vehiculoId,
      },
      propietario_confirmado: false,
      cambiar_propietario: false,
      cambios_aceptados: [],
    };
  });
  return { mensajes: r.mensajes, bloques, fusionados: quitados.size };
}

export const claveCambio = (c: CambioPropuesto) => `${c.entidad}.${c.id}.${c.campo}`;

export const camposActivos = (b: Pick<BloqueRevision, "campos">) =>
  b.campos.filter((c) => c.decision !== "rechazado" && c.valor !== null);

export const valorDe = (b: Pick<BloqueRevision, "campos">, entidad: EntidadCampo, campo: string) =>
  camposActivos(b).find((c) => c.entidad === entidad && c.campo === campo)?.valor ?? null;

export const cambiosDe = (b: BloqueRevision, base: BaseCRM) =>
  calcularCambios({ campos: camposActivos(b) }, base, b.cliente.modo === "usar" ? b.cliente.id : null, b.vehiculo.modo === "usar" ? b.vehiculo.id : null);

/** El vehículo elegido pertenece a otra ficha que la seleccionada. */
export function dueñoDistinto(b: BloqueRevision, base: BaseCRM) {
  if (b.vehiculo.modo !== "usar" || !b.vehiculo.id) return false;
  const v = base.vehiculos.find((x) => x.id === b.vehiculo.id);
  if (!v) return false;
  return b.cliente.modo !== "usar" || b.cliente.id !== v.cliente_id;
}

export function necesitaConfirmarPropietario(b: BloqueRevision, base: BaseCRM) {
  if (b.vehiculo.modo === "usar" && !dueñoDistinto(b, base)) return false;
  return b.vehiculo.modo !== null;
}

/** Motivos que impiden guardar. Vacío significa que el bloque está listo. */
export function problemasBloque(b: BloqueRevision, base: BaseCRM) {
  if (b.omitido) return [];
  const p: string[] = [];
  const activos = camposActivos(b);
  const usaVehiculo = activos.some((c) => ["vehiculo", "consignacion", "documento"].includes(c.entidad));

  if (b.cliente.modo === null) p.push("Elige un cliente o crea uno nuevo.");
  if (b.cliente.modo === "usar" && !b.cliente.id) p.push("Selecciona el cliente.");
  if (b.cliente.modo === "bloque" && b.cliente.bloque === null) p.push("Selecciona el propietario.");
  if (b.cliente.modo === "crear") {
    if (!valorDe(b, "cliente", "nombre")) p.push("Falta el nombre del cliente.");
    if (!["telefono", "rut", "email"].some((c) => valorDe(b, "cliente", c))) p.push("Agrega teléfono, RUT o correo.");
  }

  if (usaVehiculo) {
    if (b.vehiculo.modo === null) p.push("Elige un vehículo o crea uno nuevo.");
    if (b.vehiculo.modo === "usar" && !b.vehiculo.id) p.push("Selecciona el vehículo.");
    if (b.vehiculo.modo === "crear" && !valorDe(b, "vehiculo", "patente")) p.push("Falta la patente.");
    if (dueñoDistinto(b, base) && !b.cambiar_propietario) p.push("Confirma el cambio de propietario o elige a su dueño actual.");
    const conRespaldo = b.relacion.estado === "respaldado" && !!b.relacion.fragmento && b.cliente.modo !== "bloque" && !b.cambiar_propietario;
    if (necesitaConfirmarPropietario(b, base) && !conRespaldo && !b.propietario_confirmado) {
      p.push("Confirma quién es el propietario.");
    }
  }

  if (activos.some((c) => errorCampo(c))) p.push("Corrige los datos marcados.");
  const dudas = activos.filter((c) => c.estado === "por_confirmar" && c.decision === "sin_decision").length;
  if (dudas) p.push(dudas === 1 ? "Revisa 1 dato por confirmar." : `Revisa ${dudas} datos por confirmar.`);
  return p;
}
