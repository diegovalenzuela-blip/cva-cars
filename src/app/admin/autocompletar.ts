// Reglas para completar "Publicar auto" desde un texto. No usa servicios externos.
// La tabla de autos es pública: patente y datos personales nunca se copian al formulario.

import { extraerMensajes, type BloqueExtraido } from "./crm/importador/extractor.ts";
import { plegar } from "./crm/importador/reconocer.ts";

export const CAMPOS_AUTOCOMPLETADO = [
  "marca", "modelo", "version", "anio", "km", "duenos", "precio", "combustible", "transmision", "color", "tipo",
  "ubicacion", "descripcion", "estado_papeles", "mantenciones", "revision_tecnica",
] as const;

export type CampoAutocompletado = (typeof CAMPOS_AUTOCOMPLETADO)[number];
export type FormularioTexto = Record<CampoAutocompletado, string>;
export type Hallazgo = { campo: CampoAutocompletado; valor: string; dudoso: boolean; nota?: string };
export type Analisis = { hallazgos: Hallazgo[]; omitidos: string[]; avisos: string[] };
export type Conflicto = { campo: CampoAutocompletado; actual: string; nuevo: string };

export const NOMBRES_CAMPO: Record<CampoAutocompletado, string> = {
  marca: "Marca", modelo: "Modelo", version: "Versión", anio: "Año", km: "Kilometraje", duenos: "Número de dueños",
  precio: "Precio", combustible: "Combustible", transmision: "Transmisión", color: "Color", tipo: "Tipo",
  ubicacion: "Ubicación", descripcion: "Descripción", estado_papeles: "Papeles", mantenciones: "Mantenciones",
  revision_tecnica: "Revisión técnica",
};

const COMBUSTIBLES: [string, RegExp][] = [
  ["Híbrido", /\b(hibrid[oa]|hev|phev|mhev)\b/],
  ["Eléctrico", /\b(electric[oa]|ev)\b(?!\s*(alzavidrios|espejos))/],
  ["Diésel", /\b(diesel|petrolero|petroleo|turbo diesel|tdi|crdi)\b/],
  ["Bencina", /\b(bencina|bencinero|bencinera|gasolina|nafta)\b/],
  ["Gas", /\b(gnc|glp|a gas)\b/],
];
const TIPOS: [string, RegExp][] = [
  ["Camioneta", /\b(camioneta|pick[\s-]?up|doble cabina|cabina doble)\b/],
  ["SUV", /\b(suv|todoterreno|todo terreno)\b/],
  ["Furgón", /\b(furgon|minivan|van)\b/],
  ["Camión", /\bcamion\b/],
  ["Moto", /\b(moto|motocicleta)\b/],
  ["Auto", /\b(sedan|hatchback|coupe|citycar|city car|station wagon)\b/],
];
const COLORES: [string, string][] = [
  ["blanc[oa]", "Blanco"], ["negr[oa]", "Negro"], ["gris", "Gris"], ["plateado|plateada", "Plata"], ["roj[oa]", "Rojo"],
  ["azul", "Azul"], ["verde", "Verde"], ["cafe", "Café"], ["beige", "Beige"], ["amarill[oa]", "Amarillo"],
  ["naranj[oa]", "Naranjo"], ["dorad[oa]", "Dorado"], ["burdeo", "Burdeo"], ["celeste", "Celeste"],
];
const EQUIPAMIENTO: [string, RegExp][] = [
  ["Aire acondicionado", /\b(aire acondicionado|a\/c)\b/], ["Climatizador", /\bclimatizador\b/], ["Airbags", /\bairbags?\b/],
  ["Frenos ABS", /\babs\b/], ["Control de estabilidad", /\b(esp|control de estabilidad)\b/], ["Bluetooth", /\bbluetooth\b/],
  ["Pantalla multimedia", /\b(pantalla( tactil| multimedia)?|radio tactil)\b/], ["Android Auto", /\bandroid auto\b/],
  ["Apple CarPlay", /\b(apple )?carplay\b/], ["Cámara de retroceso", /\bcamara( de)? retroceso\b/],
  ["Sensores de retroceso", /\bsensor(es)?( de)? retroceso\b/], ["Alzavidrios eléctricos", /\balzavidrios( electricos)?\b/],
  ["Cierre centralizado", /\bcierre centralizado\b/], ["Llantas de aleación", /\bllantas( de aleacion)?\b/],
  ["Techo solar", /\b(techo solar|sunroof|techo panoramico)\b/], ["Asientos de cuero", /\b(asientos de cuero|tapiz de cuero|tapiz cuero)\b/],
  ["Control crucero", /\b(control crucero|cruise control)\b/], ["Navegador", /\b(gps|navegador)\b/], ["Neblineros", /\bneblineros?\b/],
  ["Barras de techo", /\bbarras( de techo)?\b/], ["Enganche", /\b(enganche|tiro de arrastre)\b/], ["Pisaderas", /\bpisaderas\b/],
  ["Cubre pick up", /\bcubre\s?(pick[\s-]?up|pickup|carga)\b/], ["Isofix", /\bisofix\b/],
];

