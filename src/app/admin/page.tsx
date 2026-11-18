"use client";

import "./admin.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AccesoAdmin from "./AccesoAdmin";
import AutocompletarTexto from "./AutocompletarTexto";
import { esHeic, esImagenAdmitida, extensionFoto, puedeAbrirse } from "./fotos";

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
  catalogo: Catalogo;
  estado_papeles: string | null;
  mantenciones: string | null;
  revision_tecnica: string | null;
  creado_en?: string;
};

type Suscriptor = {
  id: string;
  email: string;
  telefono: string;
  origen: string | null;
  creado_en: string;
};

type Catalogo = "general" | "trabajo";
type Pestana = "inventario" | "trabajo" | "publicar" | "exhibicion" | "suscriptores";

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

// Sugerencias para escribir más rápido (se puede escribir cualquier otro valor).
const MARCAS = [
  "Audi", "BMW", "Changan", "Chery", "Chevrolet", "Citroën", "Dodge", "Fiat", "Ford", "Geely",
  "Great Wall", "Haval", "Honda", "Hyundai", "JAC", "Jaguar", "Jeep", "Kia", "KTM", "Maserati",
  "Maxus", "Mazda", "Mercedes-Benz", "MG", "Mitsubishi", "Nissan", "Peugeot", "RAM", "Renault",
  "Samsung", "SsangYong", "Subaru", "Suzuki", "Toyota", "Volkswagen", "Volvo",
];
const COMBUSTIBLES = ["Bencina", "Diésel", "Híbrido", "Eléctrico", "Gas"];
const TRANSMISIONES = ["Manual", "Automática"];
const COLORES = ["Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul", "Verde", "Café", "Beige"];

const MAX_EXHIBICION = 7;

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
  catalogo: "general" as Catalogo,
  estado_papeles: "",
  mantenciones: "",
  revision_tecnica: "",
};

const plata = (n: number) => "$" + n.toLocaleString("es-CL");
const enVitrina = (a: Auto) =>
  a.catalogo !== "trabajo" && a.publicado && a.en_exhibicion && ["disponible", "reservado"].includes(a.estado);
const visiblePublico = (a: Auto) => a.publicado && ["disponible", "reservado"].includes(a.estado);

const rutaFoto = (automotoraId: string, extension: string) =>
  automotoraId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + extension;

async function reducir(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const max = 1280;
    const esc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * esc);
    c.height = Math.round(bmp.height * esc);

    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la foto");

    ctx.drawImage(bmp, 0, 0, c.width, c.height);

    const generar = (tipo: string, calidad: number) =>
      new Promise<Blob>((ok, fallo) =>
        c.toBlob(
          (b) => (b ? ok(b) : fallo(new Error("No se pudo procesar la foto"))),
          tipo,
          calidad
        )
      );

    // Safari no genera WebP: en ese caso la foto se sube como JPG.
    let blob = await generar("image/webp", 0.8);
    if (!extensionFoto(blob.type)) blob = await generar("image/jpeg", 0.85);
    if (!extensionFoto(blob.type)) throw new Error("Este navegador no pudo preparar la foto");

    return blob;
  } finally {
    bmp.close();
  }
}

