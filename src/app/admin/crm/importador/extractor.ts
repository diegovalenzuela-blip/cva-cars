// Extractor determinista de mensajes de WhatsApp. No usa servicios externos.
// Regla central: si un dato no está claro, queda por confirmar; nunca se inventa.

import { normalizarTelefono } from "../tipos.ts";
import {
  COMUNAS_PATRON,
  distancia,
  interpretarDinero,
  MARCAS,
  MARCAS_PATRON,
  MODELOS,
  normalizarPatente,
  normalizarRut,
  patenteValida,
  plegar,
  rutValido,
  titulo,
} from "./reconocer.ts";

export type EstadoCampo = "detectado" | "pendiente" | "por_confirmar";
export type EntidadCampo = "cliente" | "vehiculo" | "consignacion" | "documento";

export type MensajeImportado = {
  orden: number;
  autor: string | null;
  enviado_texto: string | null;
  texto: string;
};

export type CampoExtraido = {
  entidad: EntidadCampo;
  campo: string;
  valor: string | null;
  estado: EstadoCampo;
  mensaje_orden: number | null;
  inicio: number | null;
  fin: number | null;
  fragmento: string;
  nota?: string;
  alternativas?: { valor: string; fragmento: string }[];
};

export type RelacionPropietario = {
  estado: "respaldado" | "por_confirmar" | "sin_datos";
  fragmento: string | null;
  posible_bloque: number | null;
};

export type BloqueExtraido = {
  indice: number;
  mensaje_orden: number;
  tipo: "nuevo" | "actualizacion";
  hipotetico: boolean;
  actualiza_bloque: number | null;
  propietario: RelacionPropietario;
  campos: CampoExtraido[];
};

export type ResultadoExtraccion = { mensajes: MensajeImportado[]; bloques: BloqueExtraido[] };

type Tramo = { texto: string; plano: string; inicio: number; orden: number };
type Ocupado = [number, number][];

const INVISIBLES = /[‎‏‪-‮⁦-⁩﻿]/g;
const CABECERA =
  /^\[?(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?\s?m\.?)?)\]?\s*(?:-\s*)?([^:\n]{1,60}):\s?(.*)$/i;
const HIPOTESIS =
  /\b(podria|podrian|quizas?|tal vez|a lo mejor|capaz que|posiblemente|si es que|estaria dispuest[oa]|esta pensando|pensando en|evaluando|evalua|quiere saber|ver si|me interesaria|seria|quiere dejar|quiere consignar|quisiera|si)\b/;
const ACTUALIZACION =
  /\b(finalmente|al final|ahora|bajo a|bajo el precio|subio a|subio el precio|rebajo|cambio a|cambio el precio|nuevo precio|actualiza|actualizacion|quedo en|queda en|lo dejo en|la dejo en)\b/;
const CONSIGNACION_FIRME = /\b(dejo|deja|quedo|entrego|trajo|firmo)\b.{0,24}\bconsign|\bconsignad[oa]\b/;
const TERCERO = /\b(comprador|compradora|interesad[oa]|quiere comprar|ofrece|ofrecen|oferta)\b/;
const SALUDO = /^(?:(?:hola|buenas|buenos dias|saludos|gracias)\b.{0,24}|ok|okay|dale|listo|si|no|ya|bien)[\s!.]*$/;
const ABREVIATURA = /\b(sr|sra|srta|dr|dra|don|av|tel|cel|n)$/;
const PARADA =
  new Set("tiene telefono fono cel celular whatsapp wsp rut patente ppu placa ano modelo precio pide vende valor quedo queda finalmente y con en por es su la el los las un una lo al del correo mail km kms de para que tambien".split(" "));

// Palabras frecuentes que se parecen a modelos y no deben corregirse.
const COMUNES = new Set(
  "vence vencio venta vendo vende valor marca color total monto cuota cuotas plazo auto autos carro camioneta camion moto dueno duena nombre correo fotos llaves papel papeles precio minimo comision motor bencina diesel full buena bueno nueva nuevo usado usada dejar quedo queda envio envia hermano hermana amigo amiga socio senor senora ciudad comuna tiene tengo llamo llamar mando manda".split(" ")
);

const DOCUMENTOS: [string, RegExp][] = [
  ["revision_tecnica", /\b(revision tecnica|rev\.? tecnica|revision|\brt\b)/],
  ["permiso_circulacion", /\b(permiso de circulacion|permiso circulacion|permiso|circulacion al dia)\b/],
  ["soap", /\b(soap|seguro obligatorio)\b/],
  ["otro:Padrón", /\bpadron\b/],
  ["otro:Certificado de anotaciones", /\b(certificado de anotaciones|anotaciones vigentes)\b/],
  ["otro:Multas", /\bmultas?\b/],
  ["otro:Prenda", /\bprenda\b/],
  ["otro:Factura", /\bfactura\b/],
];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const dos = (n: number) => String(n).padStart(2, "0");
const ultimoDia = (a: number, m: number) => new Date(a, m, 0).getDate();
const anioLargo = (a: number) => (a < 100 ? 2000 + a : a);

