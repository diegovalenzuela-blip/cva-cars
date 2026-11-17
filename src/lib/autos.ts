import { supabase } from "@/lib/supabase";
import { SLUG } from "@/lib/datos";

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
};

export async function getAutosPublicos(): Promise<AutoPublico[]> {
  try {
    const { data, error } = await supabase
      .from("autos")
      .select("*, automotoras!inner(slug)")
      .eq("automotoras.slug", SLUG)
      .in("estado", ["disponible", "reservado"])
      .order("creado_en", { ascending: false });

    if (error || !data) return [];

    return (data as unknown as Fila[]).map((a) => ({
      id: a.id,
      codigo: a.codigo,
      marca: a.marca,
      modelo: a.modelo,
      anio: a.anio,
      km: a.km ?? null,
      precio: a.precio,
      estado: a.estado,
      fotos: a.fotos ?? [],
      ubicacion: a.ubicacion ?? null,
      tipo: a.tipo ?? null,
      destacado: a.destacado ?? false,
    }));
  } catch {
    return [];
  }
}
