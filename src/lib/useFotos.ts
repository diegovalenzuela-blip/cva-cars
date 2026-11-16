"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SLUG } from "@/lib/datos";

type Fila = { marca: string; modelo: string; fotos: string[] | null };

export function useFotos(): string[] {
  const [fotos, setFotos] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("autos")
      .select("marca,modelo,fotos,automotoras!inner(slug)")
      .eq("automotoras.slug", SLUG)
      .in("estado", ["disponible", "reservado"])
      .order("creado_en", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        const filas = (data as unknown as Fila[] | null) ?? [];
        const preferida = filas.find((f) => /ford/i.test(f.marca) && /150/.test(f.modelo));
        const lista = [
          ...(preferida?.fotos ?? []),
          ...filas.filter((f) => f !== preferida).map((f) => (f.fotos ?? [])[0]),
        ].filter(Boolean) as string[];
        setFotos(lista);
      });
  }, []);

  return fotos;
}
