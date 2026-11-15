"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Auto = {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number;
  km: number | null;
  precio: number;
  combustible: string | null;
  transmision: string | null;
  color: string | null;
  descripcion: string | null;
  estado: string;
  fotos: string[];
};

const ESTADOS = [
  { v: "en_preparacion", t: "En preparación" },
  { v: "disponible", t: "Disponible" },
  { v: "reservado", t: "Reservado" },
  { v: "vendido", t: "Vendido" },
];

const VACIO = {
  marca: "",
  modelo: "",
  version: "",
  anio: "",
  km: "",
  precio: "",
  combustible: "",
  transmision: "",
  color: "",
  descripcion: "",
  estado: "disponible",
};

async function reducir(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const max = 1600;
  const esc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * esc);
  c.height = Math.round(bmp.height * esc);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, fallo) =>
    c.toBlob(
      (b) => (b ? ok(b) : fallo(new Error("No se pudo procesar la foto"))),
      "image/jpeg",
      0.85
    )
  );
}

export default function Admin() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [automotoraId, setAutomotoraId] = useState<string | null>(null);
  const [autos, setAutos] = useState<Auto[]>([]);
  const [form, setForm] = useState(VACIO);
  const [editId, setEditId] = useState<string | null>(null);
  const [fotosActuales, setFotosActuales] = useState<string[]>([]);
  const [nuevas, setNuevas] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setListo(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const cargar = useCallback(async () => {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("automotora_id")
      .maybeSingle();
    if (!perfil) {
      setMsg("Tu usuario no está vinculado a una automotora.");
      return;
    }
    setAutomotoraId(perfil.automotora_id);
    const { data } = await supabase
      .from("autos")
      .select("*")
      .eq("automotora_id", perfil.automotora_id)
      .order("creado_en", { ascending: false });
    setAutos((data as Auto[]) ?? []);
  }, []);

  useEffect(() => {
    if (sesion) cargar();
  }, [sesion, cargar]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErrorLogin("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: clave,
    });
    if (error) setErrorLogin("Correo o contraseña incorrectos.");
  }

  function campo(k: keyof typeof VACIO) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => setForm({ ...form, [k]: e.target.value });
  }

  function limpiar() {
    setForm(VACIO);
    setEditId(null);
    setFotosActuales([]);
    setNuevas([]);
    setInputKey((k) => k + 1);
  }

  function editar(a: Auto) {
    setEditId(a.id);
    setForm({
      marca: a.marca,
      modelo: a.modelo,
      version: a.version ?? "",
      anio: String(a.anio),
      km: a.km ? String(a.km) : "",
      precio: String(a.precio),
      combustible: a.combustible ?? "",
      transmision: a.transmision ?? "",
      color: a.color ?? "",
      descripcion: a.descripcion ?? "",
      estado: a.estado,
    });
    setFotosActuales(a.fotos ?? []);
    setNuevas([]);
    setInputKey((k) => k + 1);
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!automotoraId) return;
    setGuardando(true);
    setMsg("");
    try {
      const urls: string[] = [...fotosActuales];
      for (const f of nuevas) {
        const blob = await reducir(f);
        const ruta =
          automotoraId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
        const { error } = await supabase.storage
          .from("autos")
          .upload(ruta, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        urls.push(supabase.storage.from("autos").getPublicUrl(ruta).data.publicUrl);
      }
      const datos = {
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        version: form.version.trim() || null,
        anio: Number(form.anio),
        km: form.km ? Number(form.km) : null,
        precio: Number(form.precio),
        combustible: form.combustible.trim() || null,
        transmision: form.transmision.trim() || null,
        color: form.color.trim() || null,
        descripcion: form.descripcion.trim() || null,
        estado: form.estado,
        fotos: urls,
      };
      const r = editId
        ? await supabase.from("autos").update(datos).eq("id", editId)
        : await supabase.from("autos").insert({ ...datos, automotora_id: automotoraId });
      if (r.error) throw r.error;
      setMsg(editId ? "Auto actualizado." : "Auto guardado.");
      limpiar();
      await cargar();
    } catch (err) {
      setMsg("Error: " + ((err as { message?: string }).message ?? "no se pudo guardar"));
    }
    setGuardando(false);
  }

  async function cambiarEstado(a: Auto, estado: string) {
    const { error } = await supabase.from("autos").update({ estado }).eq("id", a.id);
    if (error) setMsg("Error: " + error.message);
    else cargar();
  }

  async function borrar(a: Auto) {
    if (!confirm("¿Borrar " + a.marca + " " + a.modelo + " (" + a.codigo + ")? No se puede deshacer.")) return;
    const { error } = await supabase.from("autos").delete().eq("id", a.id);
    if (error) setMsg("Error: " + error.message);
    else cargar();
  }

  const cuenta = (e: string) => autos.filter((a) => a.estado === e).length;

  if (!listo) return null;

  if (!sesion) {
    return (
      <main className="adm" style={{ maxWidth: 420 }}>
        <h1>Panel de administrador</h1>
        <p className="sub">Ingresa con tu correo y contraseña.</p>
        <form onSubmit={entrar}>
          <label>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label>
            Contraseña
            <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="current-password" />
          </label>
          <button className="btn fill" type="submit">Entrar</button>
          {errorLogin && <p className="adm-msg">{errorLogin}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="adm">
      <div className="adm-top">
        <h1>Panel de autos</h1>
        <div className="acc">
          <a className="btn" href="/">Ver la página</a>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </div>

      <div className="adm-cuentas">
        <div className="adm-cuenta"><b>{cuenta("disponible")}</b>Disponibles</div>
        <div className="adm-cuenta"><b>{cuenta("reservado")}</b>Reservados</div>
        <div className="adm-cuenta"><b>{cuenta("en_preparacion")}</b>En preparación</div>
        <div className="adm-cuenta"><b>{cuenta("vendido")}</b>Vendidos</div>
      </div>

      <form className="adm-form" onSubmit={guardar}>
        <h2>{editId ? "Editar auto" : "Agregar auto"}</h2>
        <div className="adm-fila">
          <label>Marca<input value={form.marca} onChange={campo("marca")} required /></label>
          <label>Modelo<input value={form.modelo} onChange={campo("modelo")} required /></label>
          <label>Versión<input value={form.version} onChange={campo("version")} /></label>
          <label>Año<input type="number" value={form.anio} onChange={campo("anio")} required /></label>
          <label>Kilometraje<input type="number" value={form.km} onChange={campo("km")} /></label>
          <label>Precio (CLP)<input type="number" value={form.precio} onChange={campo("precio")} required /></label>
          <label>Combustible<input value={form.combustible} onChange={campo("combustible")} placeholder="Bencina, diésel..." /></label>
          <label>Transmisión<input value={form.transmision} onChange={campo("transmision")} placeholder="Manual, automática" /></label>
          <label>Color<input value={form.color} onChange={campo("color")} /></label>
          <label>
            Estado
            <select value={form.estado} onChange={campo("estado")}>
              {ESTADOS.map((s) => (
                <option key={s.v} value={s.v}>{s.t}</option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ display: "block", marginTop: 12 }}>
          Descripción
          <textarea rows={3} value={form.descripcion} onChange={campo("descripcion")} />
        </label>

        <label style={{ display: "block", marginTop: 12 }}>
          Fotos (la primera es la portada)
          <input
            key={inputKey}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setNuevas(Array.from(e.target.files ?? []))}
          />
        </label>
        <div className="adm-fotos">
          {fotosActuales.map((u) => (
            <div key={u}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="Foto del auto" />
              <button type="button" onClick={() => setFotosActuales(fotosActuales.filter((x) => x !== u))}>×</button>
            </div>
          ))}
        </div>
        {nuevas.length > 0 && <p className="adm-msg">{nuevas.length} foto(s) nueva(s) por subir.</p>}

        <div className="acc" style={{ marginTop: 14 }}>
          <button className="btn fill" type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : editId ? "Guardar cambios" : "Guardar auto"}
          </button>
          {editId && <button type="button" className="btn" onClick={limpiar}>Cancelar</button>}
        </div>
        {msg && <p className="adm-msg">{msg}</p>}
      </form>

      <h2>Mis autos</h2>
      {autos.length === 0 && <p className="sub">Aún no hay autos cargados.</p>}
      {autos.map((a) => (
        <div className="adm-item" key={a.id}>
          {a.fotos && a.fotos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.fotos[0]} alt="" />
          ) : (
            <div className="adm-sinfoto" />
          )}
          <div>
            <strong>{a.marca} {a.modelo} {a.anio}</strong>
            <div className="dat">Ref {a.codigo} · ${a.precio.toLocaleString("es-CL")}</div>
          </div>
          <div className="adm-acc">
            <select value={a.estado} onChange={(e) => cambiarEstado(a, e.target.value)}>
              {ESTADOS.map((s) => (
                <option key={s.v} value={s.v}>{s.t}</option>
              ))}
            </select>
            <button className="btn" onClick={() => editar(a)}>Editar</button>
            <button className="btn" onClick={() => borrar(a)}>Borrar</button>
          </div>
        </div>
      ))}
    </main>
  );
}