export function separarMensajes(entrada: string): MensajeImportado[] {
  const texto = entrada.replace(INVISIBLES, "").replace(/ | /g, " ").replace(/\r\n?/g, "\n").trim();
  if (!texto) return [];
  const salida: Omit<MensajeImportado, "orden">[] = [];
  let conCabecera = false;
  for (const linea of texto.split("\n")) {
    const c = linea.match(CABECERA);
    if (c) {
      conCabecera = true;
      salida.push({ autor: c[3].trim(), enviado_texto: `${c[1]} ${c[2]}`, texto: c[4] });
    } else if (conCabecera) {
      salida[salida.length - 1].texto += "\n" + linea;
    }
  }
  const lista = conCabecera
    ? salida
    : texto.split(/\n\s*\n/).map((t) => ({ autor: null, enviado_texto: null, texto: t }));
  return lista
    .map((m) => ({ ...m, texto: m.texto.trim() }))
    .filter((m) => m.texto)
    .map((m, orden) => ({ orden, ...m }));
}

function tramos(m: MensajeImportado): Tramo[] {
  const plano = plegar(m.texto);
  const cortes = /\n+|;|(?<=[\p{L}\d)])\.\s+|,\s+|\s+y\s+(?=(?:el|la|un|una|su|otr[oa]|tambien)\b)|\s+tambien\s+/gu;
  const lista: Tramo[] = [];
  let desde = 0;
  const agregar = (hasta: number) => {
    const bruto = m.texto.slice(desde, hasta);
    const inicio = desde + (bruto.length - bruto.trimStart().length);
    const texto = bruto.trim();
    if (texto) lista.push({ texto, plano: plano.slice(inicio, inicio + texto.length), inicio, orden: m.orden });
  };
  for (const c of plano.matchAll(cortes)) {
    // No corta números como "17, 5" ni "17,5".
    if (c[0].startsWith(",") && /\d$/.test(plano.slice(0, c.index)) && /^\d/.test(plano.slice(c.index + c[0].length))) continue;
    if (c[0].startsWith(".")) {
      const sigue = m.texto[c.index + c[0].length] ?? "";
      if (!/[\p{Lu}\d]/u.test(sigue) || ABREVIATURA.test(plano.slice(0, c.index))) continue;
    }
    agregar(c.index);
    desde = c.index + c[0].length;
  }
  agregar(m.texto.length);
  return lista;
}

class Constructor {
  bloques: BloqueExtraido[] = [];
  actual: BloqueExtraido | null = null;
  hoy: Date;

  constructor(hoy: Date) {
    this.hoy = hoy;
  }

  nuevo(orden: number) {
    const b: BloqueExtraido = {
      indice: this.bloques.length,
      mensaje_orden: orden,
      tipo: "nuevo",
      hipotetico: false,
      actualiza_bloque: null,
      propietario: { estado: "sin_datos", fragmento: null, posible_bloque: null },
      campos: [],
    };
    this.bloques.push(b);
    this.actual = b;
    return b;
  }

  valor(b: BloqueExtraido | null, entidad: EntidadCampo, campo: string) {
    return b?.campos.find((c) => c.entidad === entidad && c.campo === campo)?.valor ?? null;
  }

  agregar(
    b: BloqueExtraido,
    t: Tramo,
    entidad: EntidadCampo,
    campo: string,
    valor: string,
    desde: number,
    hasta: number,
    estado: EstadoCampo = "detectado",
    nota?: string,
    acumular = false
  ) {
    const fragmento = t.texto.slice(0, 200);
    const nuevo: CampoExtraido = {
      entidad, campo, valor, estado, mensaje_orden: t.orden,
      inicio: t.inicio + desde, fin: t.inicio + hasta, fragmento, ...(nota ? { nota } : {}),
    };
    const previo = b.campos.find((c) => c.entidad === entidad && c.campo === campo);
    if (!previo) {
      b.campos.push(nuevo);
    } else if (acumular) {
      if (!previo.valor?.includes(valor)) previo.valor = `${previo.valor}. ${valor}`.slice(0, 2000);
    } else if (previo.valor !== valor) {
      previo.estado = "por_confirmar";
      previo.nota = "El mensaje trae datos distintos para este campo.";
      previo.alternativas = [...(previo.alternativas ?? []), { valor, fragmento }];
    }
  }
}

const libre = (o: Ocupado, a: number, b: number) => o.every(([x, y]) => b <= x || a >= y);

function* coincidencias(t: Tramo, patron: RegExp, ocupado: Ocupado, base: string = t.plano) {
  for (const m of base.matchAll(patron)) {
    const a = m.index;
    const b = a + m[0].length;
    if (!libre(ocupado, a, b)) continue;
    yield { m, a, b };
  }
}

type VehiculoVisto = { marca: string | null; modelo: string | null; a: number; b: number; dudoso: boolean; nota?: string };