export default function Admin() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [automotoraId, setAutomotoraId] = useState<string | null>(null);
  const [autos, setAutos] = useState<Auto[]>([]);
  const [pestana, setPestana] = useState<Pestana>("inventario");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [orden, setOrden] = useState("recientes");
  const [publicadoForm, setPublicadoForm] = useState(true);
  const [form, setForm] = useState(VACIO);
  const [editId, setEditId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<FotoAdmin[]>([]);
  const [fotoArrastrada, setFotoArrastrada] = useState<number | null>(null);
  const [soltando, setSoltando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [claveAutocompletar, setClaveAutocompletar] = useState(0);
  const [preparandoFotos, setPreparandoFotos] = useState("");
  const [avisoFotos, setAvisoFotos] = useState("");
  const tandaFotos = useRef(0);
  const [suscriptores, setSuscriptores] = useState<Suscriptor[]>([]);
  const [busquedaSus, setBusquedaSus] = useState("");
  const [errorSus, setErrorSus] = useState("");

  // Avisos flotantes: se ven estés donde estés en el panel.
  const avisar = useCallback((texto: string, error = false) => {
    setAviso({ texto, error });
  }, []);
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

  const cargar = useCallback(async () => {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("automotora_id")
      .maybeSingle();
    if (!perfil) {
      avisar("Tu usuario no está vinculado a una automotora.", true);
      return;
    }
    setAutomotoraId(perfil.automotora_id);
    const { data } = await supabase
      .from("autos")
      .select("*")
      .eq("automotora_id", perfil.automotora_id)
      .order("creado_en", { ascending: false });
    setAutos((data as Auto[]) ?? []);
  }, [avisar]);

  const cargarSuscriptores = useCallback(async () => {
    const { data, error } = await supabase
      .from("suscriptores")
      .select("id,email,telefono,origen,creado_en")
      .order("creado_en", { ascending: false });
    if (error) {
      setErrorSus("No se pudo cargar la lista de suscriptores: " + error.message);
      return;
    }
    setErrorSus("");
    setSuscriptores((data as Suscriptor[]) ?? []);
  }, []);

  useEffect(() => {
    if (!sesion) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del panel al iniciar sesión
    cargar();
    cargarSuscriptores();
  }, [sesion, cargar, cargarSuscriptores]);

  function campo(k: keyof typeof VACIO) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => setForm({ ...form, [k]: e.target.value });
  }

  function reiniciarAyudas() {
    tandaFotos.current += 1;
    setPreparandoFotos("");
    setAvisoFotos("");
    setClaveAutocompletar((k) => k + 1);
  }

  function limpiar() {
    reiniciarAyudas();
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

  function aFormulario(a: Auto) {
    return {
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
      catalogo: a.catalogo ?? "general",
      estado_papeles: a.estado_papeles ?? "",
      mantenciones: a.mantenciones ?? "",
      revision_tecnica: a.revision_tecnica ?? "",
    };
  }

  function editar(a: Auto) {
    reiniciarAyudas();
    setEditId(a.id);
    setPublicadoForm(a.publicado);
    setForm(aFormulario(a));
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
    setPestana("publicar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Copia un auto como borrador nuevo: útil para publicar uno parecido en segundos.
  function duplicar(a: Auto) {
    limpiar();
    // El respaldo es propio de cada vehículo: no se copia.
    setForm({ ...aFormulario(a), estado: "disponible", estado_papeles: "", mantenciones: "", revision_tecnica: "" });
    setPublicadoForm(false);
    setFotos((a.fotos ?? []).map((url, i) => ({ id: `copia-${i}-${url}`, url, preview: url })));
    setPestana("publicar");
    avisar("Copiaste " + a.marca + " " + a.modelo + ". Ajusta lo que cambie y publica.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function nuevo(catalogo: Catalogo = "general") {
    limpiar();
    setForm({ ...VACIO, catalogo, tipo: catalogo === "trabajo" ? "Camioneta" : VACIO.tipo });
    setPestana("publicar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function agregarArchivos(lista: FileList | File[] | null) {
    const elegidos = Array.from(lista ?? []);
    const archivos = elegidos.filter(esImagenAdmitida);
    const tanda = ++tandaFotos.current;
    let heic = 0;
    let otras = elegidos.length - archivos.length;
    setInputKey((k) => k + 1);
    setAvisoFotos("");
    // Se revisan de a una: así una foto incompatible no queda en blanco ni falla al guardar.
    for (const [i, file] of archivos.entries()) {
      setPreparandoFotos(`Revisando foto ${i + 1} de ${archivos.length}…`);
      const sirve = await puedeAbrirse(file);
      if (tanda !== tandaFotos.current) return;
      if (sirve) {
        setFotos((actual) => [...actual, {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: URL.createObjectURL(file),
        }]);
      } else if (esHeic(file)) heic += 1;
      else otras += 1;
    }
    setPreparandoFotos("");
    const avisos = [
      heic ? `${heic === 1 ? "1 foto HEIC no se agregó" : `${heic} fotos HEIC no se agregaron`}: este navegador no puede abrir ese formato. Súbelas desde Safari o conviértelas a JPG.` : "",
      otras ? `${otras === 1 ? "1 archivo no se agregó" : `${otras} archivos no se agregaron`} porque no se pudo abrir como foto.` : "",
    ].filter(Boolean).join(" ");
    setAvisoFotos(avisos);
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

  function hacerPortada(indice: number) {
    setFotos((lista) => {
      if (indice <= 0) return lista;
      const copia = [...lista];
      const [movida] = copia.splice(indice, 1);
      copia.unshift(movida);
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

  const faltan = [
    !form.marca.trim() && "marca",
    !form.modelo.trim() && "modelo",
    !(Number(form.anio) > 0) && "año",
    !(Number(form.precio) > 0) && "precio",
  ].filter(Boolean) as string[];

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!automotoraId) return;

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publicar =
      submitter?.dataset.publicado === "true" ? true :
      submitter?.dataset.publicado === "false" ? false :
      publicadoForm;

    if (preparandoFotos) {
      avisar("Espera a que terminen de revisarse las fotos.", true);
      return;
    }

    if (publicar && faltan.length) {
      avisar("Para publicar falta: " + faltan.join(", ") + ".", true);
      return;
    }

    setGuardando(true);
    try {
      const urls: string[] = [];
      const nuevas = fotos.filter((f) => !f.url && f.file).length;
      let subidas = 0;
      for (const foto of fotos) {
        if (foto.url) {
          urls.push(foto.url);
          continue;
        }
        if (!foto.file) continue;
        subidas += 1;
        setProgreso("Subiendo foto " + subidas + " de " + nuevas + "…");
        const blob = await reducir(foto.file);
        const ruta = rutaFoto(automotoraId, extensionFoto(blob.type)!);
        const { error } = await supabase.storage
          .from("autos")
          .upload(ruta, blob, { contentType: blob.type });
        if (error) throw error;
        urls.push(supabase.storage.from("autos").getPublicUrl(ruta).data.publicUrl);
      }
      setProgreso("Guardando datos…");
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
        catalogo: form.catalogo,
        estado_papeles: form.estado_papeles.trim() || null,
        mantenciones: form.mantenciones.trim() || null,
        revision_tecnica: form.revision_tecnica.trim() || null,
        // La exhibición de la portada es solo del catálogo general.
        ...(form.catalogo === "trabajo" ? { en_exhibicion: false } : {}),
      };
      const r = editId
        ? await supabase.from("autos").update(datos).eq("id", editId)
        : await supabase.from("autos").insert({ ...datos, automotora_id: automotoraId });
      if (r.error) throw r.error;
      const nombre = datos.marca + " " + datos.modelo;
      avisar(
        editId
          ? nombre + " actualizado."
          : publicar
            ? nombre + " publicado. Ya aparece en la página."
            : nombre + " guardado como borrador."
      );
      limpiar();
      await cargar();
      setPestana(datos.catalogo === "trabajo" ? "trabajo" : "inventario");
    } catch (err) {
      avisar("Error: " + ((err as { message?: string }).message ?? "no se pudo guardar"), true);
    }
    setProgreso("");
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

    if (error) avisar("Error: " + error.message, true);
    else {
      avisar(a.marca + " " + a.modelo + ": " + (ESTADOS.find((s) => s.v === estado)?.t ?? estado) + ".");
      await cargar();
    }
  }

  // Publicar de inmediato o pasar a borrador sin abrir el formulario.
  async function cambiarPublicado(a: Auto) {
    if (!a.publicado && (!a.marca || !a.modelo || !(a.anio > 0) || !(a.precio > 0))) {
      avisar("Para publicar completa marca, modelo, año y precio. Ábrelo con Editar.", true);
      return;
    }
    const datos = a.publicado ? { publicado: false, en_exhibicion: false } : { publicado: true };
    const { error } = await supabase
      .from("autos")
      .update(datos)
      .eq("id", a.id)
      .eq("automotora_id", automotoraId!);
    if (error) avisar("Error: " + error.message, true);
    else {
      avisar(a.publicado ? "Pasó a borrador: ya no se ve en la página." : "Publicado: ya se ve en la página.");
      await cargar();
    }
  }

  async function cambiarCatalogo(a: Auto) {
    const destino: Catalogo = a.catalogo === "trabajo" ? "general" : "trabajo";
    const datos = destino === "trabajo" ? { catalogo: destino, en_exhibicion: false } : { catalogo: destino };
    const { error } = await supabase
      .from("autos")
      .update(datos)
      .eq("id", a.id)
      .eq("automotora_id", automotoraId!);
    if (error) avisar("Error: " + error.message, true);
    else {
      avisar(a.marca + " " + a.modelo + " pasó a " + (destino === "trabajo" ? "Vehículos de trabajo." : "Catálogo general."));
      await cargar();
    }
  }

  async function cambiarExhibicion(a: Auto) {
    if (a.catalogo === "trabajo") {
      avisar("La exhibición de la portada es solo para el catálogo general.", true);
      return;
    }
    if (!a.publicado) {
      avisar("Primero debes publicar el auto para agregarlo a exhibición.", true);
      return;
    }

    const seleccionados = autos.filter(enVitrina).length;

    if (!a.en_exhibicion && seleccionados >= MAX_EXHIBICION) {
      avisar("Ya tienes " + MAX_EXHIBICION + " autos en exhibición. Quita uno antes de agregar otro.", true);
      return;
    }

    if (
      !a.en_exhibicion &&
      !["disponible", "reservado"].includes(a.estado)
    ) {
      avisar("Solo puedes seleccionar autos disponibles o reservados.", true);
      return;
    }

    const { error } = await supabase
      .from("autos")
      .update({ en_exhibicion: !a.en_exhibicion })
      .eq("id", a.id)
      .eq("automotora_id", automotoraId!);

    if (error) {
      avisar("Error al actualizar exhibición: " + error.message, true);
    } else {
      avisar(
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
    if (error) avisar("Error: " + error.message, true);
    else {
      avisar("Auto borrado.");
      cargar();
    }
  }

  async function borrarSuscriptor(s: Suscriptor) {
    if (!confirm("¿Quitar a " + s.email + " de la lista? No se puede deshacer.")) return;
    const { error } = await supabase.from("suscriptores").delete().eq("id", s.id);
    if (error) avisar("Error: " + error.message, true);
    else {
      avisar("Suscriptor quitado de la lista.");
      cargarSuscriptores();
    }
  }

  function exportarSuscriptores() {
    const filas = [["Fecha", "Correo", "Teléfono", "Página"]].concat(
      suscriptores.map((s) => [
        new Date(s.creado_en).toLocaleString("es-CL"),
        s.email,
        s.telefono,
        s.origen ?? "",
      ])
    );
    // Separado por ";" y con BOM para que Excel en español lo abra bien.
    const csv = "﻿" + filas.map((f) => f.map((c) => '"' + c.replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    enlace.download = "suscriptores-chillan-vende-autos.csv";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  async function copiarCorreos() {
    try {
      await navigator.clipboard.writeText(suscriptores.map((s) => s.email).join(", "));
      avisar(suscriptores.length + " correos copiados. Pégalos en tu correo (en CCO).");
    } catch {
      avisar("No se pudieron copiar los correos.", true);
    }
  }

  const catalogoVista: Catalogo = pestana === "trabajo" ? "trabajo" : "general";
  const autosCatalogo = autos.filter((a) => (a.catalogo ?? "general") === catalogoVista);
  const cuenta = (e: string) =>
    autosCatalogo.filter((a) => a.publicado && a.estado === e).length;

  const cuentaBorradores = autosCatalogo.filter((a) => !a.publicado).length;
  const totalTrabajo = autos.filter((a) => a.catalogo === "trabajo").length;
  const totalPublicados = autos.filter((a) => a.publicado).length;

  const autosExhibicion = autos.filter(enVitrina);
  const candidatosVitrina = autos.filter(
    (a) => a.catalogo !== "trabajo" && visiblePublico(a) && !a.en_exhibicion
  );

  const autosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    const lista = autos.filter((a) => {
      if ((a.catalogo ?? "general") !== catalogoVista) return false;
      const coincideTexto =
        !termino ||
        [a.marca, a.modelo, a.codigo, String(a.anio), a.version ?? "", a.ubicacion ?? ""]
          .some((valor) => valor.toLowerCase().includes(termino));

      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "borradores"
          ? !a.publicado
          : a.publicado && a.estado === filtroEstado);

      return coincideTexto && coincideEstado;
    });
    if (orden === "precio_desc") return [...lista].sort((a, b) => b.precio - a.precio);
    if (orden === "precio_asc") return [...lista].sort((a, b) => a.precio - b.precio);
    if (orden === "anio_desc") return [...lista].sort((a, b) => b.anio - a.anio);
    return lista;
  }, [autos, busqueda, filtroEstado, orden, catalogoVista]);

  const suscriptoresFiltrados = suscriptores.filter((s) => {
    const t = busquedaSus.trim().toLowerCase();
    return !t || s.email.toLowerCase().includes(t) || s.telefono.includes(t);
  });

  if (!listo) return null;

  if (!sesion) return <AccesoAdmin />;

  const filtros = [
    { v: "todos", t: "Todos", n: autosCatalogo.length },
    { v: "disponible", t: "Disponibles", n: cuenta("disponible") },
    { v: "reservado", t: "Reservados", n: cuenta("reservado") },
    { v: "en_preparacion", t: "En preparación", n: cuenta("en_preparacion") },
    { v: "vendido", t: "Vendidos", n: cuenta("vendido") },
    { v: "borradores", t: "Borradores", n: cuentaBorradores },
  ];

  return (
    <main className="adm ap">
      <header className="ap-top">
        <div>
          <span className="ap-marca">Chillán Vende Autos</span>
          <h1>Panel de gestión</h1>
        </div>
        <div className="ap-top-acc">
          <button type="button" className="btn fill" onClick={() => nuevo(catalogoVista)}>
            + {catalogoVista === "trabajo" ? "Publicar vehículo de trabajo" : "Publicar auto"}
          </button>
          <Link className="btn" href="/admin/crm">CRM</Link>
          <Link className="btn" href="/" target="_blank">Ver la página</Link>
          <button type="button" className="btn" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      <div className="ap-resumen">
        <div><b>{autos.length - totalTrabajo}</b><span>Catálogo general</span></div>
        <div><b>{totalTrabajo}</b><span>Vehículos de trabajo</span></div>
        <div><b>{totalPublicados}</b><span>Publicados</span></div>
        <div><b>{autos.length - totalPublicados}</b><span>No publicados</span></div>
        <div><b>{autos.filter(visiblePublico).length}</b><span>En la página</span></div>
        <div><b>{autosExhibicion.length}/{MAX_EXHIBICION}</b><span>En exhibición</span></div>
        <div><b>{suscriptores.length}</b><span>Suscriptores</span></div>
      </div>

      <nav className="ap-tabs" role="tablist" aria-label="Secciones del panel">
        {([
          ["inventario", "Catálogo general", autos.length - totalTrabajo],
          ["trabajo", "Vehículos de trabajo", totalTrabajo],
          ["publicar", editId ? "Editar auto" : "Publicar auto", null],
          ["exhibicion", "Exhibición", autosExhibicion.length + "/" + MAX_EXHIBICION],
          ["suscriptores", "Suscriptores", suscriptores.length],
        ] as [Pestana, string, number | string | null][]).map(([v, t, n]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={pestana === v}
            className={"ap-tab" + (pestana === v ? " on" : "")}
            onClick={() => setPestana(v)}
          >
            {t}{n !== null && <em>{n}</em>}
          </button>
        ))}
      </nav>

      {(pestana === "inventario" || pestana === "trabajo") && (
        <section aria-label={catalogoVista === "trabajo" ? "Vehículos de trabajo" : "Catálogo general"}>
          <div className="adm-cuentas">
            {filtros.map((f) => (
              <button
                key={f.v}
                type="button"
                className={"adm-cuenta " + (filtroEstado === f.v ? "activa" : "")}
                onClick={() => setFiltroEstado(f.v)}
                aria-pressed={filtroEstado === f.v}
              >
                <b>{f.n}</b>{f.t}
              </button>
            ))}
          </div>

          <div className="ap-barra">
            <label className="ap-buscar">
              <span className="ap-oculto">Buscar auto</span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por marca, modelo, año, código o ubicación…"
              />
            </label>
            <label>
              <span className="ap-oculto">Filtrar por estado</span>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="todos">Todos los estados</option>
                <option value="borradores">Borradores</option>
                {ESTADOS.map((s) => (
                  <option key={s.v} value={s.v}>{s.t}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="ap-oculto">Ordenar</span>
              <select value={orden} onChange={(e) => setOrden(e.target.value)}>
                <option value="recientes">Más recientes</option>
                <option value="precio_desc">Precio: mayor a menor</option>
                <option value="precio_asc">Precio: menor a mayor</option>
                <option value="anio_desc">Año: más nuevos</option>
              </select>
            </label>
          </div>

          <p className="ap-conteo">{autosFiltrados.length} de {autosCatalogo.length} vehículos</p>

          {autosCatalogo.length === 0 && (
            <div className="ap-vacio">
              <p>{catalogoVista === "trabajo" ? "Aún no hay vehículos de trabajo." : "Aún no hay autos cargados."}</p>
              <button type="button" className="btn fill" onClick={() => nuevo(catalogoVista)}>Publicar el primero</button>
            </div>
          )}
          {autosCatalogo.length > 0 && autosFiltrados.length === 0 && (
            <p className="sub">No encontramos autos con esos criterios.</p>
          )}

          <div className="ap-lista">
            {autosFiltrados.map((a) => (
              <article className={"ap-auto" + (a.publicado ? "" : " borrador")} key={a.id}>
                <button type="button" className="ap-auto-foto" onClick={() => editar(a)} aria-label={"Editar " + a.marca + " " + a.modelo}>
                  {a.fotos && a.fotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.fotos[0]} alt="" loading="lazy" />
                  ) : (
                    <span className="adm-sinfoto">Sin foto</span>
                  )}
                  <span className="ap-auto-numfotos">{a.fotos?.length ?? 0} fotos</span>
                </button>

                <div className="ap-auto-info">
                  <div className="ap-etiquetas">
                    {!a.publicado ? (
                      <span className="adm-estado adm-borrador">Borrador</span>
                    ) : (
                      <span className={`adm-estado adm-estado-${a.estado}`}>
                        {ESTADOS.find((s) => s.v === a.estado)?.t ?? a.estado}
                      </span>
                    )}
                    {enVitrina(a) && <span className="adm-en-exhibicion">★ En exhibición</span>}
                    <span className="ap-ref">Ref. {a.codigo}</span>
                  </div>
                  <h3>{a.marca || "Sin marca"} {a.modelo || "Sin modelo"}</h3>
                  <p className="ap-auto-datos">
                    {[a.version, a.anio > 0 ? String(a.anio) : "Año pendiente", a.km != null ? a.km.toLocaleString("es-CL") + " km" : null, a.ubicacion]
                      .filter(Boolean).join(" · ")}
                  </p>
                  <strong className="adm-item-precio">
                    {a.precio > 0 ? plata(a.precio) : "Precio pendiente"}
                  </strong>
                </div>

                <div className="ap-auto-acc">
                  <label className="ap-estado-rapido">
                    <span className="ap-oculto">Cambiar estado</span>
                    <select value={a.estado} onChange={(e) => cambiarEstado(a, e.target.value)}>
                      {ESTADOS.map((s) => (
                        <option key={s.v} value={s.v}>{s.t}</option>
                      ))}
                    </select>
                  </label>
                  <div className="ap-botones">
                    <button type="button" className="ap-b principal" onClick={() => editar(a)}>Editar</button>
                    <button type="button" className="ap-b" onClick={() => cambiarPublicado(a)}>
                      {a.publicado ? "Pasar a borrador" : "Publicar"}
                    </button>
                    {a.catalogo !== "trabajo" && (
                      <button
                        type="button"
                        className={"ap-b" + (a.en_exhibicion ? " activo" : "")}
                        onClick={() => cambiarExhibicion(a)}
                        disabled={
                          !a.publicado ||
                          (!a.en_exhibicion &&
                            (!["disponible", "reservado"].includes(a.estado) ||
                              autosExhibicion.length >= MAX_EXHIBICION))
                        }
                        title="Seleccionar o quitar de autos en exhibición"
                      >
                        {a.en_exhibicion ? "★ Quitar de exhibición" : "☆ Exhibir"}
                      </button>
                    )}
                    <button type="button" className="ap-b" onClick={() => duplicar(a)}>Duplicar</button>
                    <button type="button" className="ap-b" onClick={() => cambiarCatalogo(a)}>
                      {a.catalogo === "trabajo" ? "Pasar a general" : "Pasar a trabajo"}
                    </button>
                    {visiblePublico(a) && (
                      <a className="ap-b" href={"/autos/" + encodeURIComponent(a.codigo)} target="_blank" rel="noreferrer">Ver</a>
                    )}
                    <button type="button" className="ap-b peligro" onClick={() => borrar(a)}>Borrar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {pestana === "publicar" && (
        <form className="ap-form" onSubmit={guardar}>
          <div className="ap-form-titulo">
            <h2>{editId ? "Editar vehículo" : "Publicar vehículo"}</h2>
            {editId && <span className="ap-ref">Editando · {form.marca} {form.modelo}</span>}
          </div>

          <AutocompletarTexto
            key={claveAutocompletar}
            formulario={form}
            valoresIniciales={editId ? {} : { tipo: VACIO.tipo, ubicacion: VACIO.ubicacion }}
            aplicar={(cambios) => setForm((actual) => ({ ...actual, ...cambios }))}
          />

          <fieldset className="ap-bloque">
            <legend>1. Catálogo</legend>
            <div className="ap-catalogos">
              {([
                ["general", "Catálogo general", "Autos, SUV y demás vehículos de la página principal."],
                ["trabajo", "Vehículos de trabajo", "Aparece solo en su catálogo independiente."],
              ] as [Catalogo, string, string][]).map(([v, t, d]) => (
                <label key={v} className={form.catalogo === v ? "on" : ""}>
                  <input
                    type="radio"
                    name="catalogo"
                    checked={form.catalogo === v}
                    onChange={() => setForm({ ...form, catalogo: v })}
                  />
                  <span><b>{t}</b>{d}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="ap-bloque">
            <legend>2. Fotos</legend>
            <label
              className={"ap-soltar" + (soltando ? " encima" : "")}
              onDragOver={(e) => {
                e.preventDefault();
                setSoltando(true);
              }}
              onDragLeave={() => setSoltando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSoltando(false);
                agregarArchivos(e.dataTransfer.files);
              }}
            >
              <input
                key={inputKey}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={(e) => agregarArchivos(e.target.files)}
              />
              <strong>Arrastra las fotos aquí o toca para elegirlas</strong>
              <span>{preparandoFotos || "Puedes elegir varias a la vez. Se achican solas antes de subir."}</span>
            </label>
            {avisoFotos && <p className="adm-msg" role="alert">{avisoFotos}</p>}

            {fotos.length > 0 && (
              <>
                <p className="ap-ayuda">
                  {fotos.length} foto(s). Arrastra para ordenar; la primera es la <b>portada</b>.
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
                        e.stopPropagation();
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
                        <button type="button" title="Mover a la izquierda" aria-label="Mover fotografía hacia adelante" disabled={i === 0} onClick={() => moverFoto(i, -1)}>←</button>
                        {i > 0 && (
                          <button type="button" title="Usar como portada" aria-label="Usar como portada" onClick={() => hacerPortada(i)}>★</button>
                        )}
                        <button type="button" title="Mover a la derecha" aria-label="Mover fotografía hacia atrás" disabled={i === fotos.length - 1} onClick={() => moverFoto(i, 1)}>→</button>
                        <button type="button" title="Eliminar fotografía" aria-label="Eliminar fotografía" onClick={() => quitarFoto(i)}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </fieldset>

          <fieldset className="ap-bloque">
            <legend>3. Datos principales <small>(obligatorios para publicar)</small></legend>
            <div className="adm-fila">
              <label>Marca<input list="ap-marcas" value={form.marca} onChange={campo("marca")} placeholder="Toyota, Ford…" /></label>
              <label>Modelo<input value={form.modelo} onChange={campo("modelo")} placeholder="Hilux, Ranger…" /></label>
              <label>Año<input type="number" inputMode="numeric" value={form.anio} onChange={campo("anio")} placeholder="2020" /></label>
              <label>
                Precio (CLP)
                <input type="number" inputMode="numeric" value={form.precio} onChange={campo("precio")} placeholder="12990000" />
                {Number(form.precio) > 0 && <small className="ap-precio">{plata(Number(form.precio))}</small>}
              </label>
            </div>
            <datalist id="ap-marcas">
              {MARCAS.map((m) => <option key={m} value={m} />)}
            </datalist>
          </fieldset>

          <fieldset className="ap-bloque">
            <legend>4. Detalles</legend>
            <div className="adm-fila">
              <label>Versión<input value={form.version} onChange={campo("version")} placeholder="2.4 4x4 AT…" /></label>
              <label>Kilometraje<input type="number" inputMode="numeric" value={form.km} onChange={campo("km")} /></label>
              <label>Número de dueños<input type="number" min="0" step="1" value={form.duenos} onChange={campo("duenos")} placeholder="Ej. 2" /></label>
              <label>Combustible<input list="ap-combustibles" value={form.combustible} onChange={campo("combustible")} placeholder="Bencina, diésel..." /></label>
              <label>Transmisión<input list="ap-transmisiones" value={form.transmision} onChange={campo("transmision")} placeholder="Manual, automática" /></label>
              <label>Color<input list="ap-colores" value={form.color} onChange={campo("color")} /></label>
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
              <label>
                Estado
                <select value={form.estado} onChange={campo("estado")}>
                  {ESTADOS.map((s) => (
                    <option key={s.v} value={s.v}>{s.t}</option>
                  ))}
                </select>
              </label>
            </div>
            <datalist id="ubicaciones">{UBICACIONES.map((u) => <option key={u} value={u} />)}</datalist>
            <datalist id="ap-combustibles">{COMBUSTIBLES.map((u) => <option key={u} value={u} />)}</datalist>
            <datalist id="ap-transmisiones">{TRANSMISIONES.map((u) => <option key={u} value={u} />)}</datalist>
            <datalist id="ap-colores">{COLORES.map((u) => <option key={u} value={u} />)}</datalist>
            <label className="ap-descripcion">
              Descripción
              <textarea rows={4} value={form.descripcion} onChange={campo("descripcion")} placeholder="Estado, mantenciones, equipamiento, papeles al día…" />
              <small>{form.descripcion.length} caracteres</small>
            </label>
          </fieldset>

          <fieldset className="ap-bloque">
            <legend>5. Respaldo del vehículo <small>(opcional)</small></legend>
            <p className="ap-ayuda">Se muestra en la ficha solo lo que completes. Escribe únicamente lo que puedas respaldar.</p>
            <div className="adm-fila">
              <label>Papeles<input list="ap-papeles" maxLength={200} value={form.estado_papeles} onChange={campo("estado_papeles")} placeholder="Ej. Al día" /></label>
              <label>Revisión técnica<input maxLength={200} value={form.revision_tecnica} onChange={campo("revision_tecnica")} placeholder="Ej. Vigente hasta 03/2027" /></label>
            </div>
            <datalist id="ap-papeles">
              <option value="Al día" />
              <option value="Con observaciones, consultar" />
            </datalist>
            <label className="ap-descripcion">
              Mantenciones
              <textarea rows={2} maxLength={500} value={form.mantenciones} onChange={campo("mantenciones")} placeholder="Ej. Última mantención a los 80.000 km, con comprobante" />
            </label>
          </fieldset>

          <div className="ap-acciones">
            <p className="ap-faltan">
              {progreso
                ? progreso
                : faltan.length
                  ? "Para publicar falta: " + faltan.join(", ")
                  : "✓ Listo para publicar" + (fotos.length ? "" : " (sin fotos)")}
            </p>
            <div className="acc">
              <button type="button" className="btn" onClick={() => { setPestana(form.catalogo === "trabajo" ? "trabajo" : "inventario"); limpiar(); }}>
                Cancelar
              </button>
              {editId && (
                <button className="btn" type="submit" data-publicado={String(publicadoForm)} disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              )}
              <button className="btn" type="submit" data-publicado="false" disabled={guardando}>
                Guardar como borrador
              </button>
              <button className="btn fill" type="submit" data-publicado="true" disabled={guardando}>
                {guardando ? "Guardando..." : editId ? "Guardar y publicar" : "Publicar auto"}
              </button>
            </div>
          </div>
        </form>
      )}

      {pestana === "exhibicion" && (
        <section className="adm-exhibicion" aria-label="Autos en exhibición">
          <div className="adm-exhibicion-titulo">
            <div>
              <h2>Autos en exhibición</h2>
              <p className="sub">
                Vehículos que se muestran como destacados en la página pública.
              </p>
            </div>
            <strong>{autosExhibicion.length} / {MAX_EXHIBICION} seleccionados</strong>
          </div>

          {autosExhibicion.length === 0 ? (
            <p className="adm-exhibicion-vacio">
              Todavía no tienes autos seleccionados para exhibición. Agrégalos desde la lista de abajo.
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
                    <b>{plata(a.precio)}</b>
                  </div>
                  <button type="button" className="btn" onClick={() => cambiarExhibicion(a)} title="Quitar este vehículo de exhibición">
                    Quitar
                  </button>
                </article>
              ))}
            </div>
          )}

          <h3 className="ap-sub">Agregar a la exhibición</h3>
          {candidatosVitrina.length === 0 ? (
            <p className="sub">No hay más autos publicados y disponibles para agregar.</p>
          ) : (
            <div className="ap-candidatos">
              {candidatosVitrina.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className="ap-candidato"
                  onClick={() => cambiarExhibicion(a)}
                  disabled={autosExhibicion.length >= MAX_EXHIBICION}
                >
                  {a.fotos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.fotos[0]} alt="" loading="lazy" />
                  ) : (
                    <span className="adm-sinfoto">Sin foto</span>
                  )}
                  <span>
                    <b>{a.marca} {a.modelo}</b>
                    {a.anio} · {plata(a.precio)}
                  </span>
                  <em>+ Agregar</em>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {pestana === "suscriptores" && (
        <section aria-label="Suscriptores">
          <div className="ap-form-titulo">
            <h2>Suscriptores</h2>
            <span className="ap-ref">Personas que pidieron recibir noticias y ofertas</span>
          </div>
          {errorSus && <p className="adm-msg">{errorSus}</p>}
          <div className="ap-barra">
            <label className="ap-buscar">
              <span className="ap-oculto">Buscar suscriptor</span>
              <input type="search" value={busquedaSus} onChange={(e) => setBusquedaSus(e.target.value)} placeholder="Buscar por correo o teléfono…" />
            </label>
            <button type="button" className="btn" onClick={copiarCorreos} disabled={!suscriptores.length}>Copiar correos</button>
            <button type="button" className="btn fill" onClick={exportarSuscriptores} disabled={!suscriptores.length}>Descargar Excel (CSV)</button>
          </div>
          <p className="ap-conteo">{suscriptoresFiltrados.length} de {suscriptores.length} suscriptores</p>

          {suscriptores.length === 0 ? (
            <div className="ap-vacio">
              <p>Todavía no hay suscriptores. Aparecerán aquí cuando alguien se anote desde la ventana de la página.</p>
            </div>
          ) : (
            <div className="ap-tabla-envoltura">
              <table className="ap-tabla">
                <thead>
                  <tr><th>Fecha</th><th>Correo</th><th>Teléfono</th><th>Página</th><th><span className="ap-oculto">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {suscriptoresFiltrados.map((s) => (
                    <tr key={s.id}>
                      <td>{new Date(s.creado_en).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td><a href={"mailto:" + s.email}>{s.email}</a></td>
                      <td><a href={"https://wa.me/" + s.telefono.replace(/\D/g, "")} target="_blank" rel="noreferrer">{s.telefono}</a></td>
                      <td>{s.origen ?? "—"}</td>
                      <td><button type="button" className="ap-b peligro" onClick={() => borrarSuscriptor(s)}>Quitar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {aviso && (
        <div className={"ap-aviso" + (aviso.error ? " error" : "")} role="status" aria-live="polite">
          <span>{aviso.texto}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">×</button>
        </div>
      )}
    </main>
  );
}