const ETIQUETA_DATO = /^\s*(marca|modelo|version|ano|anio|km|kms|kilometraje|precio|valor|color|combustible|transmision|caja|patente|ppu|motor|cilindrada|potencia|traccion|carroceria|tipo|duenos?|ubicacion|ciudad|comuna|equipamiento|equipo)\s*:/;
const CONTACTO = /\b(whatsapp|wsp|llamar|llamame|escribir|escribeme|contacto|contactar|interesados?|fono|telefono|celular|correo|rut|duen[oa]|propietari[oa]|comision|consignacion|consignad[oa]|precio minimo|permuta|conversable|financiamiento|ofrece|ofrecen|oferta|deuda|prenda|multas?)\b|@|\$/;

const anotar = (lista: Hallazgo[], campo: CampoAutocompletado, valor: string | null | undefined, dudoso = false, nota?: string) => {
  const limpio = valor?.trim();
  if (limpio && !lista.some((h) => h.campo === campo)) lista.push({ campo, valor: limpio, dudoso, ...(nota ? { nota } : {}) });
};

function unicoDe(plano: string, opciones: [string, RegExp][]) {
  const encontrados = opciones.filter(([, r]) => r.test(plano)).map(([v]) => v);
  return { valor: encontrados[0] ?? null, varios: encontrados.length > 1 };
}

function buscarColor(texto: string) {
  for (const linea of texto.split(/\n|[.;,]\s+/)) {
    const etiquetado = linea.match(/\bcolor\s*:?\s*(?:es\s+)?([a-z]+)/);
    if (etiquetado) {
      const palabra = etiquetado[1];
      if (palabra === "plata") return "Plata";
      const c = COLORES.find(([p]) => new RegExp(`^(${p})$`).test(palabra));
      if (c) return c[1];
    }
  }
  for (const linea of texto.split(/\n|[.;,]\s+/)) {
    if (/\b(interior|tapiz|cuero|llantas?|vidrios?|caja|piso|techo|asientos?|patente)\b/.test(linea)) continue;
    for (const [patron, nombre] of COLORES) {
      if (new RegExp(`\\b(${patron})\\b`).test(linea)) return nombre;
    }
  }
  return null;
}

const NUMEROS: Record<string, string> = { un: "1", una: "1", unico: "1", unica: "1", primer: "1", dos: "2", segundo: "2", tres: "3", tercer: "3", cuatro: "4" };

function buscarDuenos(plano: string) {
  const m = plano.match(/\b(\d|un|una|unico|unica|primer|dos|segundo|tres|tercer|cuatro)\s+duen[oa]s?\b/) ?? plano.match(/\bduen[oa]s?\s*:\s*(\d)\b/);
  return m ? (NUMEROS[m[1]] ?? m[1]) : null;
}

function datosTecnicos(original: string, plano: string) {
  const dato = (r: RegExp) => {
    const m = plano.match(r);
    return m?.index === undefined ? null : original.slice(m.index + m[0].length - m[1].length, m.index + m[0].length).trim();
  };
  const litros = plano.match(/\b(\d[.,]\d)\s*(?:l|lt|lts|litros?)?\b(?!\s*(?:millones|palos|mm|m\b|km))/);
  const cc = plano.match(/\b(\d{3,4})\s*cc\b/);
  const hp = plano.match(/\b(\d{2,4})\s*(hp|cv|bhp|kw)\b/);
  const traccion = plano.match(/\b(4x4|4x2|awd|4wd|fwd|rwd)\b/) ?? plano.match(/\btraccion\s*:?\s*(delantera|trasera|integral|total|simple|doble)\b/);
  return {
    version: dato(/\bversion\s*:\s*([^\n,;]{1,40})/),
    motor: dato(/\bmotor\s*:\s*((?:[^\n,.;]|\.(?=\d)){2,40})/),
    cilindrada: cc ? `${cc[1]} cc` : litros && /\b(motor|cilindrada|\d[.,]\d\s*(l|lt|lts|litros?)\b)/.test(plano) ? litros[1].replace(",", ".") : null,
    potencia: hp ? `${hp[1]} ${hp[2].toUpperCase()}` : null,
    traccion: traccion ? (/\dx\d|wd/.test(traccion[1]) ? traccion[1].toUpperCase().replace("X", "x") : `Tracción ${traccion[1]}`) : null,
  };
}

