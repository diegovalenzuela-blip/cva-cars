import { supabase } from "@/lib/supabase";
import { SLUG } from "@/lib/datos";

export type Catalogo = "general" | "trabajo";

export type AutoPublico = {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  anio: number;
  km: number | null;
  precio: number;
  estado: string;
  fotos: string[];
  ubicacion: string | null;
  tipo: string | null;
  destacado: boolean | null;
  en_portada: boolean;
  catalogo: Catalogo;
  acepta_parte_pago: boolean;
  precio_negociable: boolean;
};

type Fila = {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  anio: number;
  km: number | null;
  precio: number;
  estado: string;
  fotos: string[] | null;
  ubicacion?: string | null;
  tipo?: string | null;
  destacado?: boolean | null;
  en_portada?: boolean | null;
  catalogo?: string | null;
  acepta_parte_pago?: boolean | null;
  precio_negociable?: boolean | null;
};

// Solo se aceptan fotos con enlace http(s). Nada que venga de la base de datos
// (por ejemplo "javascript:...") llega a la página como imagen.
function soloHttp(fotos: unknown): string[] {
  if (!Array.isArray(fotos)) return [];
  return fotos.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u));
}

const aCatalogo = (c: unknown): Catalogo => (c === "trabajo" ? "trabajo" : "general");

function aPublico(a: Fila): AutoPublico {
  return {
    id: a.id,
    codigo: a.codigo,
    marca: a.marca,
    modelo: a.modelo,
    anio: a.anio,
    km: a.km ?? null,
    precio: a.precio,
    estado: a.estado,
    fotos: soloHttp(a.fotos),
    ubicacion: a.ubicacion ?? null,
    tipo: a.tipo ?? null,
    destacado: a.destacado ?? false,
    en_portada: a.en_portada === true,
    catalogo: aCatalogo(a.catalogo),
    acepta_parte_pago: a.acepta_parte_pago === true,
    precio_negociable: a.precio_negociable === true,
  };
}

// Sin catálogo devuelve todos (lo usa el sitemap); con catálogo, solo ese.
export async function getAutosPublicos(catalogo?: Catalogo): Promise<AutoPublico[]> {
  try {
    let consulta = supabase
      .from("autos")
      .select("*, automotoras!inner(slug)")
      .eq("automotoras.slug", SLUG)
      .in("estado", ["disponible", "reservado"]);
    if (catalogo) consulta = consulta.eq("catalogo", catalogo);
    const { data, error } = await consulta.order("creado_en", { ascending: false });

    if (error || !data) return [];

    return (data as unknown as Fila[]).map(aPublico);
  } catch {
    return [];
  }
}

export async function getAutosExhibicion(): Promise<AutoPublico[]> {
  try {
    const { data, error } = await supabase
      .from("autos")
      .select("*, automotoras!inner(slug)")
      .eq("automotoras.slug", SLUG)
      .eq("publicado", true)
      .eq("en_exhibicion", true)
      .eq("catalogo", "general")
      .in("estado", ["disponible", "reservado"])
      .order("creado_en", { ascending: false });

    if (error || !data) return [];

    return (data as unknown as Fila[]).map(aPublico);
  } catch {
    return [];
  }
}

export type AutoDetalle = AutoPublico & {
  version: string | null;
  combustible: string | null;
  transmision: string | null;
  color: string | null;
  descripcion: string | null;
  duenos: number | null;
  estado_papeles: string | null;
  mantenciones: string | null;
  revision_tecnica: string | null;
};

// Los códigos son cortos y simples. Se valida antes de consultar la base de datos.
export function codigoValido(c: string): boolean {
  return /^[\p{L}\p{N}._\- ]{1,60}$/u.test(c);
}

export async function getAutoPorCodigo(codigo: string): Promise<AutoDetalle | null> {
  if (!codigoValido(codigo)) return null;
  try {
    const { data, error } = await supabase
      .from("autos")
      .select("*, automotoras!inner(slug)")
      .eq("automotoras.slug", SLUG)
      .eq("codigo", codigo)
      .in("estado", ["disponible", "reservado"])
      .maybeSingle();
    if (error || !data) return null;
    const a = data as unknown as Record<string, unknown>;
    const txt = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : null);
    return {
      id: String(a.id),
      codigo: String(a.codigo),
      marca: String(a.marca ?? ""),
      modelo: String(a.modelo ?? ""),
      anio: Number(a.anio) || 0,
      km: typeof a.km === "number" ? a.km : null,
      precio: Number(a.precio) || 0,
      estado: String(a.estado),
      fotos: soloHttp(a.fotos as string[] | null),
      ubicacion: txt("ubicacion"),
      tipo: txt("tipo"),
      destacado: a.destacado === true,
      en_portada: a.en_portada === true,
      catalogo: aCatalogo(a.catalogo),
      acepta_parte_pago: a.acepta_parte_pago === true,
      precio_negociable: a.precio_negociable === true,
      version: txt("version"),
      combustible: txt("combustible"),
      transmision: txt("transmision"),
      color: txt("color"),
      descripcion: txt("descripcion"),
      duenos: typeof a.duenos === "number" ? a.duenos : null,
      estado_papeles: txt("estado_papeles"),
      mantenciones: txt("mantenciones"),
      revision_tecnica: txt("revision_tecnica"),
    };
  } catch {
    return null;
  }
}

export type FotoFondo = { url: string; titulo: string; codigo: string };

const nombreAuto = (a: AutoPublico) => a.marca + " " + a.modelo + " " + a.anio;

// Fotos para los fondos de las páginas: primero los destacados.
export async function getFotosFondo(max = 6): Promise<FotoFondo[]> {
  const autos = await getAutosPublicos("general");
  const conFoto = [...autos]
    .sort((a, b) => Number(!!b.destacado) - Number(!!a.destacado))
    .filter((a) => a.fotos.length > 0);
  const r: FotoFondo[] = conFoto
    .slice(0, max)
    .map((a) => ({ url: a.fotos[0], titulo: nombreAuto(a), codigo: a.codigo }));
  if (r.length < 3 && conFoto[0]) {
    conFoto[0].fotos.slice(1, 4).forEach((u) => {
      r.push({ url: u, titulo: nombreAuto(conFoto[0]), codigo: conFoto[0].codigo });
    });
  }
  return r;
}

// Fotos para /servicios: las de un auto elegido (por código, o la Ford F-150) y,
// si faltan, la primera foto de los autos más nuevos.
export async function getFotosServicios(codigo = "", marca = "ford", modelo = "150"): Promise<string[]> {
  const autos = await getAutosPublicos("general");
  const elegido = codigo
    ? autos.find((a) => a.codigo === codigo)
    : autos.find(
        (a) =>
          a.marca.toLowerCase().includes(marca.toLowerCase()) &&
          a.modelo.toLowerCase().includes(modelo.toLowerCase())
      );
  let lista = elegido ? [...elegido.fotos] : [];
  if (lista.length < 3) {
    lista = [...lista, ...autos.slice(0, 6).flatMap((a) => (a.fotos[0] ? [a.fotos[0]] : []))];
  }
  return lista;
}
