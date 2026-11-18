// Reconocedores básicos: RUT, patentes, precios y vehículos. Sin React ni Supabase.

/** Minúsculas y sin tildes, conservando el largo para no perder la posición original. */
export function plegar(texto: string) {
  let salida = "";
  for (const c of texto.split("")) {
    const base = c.normalize("NFD")[0] ?? c;
    const baja = base.toLowerCase();
    salida += baja.length === 1 ? baja : base;
  }
  return salida;
}

export function normalizarRut(texto: string) {
  const limpio = texto.replace(/[^0-9kK]/g, "").toUpperCase();
  return /^[0-9]{7,8}[0-9K]$/.test(limpio) ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}` : null;
}

export function rutValido(rut: string) {
  if (!/^[0-9]{7,8}-[0-9K]$/.test(rut)) return false;
  const [cuerpo, digito] = rut.split("-");
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return digito === (resto === 11 ? "0" : resto === 10 ? "K" : String(resto));
}

export const normalizarPatente = (texto: string) => texto.replace(/[^0-9A-Za-z]/g, "").toUpperCase();

export const patenteValida = (patente: string) =>
  /^([A-Z]{4}[0-9]{2}|[A-Z]{2}[0-9]{4}|[A-Z]{3}[0-9]{2}|[A-Z]{2}[0-9]{3}|[A-Z]{3}[0-9]{3})$/.test(patente);

export type Dinero = { valor: number; exacto: boolean };

/** Convierte un número y su unidad en pesos. `exacto` es falso si hubo que suponer millones. */
export function interpretarDinero(numero: string, unidad = "", resto = ""): Dinero | null {
  const miles = /^\d{1,3}(?:[.\s]\d{3})+$/.test(numero);
  const base = miles ? Number(numero.replace(/[.\s]/g, "")) : Number(numero.replace(",", "."));
  if (!Number.isFinite(base) || base <= 0) return null;
  const u = unidad.replace(/\./g, "").trim();
  let valor = base;
  let exacto = true;
  if (/^(millon|millones|mill|mills|mil?l?s|palo|palos|mm|m)$/.test(u) && u !== "mil") valor = base * 1_000_000;
  else if (/^(mil|luca|lucas|k)$/.test(u)) valor = base * 1_000;
  else if (base < 1_000) {
    valor = base * 1_000_000;
    exacto = false;
  }
  const extra = resto.trim();
  if (/medio$/.test(extra)) valor += valor >= 1_000_000 ? 500_000 : 500;
  else {
    const m = extra.match(/(\d{1,3})/);
    if (m) valor += Number(m[1]) * 1_000;
  }
  return Number.isSafeInteger(Math.round(valor)) ? { valor: Math.round(valor), exacto } : null;
}

export function distancia(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    for (let j = 1; j <= b.length; j++) {
      fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previa = fila;
  }
  return previa[b.length];
}

type Marca = { nombre: string; alias?: string[]; modelos: string[]; ambiguos?: string[] };

// `ambiguos` son modelos que también son palabras comunes: solo cuentan junto a la marca.
export const MARCAS: Marca[] = [
  { nombre: "Toyota", modelos: ["Hilux", "Corolla", "Yaris", "RAV4", "Land Cruiser", "Fortuner", "4Runner", "Prado", "Tacoma", "Tundra", "Rush", "Hiace"] },
  { nombre: "Chevrolet", alias: ["chevy"], modelos: ["Sail", "Spark", "D-Max", "Silverado", "Tracker", "Captiva", "Cruze", "Colorado", "C10", "Groove", "Onix", "Tahoe", "N400"] },
  { nombre: "Nissan", modelos: ["Navara", "NP300", "Terrano", "Qashqai", "Versa", "Sentra", "X-Trail", "Pathfinder", "Murano", "March"], ambiguos: ["Kicks"] },
  { nombre: "Hyundai", modelos: ["Accent", "Tucson", "Santa Fe", "Elantra", "Creta", "Grand i10", "i10", "i20", "H1", "Porter", "Venue", "Kona"] },
  { nombre: "Kia", modelos: ["Sportage", "Sorento", "Cerato", "Soluto", "Frontier", "Sonet", "Seltos", "Carnival"], ambiguos: ["Rio", "Morning", "Soul"] },
  { nombre: "Ford", modelos: ["Ranger", "F-150", "EcoSport", "Explorer", "Territory", "Maverick", "Bronco", "Transit", "Fiesta", "Focus"], ambiguos: ["Escape"] },
  { nombre: "Mitsubishi", modelos: ["L200", "Montero", "Outlander", "ASX", "Eclipse Cross", "Xpander"] },
  { nombre: "Mazda", modelos: ["CX-3", "CX-30", "CX-5", "CX-9", "BT-50"], ambiguos: ["2", "3", "6"] },
  { nombre: "Suzuki", modelos: ["Swift", "Vitara", "Grand Vitara", "Jimny", "Baleno", "Dzire", "S-Presso", "Celerio", "Ertiga"], ambiguos: ["Alto"] },
  { nombre: "Peugeot", modelos: ["208", "2008", "3008", "5008", "301", "Boxer", "Landtrek"], ambiguos: ["Partner"] },
  { nombre: "Citroën", alias: ["citroen"], modelos: ["C3", "C4", "C5 Aircross", "Berlingo", "Jumpy"] },
  { nombre: "Renault", modelos: ["Duster", "Kwid", "Oroch", "Koleos", "Logan", "Sandero", "Symbol", "Captur", "Kangoo", "Alaskan"] },
  { nombre: "Volkswagen", alias: ["vw"], modelos: ["Amarok", "Tiguan", "Virtus", "T-Cross", "Golf", "Saveiro", "Taos", "Vento"], ambiguos: ["Gol", "Polo"] },
  { nombre: "Honda", modelos: ["Civic", "CR-V", "HR-V", "Pilot", "City", "Fit"] },
  { nombre: "Subaru", modelos: ["Forester", "Outback", "XV", "Impreza", "Crosstrek"] },
  { nombre: "Jeep", modelos: ["Wrangler", "Renegade", "Compass", "Cherokee", "Grand Cherokee", "Gladiator"] },
  { nombre: "RAM", modelos: ["700", "1000", "1500", "2500"] },
  { nombre: "MG", modelos: ["ZS", "ZX", "HS", "MG3", "RX5"] },
  { nombre: "Great Wall", alias: ["greatwall", "gwm"], modelos: ["Wingle", "Poer", "Voleex", "Florid"] },
  { nombre: "Haval", modelos: ["H6", "Jolion", "Dargo"] },
  { nombre: "Chery", modelos: ["Tiggo", "Tiggo 2", "Tiggo 3", "Tiggo 7", "Tiggo 8", "IQ"] },
  { nombre: "JAC", modelos: ["T6", "T8", "JS2", "JS4", "S2", "S3"] },
  { nombre: "Changan", modelos: ["CS15", "CS35", "CS55", "Hunter", "Alsvin"] },
  { nombre: "Maxus", modelos: ["T60", "T90", "G10", "V80"] },
  { nombre: "SsangYong", alias: ["ssang yong"], modelos: ["Musso", "Actyon", "Korando", "Rexton", "Tivoli"] },
  { nombre: "BMW", modelos: ["X1", "X3", "X5", "Serie 1", "Serie 3", "Serie 5"] },
  { nombre: "Mercedes-Benz", alias: ["mercedes", "mercedes benz"], modelos: ["Sprinter", "Clase A", "Clase C", "Clase E", "GLA", "GLC"] },
  { nombre: "Audi", modelos: ["A1", "A3", "A4", "Q2", "Q3", "Q5"] },
  { nombre: "Fiat", modelos: ["Fiorino", "Strada", "Mobi", "Argo", "Ducato", "Cronos"] },
  { nombre: "Dodge", modelos: ["Durango", "Journey", "Dakota", "Ram"] },
  { nombre: "Volvo", modelos: ["XC40", "XC60", "XC90"] },
  { nombre: "Geely", modelos: ["Coolray", "Azkarra", "Emgrand"] },
];

export const COMUNAS = [
  "Chillán Viejo", "Chillán", "Bulnes", "San Carlos", "Quillón", "Coihueco", "Pinto", "Yungay", "El Carmen",
  "Pemuco", "San Ignacio", "Quirihue", "Coelemu", "Cobquecura", "Ninhue", "Ñiquén", "Portezuelo", "Ránquil",
  "San Fabián", "San Nicolás", "Treguaco", "Concepción", "Los Ángeles", "Talcahuano", "Linares", "Talca", "Santiago",
];

const patronTexto = (t: string) =>
  plegar(t)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[\s-]+/g, "[\\s-]*");

export type ModeloConocido = { marca: string; modelo: string; patron: RegExp; ambiguo: boolean };

export const MODELOS: ModeloConocido[] = MARCAS.flatMap((m) =>
  [...m.modelos.map((x) => [x, false] as const), ...(m.ambiguos ?? []).map((x) => [x, true] as const)].map(
    ([modelo, ambiguo]) => ({
      marca: m.nombre,
      modelo,
      ambiguo,
      patron: new RegExp(`(?<![\\p{L}\\p{N}])${patronTexto(modelo)}(?![\\p{L}\\p{N}])`, "u"),
    })
  )
).sort((a, b) => b.modelo.length - a.modelo.length);

export const MARCAS_PATRON = MARCAS.flatMap((m) =>
  [m.nombre, ...(m.alias ?? [])].map((t) => ({
    marca: m.nombre,
    patron: new RegExp(`(?<![\\p{L}\\p{N}])${patronTexto(t)}(?![\\p{L}\\p{N}])`, "u"),
  }))
).sort((a, b) => b.patron.source.length - a.patron.source.length);

export const COMUNAS_PATRON = COMUNAS.map((nombre) => ({
  nombre,
  patron: new RegExp(`(?<![\\p{L}])${patronTexto(nombre)}(?![\\p{L}])`, "u"),
}));

export const titulo = (t: string) =>
  t
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toLocaleUpperCase("es-CL") + p.slice(1).toLocaleLowerCase("es-CL"))
    .join(" ");