function buscarVehiculos(t: Tramo, ocupado: Ocupado): VehiculoVisto[] {
  const vistos: VehiculoVisto[] = [];
  const marcas = MARCAS_PATRON.flatMap(({ marca, patron }) => {
    const m = t.plano.match(patron);
    return m?.index !== undefined && libre(ocupado, m.index, m.index + m[0].length)
      ? [{ marca, a: m.index, b: m.index + m[0].length }]
      : [];
  }).filter((x, i, l) => !l.some((y, j) => j !== i && y.a <= x.a && y.b >= x.b && y.b - y.a > x.b - x.a));

  for (const x of marcas) {
    const despues = t.plano.slice(x.b, x.b + 26);
    const propio = MODELOS.find((c) => c.marca === x.marca && despues.search(c.patron) >= 0 && despues.search(c.patron) <= 2);
    if (propio) {
      const r = despues.match(propio.patron)!;
      vistos.push({ marca: x.marca, modelo: propio.modelo, a: x.a, b: x.b + r.index! + r[0].length, dudoso: false });
    } else {
      const libreM = despues.match(/^\s+([\p{L}\d][\p{L}\d-]{1,14})/u);
      const palabra = libreM?.[1];
      if (palabra && !PARADA.has(palabra) && !/^(19|20)\d\d$/.test(palabra)) {
        const original = t.texto.slice(x.b + libreM![0].length - palabra.length, x.b + libreM![0].length);
        vistos.push({ marca: x.marca, modelo: original, a: x.a, b: x.b + libreM![0].length, dudoso: true, nota: "Modelo no reconocido en el catálogo." });
      } else {
        vistos.push({ marca: x.marca, modelo: null, a: x.a, b: x.b, dudoso: false });
      }
    }
  }

  for (const c of MODELOS) {
    if (c.ambiguo) continue;
    for (const m of t.plano.matchAll(new RegExp(c.patron.source, "gu"))) {
      const a = m.index;
      const b = a + m[0].length;
      if (!libre(ocupado, a, b) || vistos.some((v) => a < v.b && b > v.a)) continue;
      vistos.push({ marca: c.marca, modelo: c.modelo, a, b, dudoso: true, nota: `Marca deducida del modelo ${c.modelo}.` });
    }
  }

  // Errores menores de escritura: "hillux", "toyotta".
  for (const m of t.plano.matchAll(/\p{L}[\p{L}\d-]{4,}/gu)) {
    const a = m.index;
    const b = a + m[0].length;
    if (!libre(ocupado, a, b) || vistos.some((v) => a < v.b && b > v.a) || PARADA.has(m[0]) || COMUNES.has(m[0])) continue;
    const tolerancia = m[0].length >= 8 ? 2 : 1;
    const modelo = MODELOS.find((c) => !c.ambiguo && c.modelo.length >= 5 && distancia(m[0], plegar(c.modelo).replace(/[\s-]/g, "")) <= tolerancia);
    if (modelo) {
      vistos.push({ marca: modelo.marca, modelo: modelo.modelo, a, b, dudoso: true, nota: `Escrito como "${t.texto.slice(a, b)}".` });
      continue;
    }
    const marca = MARCAS.find((c) => c.nombre.length >= 5 && distancia(m[0], plegar(c.nombre).replace(/[\s-]/g, "")) <= tolerancia);
    if (marca) vistos.push({ marca: marca.nombre, modelo: null, a, b, dudoso: true, nota: `Escrito como "${t.texto.slice(a, b)}".` });
  }
  return vistos.sort((x, y) => x.a - y.a);
}

type NombreVisto = { valor: string; a: number; b: number; relacion: boolean; dudoso: boolean };