function textoDocumento(estado: string | null, vence: string | null) {
  const nombres: Record<string, string> = { al_dia: "Al día", vencido: "Vencido", pendiente: "Pendiente" };
  const base = estado ? nombres[estado] : null;
  if (!base) return null;
  if (!vence) return base;
  const [a, m, d] = vence.split("-");
  return `${base}, vence ${d}/${m}/${a}`;
}

function construirDescripcion(entrada: ReturnType<typeof extraerMensajes>, bloque: BloqueExtraido) {
  const frases: string[] = [];
  for (const m of entrada.mensajes) {
    const campos = bloque.campos.filter((c) => c.mensaje_orden === m.orden && c.inicio !== null && c.fin !== null && c.campo !== "observaciones");
    const sensibles = campos.filter((c) =>
      (c.entidad === "cliente" && c.campo !== "comuna") || c.entidad === "consignacion" || c.campo === "patente"
    );
    for (const f of m.texto.matchAll(/[^\n.!?]+(?:[.!?]+(?=\s|$))?/gu)) {
      const inicio = f.index;
      const fin = inicio + f[0].length;
      const frase = f[0].trim();
      const plano = plegar(frase);
      if (!frase || ETIQUETA_DATO.test(plano) || CONTACTO.test(plano)) continue;
      if (sensibles.some((c) => c.inicio! < fin && c.fin! > inicio)) continue;
      let resto = m.texto.slice(inicio, fin);
      for (const c of campos.filter((x) => x.inicio! >= inicio && x.fin! <= fin).sort((a, b) => b.inicio! - a.inicio!)) {
        resto = resto.slice(0, c.inicio! - inicio) + resto.slice(c.fin! - inicio);
      }
      if ((resto.match(/\p{L}/gu) ?? []).length >= 15) frases.push(frase);
    }
  }
  return [...new Set(frases)];
}

