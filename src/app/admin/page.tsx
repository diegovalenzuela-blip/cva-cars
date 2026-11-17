"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type FotoAdmin = {
  id: string;
  url?: string;
  file?: File;
  preview: string;
};

type Auto = {
    duenos: number | null;
  id: string;
  publicado: boolean;
  codigo: string;
  en_exhibicion: boolean;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number;
  km: number | null;
  precio: number;
  combustible: string | null;
  transmision: string | null;
  color: string | null;
  tipo: string | null;
  ubicacion: string | null;
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

const UBICACIONES = [
  "Chillán", "Chillán Viejo", "Bulnes", "San Carlos", "Quillón", "Coihueco",
  "Pinto", "Yungay", "El Carmen", "Pemuco", "San Ignacio", "Quirihue",
  "Coelemu", "Cobquecura", "Ninhue", "Ñiquén", "Portezuelo", "Ránquil",
  "San Fabián", "San Nicolás", "Treguaco", "Concepción", "Los Ángeles", "Santiago",
];

const TIPOS = ["Auto", "SUV", "Camioneta", "Furgón", "Moto", "Camión", "Otro"];

const VACIO = {
  marca: "",
  modelo: "",
  version: "",
  anio: "",
  km: "",
  duenos: "",
  precio: "",
  combustible: "",
  transmision: "",
  color: "",
  tipo: "Auto",
  ubicacion: "Chillán",
    descripcion: "",
  estado: "disponible",
};

async function reducir(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const max = 1280;
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
  const [busqueda, setBusqueda] = useState("");
const [filtroEstado, setFiltroEstado] = useState("todos");
  const [publicadoForm, setPublicadoForm] = useState(true);
  const [form, setForm] = useState(VACIO);
  const [editId, setEditId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<FotoAdmin[]>([]);
  const [fotoArrastrada, setFotoArrastrada] = useState<number | null>(null);
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
    setPublicadoForm(true);
    setEditId(null);
    fotos.forEach((foto) => {
      if (foto.file) URL.revokeObjectURL(foto.preview);
    });
    setFotos([]);
    setFotoArrastrada(null);
    setInputKey((k) => k + 1);
  }

  function editar(a: Auto) {
    setEditId(a.id);
    setPublicadoForm(a.publicado);
    setForm({
      marca: a.marca,
      modelo: a.modelo,
      version: a.version ?? "",
      anio: a.anio ? String(a.anio) : "",
      km: a.km ? String(a.km) : "",
      duenos: a.duenos == null ? "" : String(a.duenos),
      precio: a.precio ? String(a.precio) : "",
      combustible: a.combustible ?? "",
      transmision: a.transmision ?? "",
      color: a.color ?? "",
      tipo: a.tipo ?? "",
      ubicacion: a.ubicacion ?? "",
      descripcion: a.descripcion ?? "",
      estado: a.estado,
    });
    fotos.forEach((foto) => {
      if (foto.file) URL.revokeObjectURL(foto.preview);
    });
    setFotos((a.fotos ?? []).map((url, i) => ({
      id: `existente-${i}-${url}`,
      url,
      preview: url,
    })));
    setFotoArrastrada(null);
    setInputKey((k) => k + 1);
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function moverFoto(indice: number, direccion: -1 | 1) {
    setFotos((lista) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= lista.length) return lista;
      const copia = [...lista];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  function reordenarFotos(origen: number, destino: number) {
    setFotos((lista) => {
      if (destino < 0 || destino >= lista.length || origen === destino) return lista;
      const copia = [...lista];
      const [movida] = copia.splice(origen, 1);
      copia.splice(destino, 0, movida);
      return copia;
    });
    setFotoArrastrada(null);
  }

  function quitarFoto(indice: number) {
    setFotos((lista) => {
      const copia = [...lista];
      const [quitada] = copia.splice(indice, 1);
      if (quitada?.file) URL.revokeObjectURL(quitada.preview);
      return copia;
    });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!automotoraId) return;

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publicar =
      submitter?.dataset.publicado === "true" ? true :
      submitter?.dataset.publicado === "false" ? false :
      publicadoForm;

    if (
      publicar &&
      (!form.marca.trim() ||
        !form.modelo.trim() ||
        Number(form.anio) <= 0 ||
        Number(form.precio) <= 0)
    ) {
      setMsg("Para publicar debes completar marca, modelo, año y precio.");
      return;
    }

    setGuardando(true);
    setMsg("");
    try {
      const urls: string[] = [];
      for (const foto of fotos) {
        if (foto.url) {
          urls.push(foto.url);
          continue;
        }
        if (!foto.file) continue;
        const blob = await reducir(foto.file);
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
        anio: Number(form.anio) || 0,
        km: form.km ? Number(form.km) : null,
duenos: form.duenos ? Number(form.duenos) : null,
precio: Number(form.precio) || 0,
        combustible: form.combustible.trim() || null,
        transmision: form.transmision.trim() || null,
        color: form.color.trim() || null,
        tipo: form.tipo || null,
        ubicacion: form.ubicacion.trim() || null,
        descripcion: form.descripcion.trim() || null,
        estado: form.estado,
        publicado: publicar,
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
  const datos = {
    estado,
    ...(estado === "vendido" || estado === "en_preparacion"
      ? { en_exhibicion: false }
      : {}),
  };

  const { error } = await supabase
    .from("autos")
    .update(datos)
    .eq("id", a.id)
    .eq("automotora_id", automotoraId!);

  if (error) setMsg("Error: " + error.message);
  else {
    setMsg("Estado actualizado.");
    await cargar();
  }
}

async function cambiarExhibicion(a: Auto) {
  if (!a.publicado) {
    setMsg("Primero debes publicar el auto para agregarlo a exhibición.");
    return;
  }

  const seleccionados = autos.filter(
    (x) => x.en_exhibicion &&
      ["disponible", "reservado"].includes(x.estado)
  ).length;

  if (!a.en_exhibicion && seleccionados >= 8) {
    setMsg("Ya tienes 8 autos en exhibición. Quita uno antes de agregar otro.");
    return;
  }

  if (
    !a.en_exhibicion &&
    !["disponible", "reservado"].includes(a.estado)
  ) {
    setMsg("Solo puedes seleccionar autos disponibles o reservados.");
    return;
  }

  setMsg("");

  const { error } = await supabase
    .from("autos")
    .update({ en_exhibicion: !a.en_exhibicion })
    .eq("id", a.id)
    .eq("automotora_id", automotoraId!);

  if (error) {
    setMsg("Error al actualizar exhibición: " + error.message);
  } else {
    setMsg(
      a.en_exhibicion
        ? "Auto quitado de exhibición."
        : "Auto agregado a exhibición."
    );
    await cargar();
  }
}
  async function borrar(a: Auto) {
    if (!confirm("¿Borrar " + a.marca + " " + a.modelo + " (" + a.codigo + ")? No se puede deshacer.")) return;
    const { error } = await supabase.from("autos").delete().eq("id", a.id);
    if (error) setMsg("Error: " + error.message);
    else cargar();
  }

  const cuenta = (e: string) =>
    autos.filter((a) => a.publicado && a.estado === e).length;

  const cuentaBorradores = autos.filter((a) => !a.publicado).length;

  const autosExhibicion = autos.filter(
    (a) =>
      a.publicado &&
      a.en_exhibicion &&
      ["disponible", "reservado"].includes(a.estado)
  );

  const autosFiltrados = autos.filter((a) => {
  const termino = busqueda.trim().toLowerCase();

  const coincideTexto =
    !termino ||
    [
      a.marca,
      a.modelo,
      a.codigo,
      String(a.anio),
      a.version ?? "",
    ].some((valor) => valor.toLowerCase().includes(termino));

  const coincideEstado =
    filtroEstado === "todos" ||
    (filtroEstado === "borradores"
      ? !a.publicado
      : a.publicado && a.estado === filtroEstado);

  return coincideTexto && coincideEstado;
});

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
        <button type="button" className={"adm-cuenta " + (filtroEstado === "todos" ? "activa" : "")} onClick={() => setFiltroEstado("todos")} aria-pressed={filtroEstado === "todos"}>
          <b>{autos.length}</b>Todos los autos
        </button>
        <button type="button" className={"adm-cuenta " + (filtroEstado === "disponible" ? "activa" : "")} onClick={() => setFiltroEstado("disponible")} aria-pressed={filtroEstado === "disponible"}>
          <b>{cuenta("disponible")}</b>Disponibles
        </button>
        <button type="button" className={"adm-cuenta " + (filtroEstado === "reservado" ? "activa" : "")} onClick={() => setFiltroEstado("reservado")} aria-pressed={filtroEstado === "reservado"}>
          <b>{cuenta("reservado")}</b>Reservados
        </button>
        <button type="button" className={"adm-cuenta " + (filtroEstado === "en_preparacion" ? "activa" : "")} onClick={() => setFiltroEstado("en_preparacion")} aria-pressed={filtroEstado === "en_preparacion"}>
          <b>{cuenta("en_preparacion")}</b>En preparación
        </button>
        <button type="button" className={"adm-cuenta " + (filtroEstado === "vendido" ? "activa" : "")} onClick={() => setFiltroEstado("vendido")} aria-pressed={filtroEstado === "vendido"}>
          <b>{cuenta("vendido")}</b>Vendidos
        </button>
        <button type="button" className={"adm-cuenta " + (filtroEstado === "borradores" ? "activa" : "")} onClick={() => setFiltroEstado("borradores")} aria-pressed={filtroEstado === "borradores"}>
          <b>{cuentaBorradores}</b>Borradores
        </button>
      </div>

      <form className="adm-form" onSubmit={guardar}>
        <h2>{editId ? "Editar auto" : "Agregar auto"}</h2>
        <div className="adm-fila">
          <label>Marca<input value={form.marca} onChange={campo("marca")} /></label>
          <label>Modelo<input value={form.modelo} onChange={campo("modelo")} /></label>
          <label>Versión<input value={form.version} onChange={campo("version")} /></label>
          <label>Año<input type="number" value={form.anio} onChange={campo("anio")} /></label>
          <label>Kilometraje<input type="number" value={form.km} onChange={campo("km")} /></label>
          <label>Número de dueños<input type="number" min="0" step="1" value={form.duenos} onChange={campo("duenos")} placeholder="Ej. 2" /></label>
          <label>Precio (CLP)<input type="number" value={form.precio} onChange={campo("precio")} /></label>
          <label>Combustible<input value={form.combustible} onChange={campo("combustible")} placeholder="Bencina, diésel..." /></label>
          <label>Transmisión<input value={form.transmision} onChange={campo("transmision")} placeholder="Manual, automática" /></label>
          <label>Color<input value={form.color} onChange={campo("color")} /></label>
          <label>
            Tipo
            <select value={form.tipo} onChange={campo("tipo")}>
              <option value="">Sin definir</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>Ubicación<input list="ubicaciones" value={form.ubicacion} onChange={campo("ubicacion")} placeholder="Chillán, Bulnes..." /></label>
          <datalist id="ubicaciones">
            {UBICACIONES.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
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
          Agregar fotografías
          <input
            key={inputKey}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const archivos = Array.from(e.target.files ?? []);
              setFotos((lista) => [
                ...lista,
                ...archivos.map((file) => ({
                  id: `${Date.now()}-${Math.random()}`,
                  file,
                  preview: URL.createObjectURL(file),
                })),
              ]);
              setInputKey((k) => k + 1);
            }}
          />
        </label>

        <p className="adm-msg">
          Ordena las fotografías arrastrándolas o usando las flechas.
          La primera será la portada.
        </p>

        <div className="adm-fotos">
          {fotos.map((foto, i) => (
            <div
              key={foto.id}
              draggable
              onDragStart={() => setFotoArrastrada(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (fotoArrastrada !== null) {
                  reordenarFotos(fotoArrastrada, i);
                }
              }}
              onDragEnd={() => setFotoArrastrada(null)}
              className={fotoArrastrada === i ? "adm-foto-arrastrada" : ""}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.preview} alt={`Foto ${i + 1} del auto`} />

              <span className="adm-foto-posicion">
                {i === 0 ? "PORTADA" : `FOTO ${i + 1}`}
              </span>

              <div className="adm-foto-controles">
                <button
                  type="button"
                  title="Mover a la izquierda"
                  aria-label="Mover fotografía hacia adelante"
                  disabled={i === 0}
                  onClick={() => moverFoto(i, -1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  title="Mover a la derecha"
                  aria-label="Mover fotografía hacia atrás"
                  disabled={i === fotos.length - 1}
                  onClick={() => moverFoto(i, 1)}
                >
                  →
                </button>
                <button
                  type="button"
                  title="Eliminar fotografía"
                  aria-label="Eliminar fotografía"
                  onClick={() => quitarFoto(i)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {fotos.length > 0 && (
          <p className="adm-msg">
            {fotos.length} fotografía(s) en la lista.
          </p>
        )}

        <div className="acc" style={{ marginTop: 14 }}>
          {editId && (
            <button
              className="btn"
              type="submit"
              data-publicado={String(publicadoForm)}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          )}
          <button
            className="btn"
            type="submit"
            data-publicado="false"
            disabled={guardando}
          >
            Guardar como borrador
          </button>
          <button
            className="btn fill"
            type="submit"
            data-publicado="true"
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Publicar auto"}
          </button>
          {editId && (
            <button type="button" className="btn" onClick={limpiar}>
              Cancelar
            </button>
          )}
        </div>
        {msg && <p className="adm-msg">{msg}</p>}
      </form>

      <section className="adm-exhibicion">
        <div className="adm-exhibicion-titulo">
          <div>
            <h2>Autos en exhibición</h2>
            <p className="sub">
              Vehículos que se muestran como destacados en la página pública.
            </p>
          </div>
          <strong>{autosExhibicion.length} / 8 seleccionados</strong>
        </div>

        {autosExhibicion.length === 0 ? (
          <p className="adm-exhibicion-vacio">
            Todavía no tienes autos seleccionados para exhibición.
            Puedes agregarlos desde la lista de Mis autos.
          </p>
        ) : (
          <div className="adm-exhibicion-lista">
            {autosExhibicion.map((a) => (
              <article className="adm-exhibicion-auto" key={a.id}>
                <div className="adm-exhibicion-foto">
                  {a.fotos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.fotos[0]} alt={`${a.marca} ${a.modelo}`} />
                  ) : (
                    <span>Sin foto</span>
                  )}
                </div>

                <div className="adm-exhibicion-datos">
                  <strong>{a.marca} {a.modelo}</strong>
                  <span>{a.anio} · Ref. {a.codigo}</span>
                  <b>${a.precio.toLocaleString("es-CL")}</b>
                </div>

                <button
                  type="button"
                  className="btn"
                  onClick={() => cambiarExhibicion(a)}
                  title="Quitar este vehículo de exhibición"
                >
                  Quitar
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <div style={{ marginBottom: 20 }}>
  <h2>Mis autos</h2>
  <p className="sub">
    Seleccionados para exhibición: {
      autos.filter(
        (a) => a.publicado && a.en_exhibicion &&
          ["disponible", "reservado"].includes(a.estado)
      ).length
    } de 8
  </p>
</div>
<div style={{
  display: "grid",
  gridTemplateColumns: "minmax(220px, 2fr) minmax(180px, 1fr)",
  gap: 12,
  marginBottom: 18
}}>
  <label>
    Buscar auto
    <input
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      placeholder="Marca, modelo, año o código..."
    />
  </label>

  <label>
    Filtrar por estado
    <select
      value={filtroEstado}
      onChange={(e) => setFiltroEstado(e.target.value)}
    >
      <option value="todos">Todos los estados</option>
      <option value="borradores">Borradores</option>
      {ESTADOS.map((s) => (
        <option key={s.v} value={s.v}>{s.t}</option>
      ))}
    </select>
  </label>
</div>
      {autos.length === 0 && <p className="sub">Aún no hay autos cargados.</p>}
      {autos.length > 0 && autosFiltrados.length === 0 && (
  <p className="sub">No encontramos autos con esos criterios.</p>
)}
      {autosFiltrados.map((a) => (
        <article className="adm-item adm-item-nuevo" key={a.id}>
          <div className="adm-item-foto">
            {a.fotos && a.fotos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.fotos[0]} alt={`${a.marca} ${a.modelo}`} />
            ) : (
              <div className="adm-sinfoto">Sin fotografía</div>
            )}
            <span className="adm-item-numfotos">
              {a.fotos?.length ?? 0} fotos
            </span>
          </div>

          <div className="adm-item-info">
            <div className="adm-item-encabezado">
              {!a.publicado ? (
                <span className="adm-estado adm-borrador">Borrador</span>
              ) : (
                <span className={`adm-estado adm-estado-${a.estado}`}>
                  {ESTADOS.find((s) => s.v === a.estado)?.t ?? a.estado}
                </span>
              )}
              {a.publicado && a.en_exhibicion && (
                <span className="adm-en-exhibicion">En exhibición</span>
              )}
            </div>

            <h3>{a.marca || "Sin marca"} {a.modelo || "Sin modelo"}</h3>
            {a.version && <p className="adm-item-version">{a.version}</p>}

            <strong className="adm-item-precio">
              {a.precio > 0
                ? `$${a.precio.toLocaleString("es-CL")}`
                : "Precio pendiente"}
            </strong>

            <div className="adm-item-datos">
              <span>{a.anio > 0 ? a.anio : "Año pendiente"}</span>
              <span>Ref. {a.codigo}</span>
              {a.km != null && <span>{a.km.toLocaleString("es-CL")} km</span>}
              {a.ubicacion && <span>{a.ubicacion}</span>}
            </div>
          </div>

          <div className="adm-acc adm-item-acciones">
            <button
              type="button"
              className={"btn " + (a.en_exhibicion ? "fill" : "")}
              onClick={() => cambiarExhibicion(a)}
              disabled={
                !a.publicado ||
                (!a.en_exhibicion &&
                  (
                    !["disponible", "reservado"].includes(a.estado) ||
                    autos.filter(
                      (x) => x.publicado && x.en_exhibicion &&
                        ["disponible", "reservado"].includes(x.estado)
                    ).length >= 8
                  ))
              }
              title="Seleccionar o quitar de autos en exhibición"
            >
              {a.en_exhibicion ? "Quitar de exhibición" : "Agregar a exhibición"}
            </button>

            <label className="adm-item-cambiar-estado">
              Cambiar estado
              <select
                value={a.estado}
                onChange={(e) => cambiarEstado(a, e.target.value)}
              >
                {ESTADOS.map((s) => (
                  <option key={s.v} value={s.v}>{s.t}</option>
                ))}
              </select>
            </label>

            <div className="adm-item-botones">
              <button type="button" className="btn fill" onClick={() => editar(a)}>
                Editar vehículo
              </button>
              <button type="button" className="btn" onClick={() => borrar(a)}>
                Borrar
              </button>
            </div>
          </div>
        </article>
      ))}
    </main>
  );
}
