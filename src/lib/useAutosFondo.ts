"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SLUG } from "@/lib/datos";

export type FotoFondo = { url: string; titulo: string; codigo: string };

type Fila = {
  codigo: string;
  marca: string;
  modelo: string;
  anio: number;
  fotos: string[] | null;
  destacado?: boolean | null;
};

export function useAutosFondo(max = 6): FotoFondo[] {
  const [lista, setLista] = useState<FotoFondo[]>([]);

  useEffect(() => {
    let vivo = true;

    async function cargar() {
      const con = await supabase
        .from("autos")
        .select("codigo,marca,modelo,anio,fotos,destacado,automotoras!inner(slug)")
        .eq("automotoras.slug", SLUG)
        .in("estado", ["disponible", "reservado"])
        .order("creado_en", { ascending: false })
        .limit(30);

      let filas = con.data as unknown as Fila[] | null;

      if (con.error || !filas) {
        const sin = await supabase
          .from("autos")
          .select("codigo,marca,modelo,anio,fotos,automotoras!inner(slug)")
          .eq("automotoras.slug", SLUG)
          .in("estado", ["disponible", "reservado"])
          .order("creado_en", { ascending: false })
          .limit(30);
        filas = sin.data as unknown as Fila[] | null;
      }

      const ordenadas = [...(filas ?? [])].sort(
        (a, b) => Number(!!b.destacado) - Number(!!a.destacado)
      );
      const conFoto = ordenadas.filter((f) => f.fotos && f.fotos.length > 0);

      const nombre = (f: Fila) => f.marca + " " + f.modelo + " " + f.anio;
      const r: FotoFondo[] = conFoto
        .slice(0, max)
        .map((f) => ({ url: (f.fotos as string[])[0], titulo: nombre(f), codigo: f.codigo }));

      if (r.length < 3 && conFoto[0]) {
        const f = conFoto[0];
        (f.fotos as string[]).slice(1, 4).forEach((u) => {
          r.push({ url: u, titulo: nombre(f), codigo: f.codigo });
        });
      }

      if (vivo) setLista(r);
    }

    cargar();
    return () => {
      vivo = false;
    };
  }, [max]);

  return lista;
}
