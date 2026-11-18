// Convierte la revisión aprobada en la solicitud que valida y guarda la base.

import { tipoDocumento, type BaseCRM, type CambioPropuesto } from "./coincidencias.ts";
import type { EntidadCampo } from "./extractor.ts";
import { cambiosDe, camposActivos, claveCambio, dueñoDistinto, valorDe, type BloqueRevision, type Revision } from "./revision.ts";

type Cambios = Record<string, { de: string | null; a: string }>;

const CAMPOS_CONSIGNACION = [
  "precio_solicitado", "precio_minimo", "comision_tipo", "comision_valor", "condiciones", "observaciones",
];

function aceptados(b: BloqueRevision, base: BaseCRM) {
  return cambiosDe(b, base).filter((c) => b.cambios_aceptados.includes(claveCambio(c)));
}

function agrupar(lista: CambioPropuesto[], entidad: EntidadCampo, id?: string | null) {
  const cambios: Cambios = {};
  for (const c of lista) {
    if (c.entidad === entidad && (!id || c.id === id)) cambios[c.campo] = { de: c.de, a: c.a };
  }
  return cambios;
}

function datosDe(b: BloqueRevision, entidad: EntidadCampo, campos: string[]) {
  return Object.fromEntries(campos.flatMap((c) => {
    const valor = valorDe(b, entidad, c);
    return valor === null ? [] : [[c, valor]];
  }));
}

function bloqueSolicitud(b: BloqueRevision, base: BaseCRM, posiciones: Map<number, number>) {
  const cambios = aceptados(b, base);
  const activos = camposActivos(b);
  const usaVehiculo = activos.some((c) => ["vehiculo", "consignacion", "documento"].includes(c.entidad));

  const cliente =
    b.cliente.modo === "crear"
      ? { accion: "crear", datos: datosDe(b, "cliente", ["nombre", "rut", "telefono", "email", "comuna"]) }
      : b.cliente.modo === "bloque"
        ? { accion: "bloque", bloque: posiciones.get(b.cliente.bloque!) }
        : { accion: "usar", id: b.cliente.id, cambios: agrupar(cambios, "cliente", b.cliente.id) };

  if (!usaVehiculo) return { cliente };

  const respaldoMensaje =
    b.relacion.estado === "respaldado" && !!b.relacion.fragmento && b.cliente.modo !== "bloque" &&
    !b.propietario_confirmado && !dueñoDistinto(b, base);
  const propietario = {
    propietario_origen: respaldoMensaje ? "mensaje" : "usuario",
    propietario_fragmento: respaldoMensaje ? b.relacion.fragmento : null,
  };

  const vehiculo =
    b.vehiculo.modo === "crear"
      ? { accion: "crear", ...propietario, datos: datosDe(b, "vehiculo", ["patente", "marca", "modelo", "version", "anio", "km"]) }
      : {
          accion: "usar", id: b.vehiculo.id, ...propietario,
          cambiar_propietario: b.cambiar_propietario,
          cambios: agrupar(cambios, "vehiculo", b.vehiculo.id),
        };

  const vigente = b.vehiculo.modo === "usar"
    ? base.consignaciones.find((c) => c.vehiculo_id === b.vehiculo.id && ["por_confirmar", "activa"].includes(c.estado))
    : undefined;
  const datosConsignacion = datosDe(b, "consignacion", [...CAMPOS_CONSIGNACION, "estado"]);
  const hayConsignacion = CAMPOS_CONSIGNACION.some((c) => datosConsignacion[c] !== undefined) || datosConsignacion.estado !== undefined;
  let consignacion: object = { accion: "ninguna" };
  if (vigente) {
    const propios = agrupar(cambios, "consignacion", vigente.id);
    if (Object.keys(propios).length) consignacion = { accion: "actualizar", id: vigente.id, cambios: propios };
  } else if (hayConsignacion) {
    consignacion = { accion: "crear", datos: b.hipotetico ? { ...datosConsignacion, estado: "por_confirmar" } : datosConsignacion };
  }

  const documentos = activos.flatMap<object>((c) => {
    if (c.entidad !== "documento" || c.campo.endsWith("_vence")) return [];
    const { tipo, nombre } = tipoDocumento(c.campo);
    const existente = b.vehiculo.modo === "usar"
      ? (base.documentos ?? []).find((d) => d.vehiculo_id === b.vehiculo.id && d.tipo === tipo && (tipo !== "otro" || d.nombre === nombre))
      : undefined;
    if (existente) {
      const propios = agrupar(cambios, "documento", existente.id);
      return Object.keys(propios).length ? [{ accion: "actualizar", id: existente.id, cambios: propios }] : [];
    }
    return [{
      accion: "crear",
      datos: { tipo, nombre, estado: c.valor, vence_en: valorDe(b, "documento", `${c.campo}_vence`) },
    }];
  });

  return { cliente, vehiculo, consignacion, documentos };
}

export function construirImportacion(
  revision: Revision,
  base: BaseCRM,
  importacionId: string,
  estado: "confirmada" | "pendiente" = "confirmada"
) {
  const incluidos = revision.bloques.filter((b) => !b.omitido);
  const posiciones = new Map(incluidos.map((b, i) => [b.indice, i]));
  return {
    importacion_id: importacionId,
    estado,
    mensajes: revision.mensajes,
    bloques: estado === "confirmada" ? incluidos.map((b) => bloqueSolicitud(b, base, posiciones)) : [],
    campos: incluidos.flatMap((b, bloque) =>
      b.campos.map((c) => ({
        bloque,
        mensaje_orden: c.mensaje_orden,
        entidad: c.entidad,
        campo: c.campo,
        valor_detectado: c.detectado,
        valor_final: c.decision === "rechazado" ? null : c.valor,
        estado: c.estado,
        decision: c.decision,
        inicio: c.inicio,
        fin: c.fin,
        fragmento: c.fragmento || null,
      }))
    ),
  };
}