function leerNombre(t: Tramo, desde: number, exigirMayuscula: boolean, ocupado: Ocupado) {
  const partes: string[] = [];
  const palabra = /\s*([\p{L}][\p{L}'’-]*)/uy;
  palabra.lastIndex = desde;
  let fin = desde;
  let inicio = -1;
  let primeraMayuscula = false;
  while (partes.length < 4) {
    const m = palabra.exec(t.texto);
    if (!m) break;
    const a = palabra.lastIndex - m[1].length;
    const plano = plegar(m[1]);
    if (PARADA.has(plano) || !libre(ocupado, a, palabra.lastIndex)) break;
    const mayuscula = m[1][0] !== m[1][0].toLocaleLowerCase("es-CL");
    if ((exigirMayuscula || primeraMayuscula) && !mayuscula) break;
    if (!partes.length) primeraMayuscula = mayuscula;
    if (MARCAS_PATRON.some((x) => x.patron.test(plano)) || MODELOS.some((x) => !x.ambiguo && x.patron.test(plano))) break;
    if (inicio < 0) inicio = a;
    partes.push(m[1]);
    fin = palabra.lastIndex;
  }
  if (!partes.length) return null;
  const valor = titulo(partes.join(" "));
  if (COMUNAS_PATRON.some((c) => c.patron.test(plegar(valor)))) return null;
  return { valor, a: inicio, b: fin };
}

function buscarNombre(t: Tramo, vehiculos: VehiculoVisto[], ocupado: Ocupado): NombreVisto | null {
  if (TERCERO.test(t.plano)) return null;
  const etiqueta = /(?:^|[^\p{L}])(duen[oa]|propietari[oa]|cliente|nombre|a nombre de|es de|del? senor|de la senora|de don|de dona|soy|me llamo|sr\.?|sra\.?|don|dona)(?:\s+es)?\s*:?\s+/gu;
  for (const m of t.plano.matchAll(etiqueta)) {
    const desde = m.index + m[0].length;
    const n = leerNombre(t, desde, false, ocupado);
    if (n) return { ...n, relacion: true, dudoso: n.valor.split(" ").length < 2 };
  }
  for (const m of t.plano.matchAll(/(?:^|\s)de\s+/g)) {
    const desde = m.index + m[0].length;
    const n = leerNombre(t, desde, true, ocupado);
    if (n && vehiculos.some((v) => v.b <= m.index + 1)) return { ...n, relacion: true, dudoso: n.valor.split(" ").length < 2 };
  }
  const t2 = t.plano.search(/\s+tiene\b/);
  if (t2 > 0) {
    const n = leerNombre(t, 0, true, ocupado);
    if (n && n.b <= t2) return { ...n, relacion: true, dudoso: n.valor.split(" ").length < 2 };
  }
  const solo = t.texto.match(/^([\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,3})$/u);
  if (solo && libre(ocupado, 0, t.texto.length)) {
    const n = leerNombre(t, 0, true, ocupado);
    if (n && n.b === t.texto.length) return { ...n, relacion: false, dudoso: false };
  }
  // "Ana Soto 987654321": nombre seguido solo de sus datos de contacto.
  const inicial = leerNombre(t, 0, true, ocupado);
  if (inicial && inicial.valor.includes(" ") && ocupado.length) {
    let resto = "";
    for (let i = inicial.b; i < t.texto.length; i++) {
      if (libre(ocupado, i, i + 1)) resto += t.texto[i];
    }
    if (!/[\p{L}\p{N}]/u.test(resto)) return { ...inicial, relacion: false, dudoso: false };
  }
  return null;
}

function tipoPrecio(antes: string) {
  const claves: [string, RegExp][] = [
    ["comision", /comision/g],
    ["minimo", /minimo|piso|no menos de|menos de|baja hasta|acepta hasta|hasta/g],
    ["oferta", /oferta|ofrece|ofrecen|ofrecio|deuda|debe/g],
    ["solicitado", /precio|pide|pidiendo|vende|valor|quedo en|queda en|lo deja en|la deja en|dejo en|venta|sale|bajo a|subio a|rebajo a|rebajo/g],
  ];
  let mejor: string | null = null;
  let posicion = -1;
  for (const [tipo, patron] of claves) {
    for (const m of antes.matchAll(patron)) {
      if (m.index >= posicion) {
        posicion = m.index;
        mejor = tipo;
      }
    }
  }
  return mejor;
}

function procesarDocumentos(c: Constructor, b: BloqueExtraido, t: Tramo, ocupado: Ocupado) {
  let hubo = false;
  for (const [doc, patron] of DOCUMENTOS) {
    const m = t.plano.match(patron);
    if (!m || m.index === undefined || !libre(ocupado, m.index, m.index + m[0].length)) continue;
    hubo = true;
    ocupado.push([m.index, m.index + m[0].length]);
    const cola = t.plano.slice(m.index);
    const previo = t.plano.slice(Math.max(0, m.index - 12), m.index);
    let estado = "no_informado";
    if (/\b(sin|no tiene|falta|faltan?|debe)\s*(la |el |de )?$/.test(previo) || /\b(pendiente|falta|por sacar|por renovar)\b/.test(cola)) estado = "pendiente";
    else if (/\bvencid[oa]s?\b/.test(cola)) estado = "vencido";
    else if (/\b(al dia|vigente|ok|pagad[oa]|tiene|hasta|vence)\b/.test(cola) || /\b(tiene|con)\s*$/.test(previo)) estado = "al_dia";
    c.agregar(b, t, "documento", doc, estado, m.index, m.index + m[0].length, estado === "no_informado" ? "por_confirmar" : "detectado");

    const f = cola.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
    const mes = cola.match(/\b(\d{1,2})[/-](\d{4})\b/);
    const nombre = cola.match(new RegExp(`\\b(${MESES.join("|")})(?:\\s+(?:de\\s+|del\\s+)?(\\d{2,4}))?\\b`));
    let fecha: string | null = null;
    let exacta = true;
    let span: RegExpMatchArray | null = null;
    if (f) {
      fecha = `${anioLargo(Number(f[3]))}-${dos(Number(f[2]))}-${dos(Number(f[1]))}`;
      span = f;
    } else if (mes) {
      fecha = `${mes[2]}-${dos(Number(mes[1]))}-${dos(ultimoDia(Number(mes[2]), Number(mes[1])))}`;
      exacta = false;
      span = mes;
    } else if (nombre?.[2]) {
      const a = anioLargo(Number(nombre[2]));
      const n = MESES.indexOf(nombre[1]) + 1;
      fecha = `${a}-${dos(n)}-${dos(ultimoDia(a, n))}`;
      exacta = false;
      span = nombre;
    }
    if (fecha && span?.index !== undefined) {
      const a = m.index + span.index;
      ocupado.push([a, a + span[0].length]);
      c.agregar(b, t, "documento", `${doc}_vence`, fecha, a, a + span[0].length, exacta ? "detectado" : "por_confirmar",
        exacta ? undefined : "El mensaje indica solo mes y año.");
    }
  }
  return hubo;
}

function identidadVehiculo(c: Constructor, b: BloqueExtraido | null) {
  return { patente: c.valor(b, "vehiculo", "patente"), modelo: c.valor(b, "vehiculo", "modelo") };
}

function mismoNombre(a: string, b: string) {
  const x = plegar(a).split(/\s+/);
  const y = plegar(b).split(/\s+/);
  const [corto, largo] = x.length <= y.length ? [x, y] : [y, x];
  return corto.every((p) => largo.includes(p));
}

function procesarTramo(c: Constructor, t: Tramo, inicioMensaje: boolean) {
  const ocupado: Ocupado = [];
  const hipotesis = HIPOTESIS.test(t.plano);
  type Hallazgo = () => void;
  const luego: ((b: BloqueExtraido) => void)[] = [];
  const add = (fn: (b: BloqueExtraido) => void): Hallazgo => () => void luego.push(fn);

  const correos: string[] = [];
  for (const { m, a, b } of coincidencias(t, /[^\s@,;:<>()]+@[^\s@,;:<>()]+\.[^\s@,;:<>().]+/g, ocupado)) {
    ocupado.push([a, b]);
    correos.push(m[0]);
    add((x) => c.agregar(x, t, "cliente", "email", m[0], a, b))();
  }

  const ruts: string[] = [];
  for (const { m, a, b } of coincidencias(t, /(rut\s*:?\s*)?(?<![\d.])(\d{1,2}\.?\d{3}\.?\d{3}\s?-?\s?[\dk])(?![\d.])/g, ocupado)) {
    const conGuion = /[-.]/.test(m[2]);
    if (!m[1] && !conGuion) continue;
    const rut = normalizarRut(m[2]);
    if (!rut) continue;
    const ok = rutValido(rut);
    ocupado.push([a, b]);
    ruts.push(rut);
    add((x) => c.agregar(x, t, "cliente", "rut", rut, a, b, ok ? "detectado" : "por_confirmar", ok ? undefined : "El dígito verificador no coincide."))();
  }

  const patentes: { valor: string; a: number; b: number; dudosa: boolean }[] = [];
  for (const { m, a, b } of coincidencias(t, /(?:(patente|ppu|placa)\s*:?\s*)([a-z]{2,4}[\s.-]?\d{2,4})\b/g, ocupado)) {
    const p = normalizarPatente(m[2]);
    if (patenteValida(p)) {
      ocupado.push([a, b]);
      patentes.push({ valor: p, a, b, dudosa: false });
    }
  }
  for (const { m, a, b } of coincidencias(t, /(?<![\p{L}\d])([A-Z]{4}[\s.-]?\d{2}|[A-Z]{2}[\s.-]?\d{4})(?![\p{L}\d])/gu, ocupado, t.texto)) {
    const p = normalizarPatente(m[1]);
    if (/^(KM|CC|HP|NM|RT)\d/.test(p)) continue;
    ocupado.push([a, b]);
    patentes.push({ valor: p, a, b, dudosa: false });
  }
  for (const { m, a, b } of coincidencias(t, /(?<![\p{L}\d])([bcdfghjklpqrstvwxyz]{4}\d{2})(?![\p{L}\d])/gu, ocupado)) {
    ocupado.push([a, b]);
    patentes.push({ valor: normalizarPatente(m[1]), a, b, dudosa: true });
  }

  const telefonos: string[] = [];
  const etiquetaTel = /(?:telefono|tel|fono|cel|celular|whatsapp|wsp|numero|contacto)\.?\s*:?\s*$/;
  for (const { m, a, b } of coincidencias(t, /(?<![\d.])(?:\+?\s?56[\s.-]*)?(?:\(?0?9\)?[\s.-]*)\d{4}[\s.-]*\d{4}(?!\d)/g, ocupado)) {
    const tel = normalizarTelefono(m[0].replace(/[()]/g, "").replace(/^\s*0(?=\s*9)/, ""));
    if (!tel) continue;
    ocupado.push([a, b]);
    telefonos.push(tel);
    add((x) => c.agregar(x, t, "cliente", "telefono", tel, a, b))();
  }
  for (const { m, a, b } of coincidencias(t, /(?<![\d.])(?:\+?56[\s.-]*)?\d{2}[\s.-]*\d{3}[\s.-]*\d{4}(?!\d)|(?<![\d.])\d{4}[\s.-]*\d{4}(?!\d)/g, ocupado)) {
    if (!etiquetaTel.test(t.plano.slice(0, a))) continue;
    const tel = normalizarTelefono(m[0]);
    if (!tel) continue;
    ocupado.push([a, b]);
    telefonos.push(tel);
    add((x) => c.agregar(x, t, "cliente", "telefono", tel, a, b, "por_confirmar", "Revisa que el número esté completo."))();
  }

  for (const { m, a, b } of coincidencias(t, /(\d+(?:[.,]\d+)?)\s*(%|por ciento)/g, ocupado)) {
    ocupado.push([a, b]);
    const estado: EstadoCampo = hipotesis || !/comision/.test(t.plano) ? "por_confirmar" : "detectado";
    add((x) => {
      c.agregar(x, t, "consignacion", "comision_tipo", "porcentaje", a, b, estado);
      c.agregar(x, t, "consignacion", "comision_valor", m[1].replace(",", "."), a, b, estado);
    })();
  }

  const kms: Hallazgo[] = [];
  for (const { m, a, b } of coincidencias(
    t,
    /(?:(?:kilometraje|kilometros|recorrido|km|kms)\s*:?\s*)(\d{1,3}(?:[.\s]\d{3})+|\d{1,7})(?:\s*mil\b)?|(\d{1,3}(?:[.\s]\d{3})+|\d{1,7})\s*(mil|k)?\s*(?:km|kms|kilometros)\b/g,
    ocupado
  )) {
    const crudo = m[1] ?? m[2];
    let km = Number(crudo.replace(/[.\s]/g, ""));
    if (m[3] || /mil\b/.test(m[0])) km *= 1000;
    if (km > 3_000_000) continue;
    ocupado.push([a, b]);
    kms.push(add((x) => c.agregar(x, t, "vehiculo", "km", String(km), a, b)));
  }
  kms.forEach((f) => f());

  // Documentos antes que años y dinero, para no confundir sus fechas.
  const documentos = /\b(revision|\brt\b|permiso|soap|seguro obligatorio|padron|anotaciones|multas?|prenda|factura)\b/.test(t.plano);
  const ocupadoDocs: Ocupado = [];
  if (documentos) {
    const prueba = new Constructor(c.hoy);
    procesarDocumentos(prueba, prueba.nuevo(t.orden), t, ocupadoDocs);
    ocupado.push(...ocupadoDocs);
  }

  let hayDinero = false;
  for (const { m, a, b } of coincidencias(
    t,
    /(?<![\p{L}\d.,])(\$\s*)?(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*(millones|millon|mills?|mil\b|palos?|lucas?|mm\b|m\b|k\b)\.?)?(\s+(?:y\s+medio|(?:con\s+)?\d{1,3}\s*(?:mil|lucas)\b))?/gu,
    ocupado
  )) {
    const antes = t.plano.slice(Math.max(0, a - 32), a);
    const tipo = tipoPrecio(antes);
    const conUnidad = !!(m[1] || m[3]);
    const miles = /^\d{1,3}(?:[.\s]\d{3})+$/.test(m[2]) || Number(m[2]) >= 100_000;
    if (!conUnidad && !miles && !(tipo && Number(m[2].replace(",", ".")) < 1000)) continue;
    const dinero = interpretarDinero(m[2], m[3] ?? "", m[4] ?? "");
    if (!dinero || dinero.valor < 10_000) continue;
    ocupado.push([a, b]);
    hayDinero = true;
    const valor = String(dinero.valor);
    add((x) => {
      if (tipo === "oferta") {
        c.agregar(x, t, "consignacion", "observaciones", t.texto, a, b, "por_confirmar", "Parece una oferta o deuda, no el precio pedido.", true);
      } else if (tipo === "comision") {
        c.agregar(x, t, "consignacion", "comision_tipo", "monto", a, b, hipotesis ? "por_confirmar" : "detectado");
        c.agregar(x, t, "consignacion", "comision_valor", valor, a, b, hipotesis ? "por_confirmar" : "detectado");
      } else {
        const campo = tipo === "minimo" ? "precio_minimo" : "precio_solicitado";
        const dudoso = hipotesis || !tipo || !dinero.exacto;
        const nota = hipotesis ? "El mensaje lo plantea como posibilidad." : !tipo ? "El mensaje no indica qué precio es." : !dinero.exacto ? "Se interpretó en millones." : undefined;
        c.agregar(x, t, "consignacion", campo, valor, a, b, dudoso ? "por_confirmar" : "detectado", nota);
      }
    })();
  }

  const vehiculos = buscarVehiculos(t, ocupado);
  vehiculos.forEach((v) => ocupado.push([v.a, v.b]));

  // Un modelo ya nombrado en este mensaje puede volver a citarse, incluso "Rio".
  const delMensaje = c.bloques.filter((x) => x.mensaje_orden === t.orden && c.valor(x, "vehiculo", "modelo"));
  for (const x of delMensaje) {
    const modelo = c.valor(x, "vehiculo", "modelo")!;
    const r = t.plano.match(new RegExp(`(?<![\\p{L}\\p{N}])${plegar(modelo).replace(/[.*+?^\${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u"));
    if (r?.index !== undefined && libre(ocupado, r.index, r.index + r[0].length)) {
      vehiculos.push({ marca: c.valor(x, "vehiculo", "marca"), modelo, a: r.index, b: r.index + r[0].length, dudoso: false });
      ocupado.push([r.index, r.index + r[0].length]);
    }
  }

  const anioMaximo = c.hoy.getFullYear() + 1;
  const anios: { valor: string; a: number; b: number; dudoso: boolean }[] = [];
  for (const { m, a, b } of coincidencias(t, /(?:\b(ano|modelo|del|año)\s*:?\s*)?(?<![\d.])((?:19[5-9]\d|20[0-3]\d)|\d{2})(?![\d.])/g, ocupado)) {
    const corto = m[2].length === 2;
    if (corto && !/^(ano|modelo)$/.test(m[1] ?? "")) continue;
    const n = corto ? 2000 + Number(m[2]) : Number(m[2]);
    if (n > anioMaximo) continue;
    if (!m[1] && !vehiculos.length && !patentes.length && !c.valor(c.actual, "vehiculo", "modelo")) continue;
    ocupado.push([a, b]);
    anios.push({ valor: String(n), a, b, dudoso: corto });
  }

  let comuna: { nombre: string; a: number; b: number } | null = null;
  for (const x of COMUNAS_PATRON) {
    const m = t.plano.match(x.patron);
    if (m?.index !== undefined && libre(ocupado, m.index, m.index + m[0].length)) {
      comuna = { nombre: x.nombre, a: m.index, b: m.index + m[0].length };
      ocupado.push([comuna.a, comuna.b]);
      break;
    }
  }

  const nombre = buscarNombre(t, vehiculos, ocupado);
  if (nombre) ocupado.push([nombre.a, nombre.b]);

  // Decide si este tramo pertenece al bloque actual o abre otro.
  const actual = c.actual;
  const previo = identidadVehiculo(c, actual);
  const patenteTramo = patentes[0]?.valor ?? null;
  const modeloTramo = vehiculos.find((v) => v.modelo)?.modelo ?? null;
  const hayVehiculo = !!(patenteTramo || vehiculos.length);
  const otroVehiculo =
    (patenteTramo && previo.patente && patenteTramo !== previo.patente) ||
    (modeloTramo && previo.modelo && plegar(modeloTramo) !== plegar(previo.modelo)) ||
    (!previo.patente && !previo.modelo ? false : !!patenteTramo && !previo.patente && !!modeloTramo && modeloTramo !== previo.modelo);
  const personaPrevia = {
    rut: c.valor(actual, "cliente", "rut"),
    telefono: c.valor(actual, "cliente", "telefono"),
    nombre: c.valor(actual, "cliente", "nombre"),
  };
  const otraPersona =
    (ruts[0] && personaPrevia.rut && ruts[0] !== personaPrevia.rut) ||
    (telefonos[0] && personaPrevia.telefono && telefonos[0] !== personaPrevia.telefono) ||
    (nombre && personaPrevia.nombre && !mismoNombre(nombre.valor, personaPrevia.nombre));
  const tieneVehiculoPrevio = !!(previo.patente || previo.modelo);
  const hayDato = hayVehiculo || !!nombre || ruts.length > 0 || telefonos.length > 0 || correos.length > 0;

  const citado = modeloTramo
    ? delMensaje.filter((x) => plegar(c.valor(x, "vehiculo", "modelo")!) === plegar(modeloTramo))
    : [];
  const patenteCitada = citado.length === 1 ? c.valor(citado[0], "vehiculo", "patente") : null;
  let bloque = actual;
  if (citado.length === 1 && !inicioMensaje && (!patenteTramo || !patenteCitada || patenteTramo === patenteCitada)) {
    bloque = citado[0];
    c.actual = bloque;
  } else if (!bloque) {
    bloque = c.nuevo(t.orden);
  } else if (inicioMensaje && (hayDato || hayDinero || ACTUALIZACION.test(t.plano))) {
    bloque = c.nuevo(t.orden);
  } else if (otroVehiculo || (otraPersona && tieneVehiculoPrevio && !hayVehiculo)) {
    bloque = c.nuevo(t.orden);
  }
  const b = bloque;

  luego.forEach((fn) => fn(b));

  for (const p of patentes) {
    c.agregar(b, t, "vehiculo", "patente", p.valor, p.a, p.b, p.dudosa ? "por_confirmar" : "detectado", p.dudosa ? "Escrita en minúsculas." : undefined);
  }
  for (const v of vehiculos) {
    if (v.marca) c.agregar(b, t, "vehiculo", "marca", v.marca, v.a, v.b, v.dudoso ? "por_confirmar" : "detectado", v.nota);
    if (v.modelo) c.agregar(b, t, "vehiculo", "modelo", v.modelo, v.a, v.b, v.dudoso && !v.nota?.startsWith("Marca") ? "por_confirmar" : "detectado", v.nota?.startsWith("Marca") ? undefined : v.nota);
    const cola = t.plano.slice(v.b).match(/^(?:\s+(?:4x4|4x2|\d\.\d|srv?|sr5|gls?|glx|dx|ltz?|xlt?|limited|full|diesel|bencinera|automatica|mecanica|at|mt|cabina doble|doble cabina))+/);
    if (cola) c.agregar(b, t, "vehiculo", "version", t.texto.slice(v.b, v.b + cola[0].length).trim(), v.b, v.b + cola[0].length);
  }
  for (const a of anios) {
    c.agregar(b, t, "vehiculo", "anio", a.valor, a.a, a.b, a.dudoso ? "por_confirmar" : "detectado", a.dudoso ? "Año escrito con dos dígitos." : undefined);
  }
  if (comuna) c.agregar(b, t, "cliente", "comuna", comuna.nombre, comuna.a, comuna.b, "por_confirmar", "Confirma que sea la ciudad del cliente.");
  if (nombre) {
    c.agregar(b, t, "cliente", "nombre", nombre.valor, nombre.a, nombre.b, nombre.dudoso ? "por_confirmar" : "detectado", nombre.dudoso ? "Falta el nombre completo." : undefined);
    if (nombre.relacion) b.propietario = { ...b.propietario, estado: "respaldado", fragmento: t.texto.slice(0, 200) };
    else if (b.propietario.estado === "sin_datos") b.propietario = { ...b.propietario, estado: "por_confirmar", fragmento: t.texto.slice(0, 200) };
  }

  const docs = documentos && procesarDocumentos(c, b, t, []);
  const firme = CONSIGNACION_FIRME.test(t.plano);
  const habla = /consign/.test(t.plano);
  if (hipotesis && (habla || hayDinero)) b.hipotetico = true;
  if (habla) {
    const m = t.plano.match(/consign\w*/)!;
    const a = m.index!;
    if (firme && !hipotesis) c.agregar(b, t, "consignacion", "estado", "activa", a, a + m[0].length);
    c.agregar(b, t, "consignacion", "condiciones", t.texto, 0, t.texto.length, "por_confirmar", undefined, true);
  } else if (/\b(exclusiv\w*|plazo|\d+\s*dias|retira\w*|sin costo|gastos?)\b/.test(t.plano)) {
    c.agregar(b, t, "consignacion", "condiciones", t.texto, 0, t.texto.length, "por_confirmar", undefined, true);
  }

  if (ACTUALIZACION.test(t.plano) && (hayDinero || docs || kms.length)) b.tipo = "actualizacion";

  const util = hayDato || hayDinero || docs || habla || kms.length || anios.length || comuna;
  if (!util && !SALUDO.test(t.plano) && t.texto.length > 3 && !/^\p{Emoji}+$/u.test(t.texto)) {
    c.agregar(b, t, "consignacion", "observaciones", t.texto, 0, t.texto.length, "por_confirmar", undefined, true);
  }
}

function pendientes(b: BloqueExtraido) {
  const falta = (entidad: EntidadCampo, campo: string) => {
    if (!b.campos.some((c) => c.entidad === entidad && c.campo === campo)) {
      b.campos.push({ entidad, campo, valor: null, estado: "pendiente", mensaje_orden: null, inicio: null, fin: null, fragmento: "" });
    }
  };
  falta("cliente", "nombre");
  if (!b.campos.some((c) => c.entidad === "cliente" && ["telefono", "rut", "email"].includes(c.campo))) falta("cliente", "telefono");
  falta("vehiculo", "patente");
  falta("vehiculo", "marca");
  falta("vehiculo", "modelo");
  falta("vehiculo", "anio");
  falta("consignacion", "precio_solicitado");
}

function enlazar(bloques: BloqueExtraido[]) {
  const dato = (b: BloqueExtraido, entidad: EntidadCampo, campo: string) =>
    b.campos.find((c) => c.entidad === entidad && c.campo === campo)?.valor ?? null;
  for (const b of bloques) {
    const patente = dato(b, "vehiculo", "patente");
    const modelo = dato(b, "vehiculo", "modelo");
    const nombre = dato(b, "cliente", "nombre");
    const previos = bloques.slice(0, b.indice).filter((p) => {
      const pp = dato(p, "vehiculo", "patente");
      if (patente && pp) return patente === pp;
      const pm = dato(p, "vehiculo", "modelo");
      const pn = dato(p, "cliente", "nombre");
      return !!modelo && !!pm && plegar(modelo) === plegar(pm) && (!nombre || !pn || mismoNombre(nombre, pn));
    });
    if (previos.length === 1 && previos[0].mensaje_orden !== b.mensaje_orden) {
      b.tipo = "actualizacion";
      b.actualiza_bloque = previos[0].indice;
    } else if (previos.length > 1 && b.tipo === "actualizacion") {
      b.campos.forEach((c) => {
        if (c.entidad === "vehiculo") c.nota = "Hay más de un vehículo que podría corresponder.";
      });
    }

    // Un dueño mencionado antes es solo una sugerencia: nunca se hereda solo.
    if (!nombre && !dato(b, "cliente", "rut") && !dato(b, "cliente", "telefono") && b.tipo === "nuevo" && b.indice > 0) {
      const anterior = bloques[b.indice - 1];
      if (anterior.mensaje_orden === b.mensaje_orden && dato(anterior, "cliente", "nombre")) {
        b.propietario = { estado: "por_confirmar", fragmento: null, posible_bloque: anterior.indice };
      }
    }
    if (dato(b, "cliente", "nombre") && b.propietario.estado === "sin_datos") b.propietario.estado = "por_confirmar";
  }
}

export function extraerMensajes(entrada: string, hoy = new Date()): ResultadoExtraccion {
  const mensajes = separarMensajes(entrada);
  const c = new Constructor(hoy);
  for (const m of mensajes) {
    tramos(m).forEach((t, i) => procesarTramo(c, t, i === 0));
  }
  const bloques = c.bloques.filter((b) => b.campos.length > 0);
  bloques.forEach((b, i) => {
    b.indice = i;
    b.propietario.posible_bloque = null;
  });
  enlazar(bloques);
  for (const b of bloques) {
    if (b.hipotetico) {
      for (const x of b.campos) {
        if (x.entidad === "consignacion" && x.estado === "detectado") {
          x.estado = "por_confirmar";
          x.nota = x.nota ?? "El mensaje lo plantea como posibilidad.";
        }
      }
      b.campos = b.campos.filter((x) => !(x.entidad === "consignacion" && x.campo === "estado"));
    }
    if (b.tipo === "nuevo") pendientes(b);
  }
  return { mensajes, bloques };
}