export function analizarDescripcion(texto: string, hoy = new Date()): Analisis {
  const unido = texto.replace(/\r\n?/g, "\n").replace(/\n\s*\n+/g, "\n").trim();
  const hallazgos: Hallazgo[] = [];
  const omitidos: string[] = [];
  const avisos: string[] = [];
  if (!unido) return { hallazgos, omitidos, avisos };

  const extraccion = extraerMensajes(unido, hoy);
  const conVehiculo = (b: BloqueExtraido) => b.campos.some((c) => c.entidad === "vehiculo" && c.valor !== null);
  const vehiculos = extraccion.bloques.filter(conVehiculo);
  const bloque = vehiculos[0] ?? extraccion.bloques[0];
  if (!bloque) return { hallazgos, omitidos, avisos: ["No encontré datos del vehículo en ese texto."] };
  if (vehiculos.length > 1) avisos.push("El texto menciona más de un vehículo. Se usó solo el primero.");

  const campo = (entidad: string, nombre: string) =>
    bloque.campos.find((c) => c.entidad === entidad && c.campo === nombre && c.valor !== null);
  const copiar = (destino: CampoAutocompletado, entidad: string, nombre: string) => {
    const c = campo(entidad, nombre);
    if (c) anotar(hallazgos, destino, c.valor, c.estado === "por_confirmar", c.nota);
  };

  copiar("marca", "vehiculo", "marca");
  copiar("modelo", "vehiculo", "modelo");
  copiar("anio", "vehiculo", "anio");
  copiar("km", "vehiculo", "km");
  copiar("precio", "consignacion", "precio_solicitado");
  copiar("ubicacion", "cliente", "comuna");

  const mensaje = extraccion.mensajes.map((m) => m.texto).join("\n");
  const plano = plegar(mensaje);
  const tecnica = datosTecnicos(mensaje, plano);

  const version = [tecnica.version, campo("vehiculo", "version")?.valor, tecnica.cilindrada, tecnica.traccion].filter(Boolean) as string[];
  const unicos = version.filter((v, i) => !version.slice(0, i).some((x) => plegar(x).includes(plegar(v))));
  anotar(hallazgos, "version", unicos.join(" "));

  const combustible = unicoDe(plano, COMBUSTIBLES);
  anotar(hallazgos, "combustible", combustible.valor, combustible.varios, combustible.varios ? "El texto menciona más de un combustible." : undefined);

  const transmision = /\b(automatic[oa]|tiptronic|cvt)\b/.test(plano) || /(?<![\p{L}\d])AT(?![\p{L}\d])/u.test(mensaje)
    ? "Automática"
    : /\b(manual|mecanic[oa])\b/.test(plano) || /(?<![\p{L}\d])MT(?![\p{L}\d])/u.test(mensaje) ? "Manual" : null;
  anotar(hallazgos, "transmision", transmision);

  anotar(hallazgos, "color", buscarColor(plano));
  const tipo = unicoDe(plano, TIPOS);
  anotar(hallazgos, "tipo", tipo.valor, tipo.varios, tipo.varios ? "El texto menciona más de un tipo." : undefined);
  anotar(hallazgos, "duenos", buscarDuenos(plano));

  anotar(hallazgos, "revision_tecnica", textoDocumento(campo("documento", "revision_tecnica")?.valor ?? null, campo("documento", "revision_tecnica_vence")?.valor ?? null));
  const papeles = [
    /\bpapeles?\s+(?:al dia|en regla|ok)\b/.test(plano) ? "Al día" : null,
    ...[["permiso_circulacion", "Permiso de circulación"], ["soap", "SOAP"]].flatMap(([k, nombre]) => {
      const t = textoDocumento(campo("documento", k)?.valor ?? null, campo("documento", `${k}_vence`)?.valor ?? null);
      return t ? [`${nombre}: ${t.toLowerCase()}`] : [];
    }),
  ].filter(Boolean);
  anotar(hallazgos, "estado_papeles", papeles.join(". ").slice(0, 200));

  const mantenciones = mensaje.split(/\n|(?<=[.!?])\s+/).filter((f) => /\b(mantencion(es)?|mantenciones|pauta|servicio tecnico)\b/.test(plegar(f)));
  anotar(hallazgos, "mantenciones", mantenciones.join(" ").slice(0, 500));

  const equipamiento = EQUIPAMIENTO.filter(([, r]) => r.test(plano)).map(([n]) => n);
  const comerciales = construirDescripcion(extraccion, bloque).filter((f) => !/\b(mantencion(es)?|pauta|revision tecnica|soap|permiso)\b/.test(plegar(f)));
  const ficha = [tecnica.motor ? `Motor: ${tecnica.motor}` : null, tecnica.potencia ? `Potencia: ${tecnica.potencia}` : null].filter(Boolean).join(". ");
  anotar(hallazgos, "descripcion", [
    comerciales.join(" "),
    ficha,
    equipamiento.length ? `Equipamiento: ${equipamiento.join(", ")}.` : "",
  ].filter(Boolean).join("\n").slice(0, 3000));

  if (campo("vehiculo", "patente")) omitidos.push("patente");
  for (const [c, nombre] of [["nombre", "nombre del dueño"], ["rut", "RUT"], ["telefono", "teléfono"], ["email", "correo"]]) {
    if (campo("cliente", c)) omitidos.push(nombre);
  }
  if (campo("consignacion", "precio_minimo")) omitidos.push("precio mínimo");
  if (campo("consignacion", "comision_valor")) omitidos.push("comisión");
  return { hallazgos, omitidos, avisos };
}

/** Separa lo que se puede escribir de lo que reemplazaría un dato ingresado por la persona. */
export function planificarAutocompletado(
  formulario: FormularioTexto,
  analisis: Analisis,
  anteriores: Partial<FormularioTexto>,
  valoresIniciales: Partial<FormularioTexto> = {}
) {
  const aplicar: Partial<FormularioTexto> = {};
  const conflictos: Conflicto[] = [];
  for (const h of analisis.hallazgos) {
    const actual = formulario[h.campo] ?? "";
    if (actual.trim() === h.valor) continue;
    const libre = !actual.trim() || actual === valoresIniciales[h.campo] || actual === anteriores[h.campo];
    if (libre) aplicar[h.campo] = h.valor;
    else conflictos.push({ campo: h.campo, actual, nuevo: h.valor });
  }
  return { aplicar, conflictos };
}
