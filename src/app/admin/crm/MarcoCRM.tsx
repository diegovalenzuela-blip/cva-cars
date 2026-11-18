"use client";

import "../admin.css";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AccesoAdmin from "../AccesoAdmin";
import { cargarAutosCRM, ErrorCRM, marcarAutoVendido, obtenerAutomotora } from "./datos";
import type { AutoCRM } from "./tipos";

export type ContextoCRM = {
  automotoraId: string;
  autos: AutoCRM[];
  avisar: (texto: string, error?: boolean) => void;
  marcarVendido: (id: string) => Promise<void>;
};

export default function MarcoCRM({
  titulo,
  acciones,
  children,
}: {
  titulo: string;
  acciones?: ReactNode;
  children: (contexto: ContextoCRM) => ReactNode;
}) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [automotoraId, setAutomotoraId] = useState<string | null>(null);
  const [autos, setAutos] = useState<AutoCRM[]>([]);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);

  const avisar = useCallback((texto: string, error = false) => setAviso({ texto, error }), []);

  useEffect(() => {
    if (!aviso) return;
    const id = window.setTimeout(() => setAviso(null), aviso.error ? 7000 : 3500);
    return () => window.clearTimeout(id);
  }, [aviso]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setListo(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const usuario = sesion?.user.id;
  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    (async () => {
      try {
        const id = await obtenerAutomotora();
        if (!vigente) return;
        if (!id) {
          avisar("Tu usuario no está vinculado a una automotora.", true);
          return;
        }
        setAutomotoraId(id);
        const lista = await cargarAutosCRM(id);
        if (vigente) setAutos(lista);
      } catch (e) {
        if (vigente) avisar(e instanceof ErrorCRM ? e.message : "No se pudo cargar el CRM.", true);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [usuario, avisar]);

  if (!listo) return null;
  if (!sesion) return <AccesoAdmin titulo={titulo} />;

  const marcarVendido = async (id: string) => {
    const auto = autos.find((a) => a.id === id);
    try {
      await marcarAutoVendido(id, automotoraId!);
      setAutos((lista) => lista.map((a) => (a.id === id ? { ...a, estado: "vendido" } : a)));
      if (auto) avisar(auto.marca + " " + auto.modelo + ": Vendido.");
    } catch (e) {
      avisar(e instanceof ErrorCRM ? e.message : "No se pudo actualizar el vehículo.", true);
    }
  };

  return (
    <main className="adm ap">
      <header className="ap-top">
        <div>
          <span className="ap-marca">Chillán Vende Autos</span>
          <h1>{titulo}</h1>
        </div>
        <div className="ap-top-acc">
          {acciones}
          <Link className="btn" href="/admin">Panel de autos</Link>
          <button type="button" className="btn" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      {automotoraId && children({ automotoraId, autos, avisar, marcarVendido })}

      {aviso && (
        <div className={"ap-aviso" + (aviso.error ? " error" : "")} role="status" aria-live="polite">
          <span>{aviso.texto}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">×</button>
        </div>
      )}
    </main>
  );
}
