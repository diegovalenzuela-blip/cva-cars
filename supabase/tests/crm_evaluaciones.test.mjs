// Pruebas de solicitudes públicas y condiciones comerciales sobre Postgres temporal.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, test } from "node:test";

const modulo = process.env.PGLITE_MODULE;
const opciones = { skip: modulo ? false : "falta PGLITE_MODULE" };
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const USUARIO_A = "10000000-0000-4000-8000-00000000000a";
const USUARIO_B = "10000000-0000-4000-8000-00000000000b";
let db;
let n = 0;

const uuid = () => `40000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const migracion = (m) => readFileSync(new URL(`../migrations/${m}`, import.meta.url), "utf8");
const fila = async (sql, datos = []) => (await db.query(sql, datos)).rows[0];
async function como(rol, usuario, accion) {
  await db.exec(`set role ${rol}; select set_config('t.uid', '${usuario ?? ""}', false);`);
  try {
    return await accion();
  } finally {
    await db.exec("reset role");
  }
}
const publico = (accion) => como("anon", null, accion);
const socio = (accion) => como("authenticated", USUARIO_A, accion);
const solicitud = (extra = {}) => ({
  id: uuid(), nombre: "Juan Pérez", telefono: `+569${String(10000000 + ++n)}`, comuna: "Chillán", marca: "Toyota",
  modelo: "Hilux", anio: 2021, km: 85000, fotos_esperadas: 0, ...extra,
});
const recibir = async (d) => (await fila("select public.crm_recibir_evaluacion($1::jsonb) r", [JSON.stringify(d)])).r;

async function limpiar() {
  await db.exec(`
    delete from storage.objects; delete from public.crm_solicitudes_evaluacion;
    delete from public.crm_consignaciones; delete from public.crm_vehiculos;
    delete from public.crm_actividades; delete from public.crm_oportunidades; delete from public.crm_clientes;
  `);
}

before(async () => {
  if (!modulo) return;
  const { PGlite } = await import(modulo);
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; grant usage on schema auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('t.uid', true), '')::uuid $$;
    create schema storage; grant usage on schema storage to anon, authenticated;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, unique (bucket_id, name));
    grant select, insert, delete on storage.objects to anon, authenticated;
    alter table storage.objects enable row level security;
    create table public.automotoras (id uuid primary key, slug text);
    create table public.perfiles (user_id uuid primary key, automotora_id uuid not null);
    create table public.autos (id uuid primary key default gen_random_uuid(), automotora_id uuid references automotoras(id), marca text);
    create function public.mi_automotora() returns uuid language sql stable security definer set search_path = '' as
      $$ select p.automotora_id from public.perfiles p where p.user_id = auth.uid() $$;
    grant usage on schema public to anon, authenticated;
    grant select on public.autos to anon, authenticated;
    insert into automotoras values ('${A}', 'chillan-vende-autos'), ('${B}', 'otra');
    insert into perfiles values ('${USUARIO_A}', '${A}'), ('${USUARIO_B}', '${B}');
    insert into autos (automotora_id, marca) values ('${A}', 'Antiguo');
  `);
  await db.exec(migracion("20261119_crm_base.sql"));
  await db.exec(migracion("20261120_crm_consignaciones.sql"));
  const sql = migracion("20261121_evaluaciones_condiciones.sql");
  await db.exec(sql);
  await db.exec(sql);
});

test("los autos antiguos quedan con condiciones desactivadas", opciones, async () => {
  assert.deepEqual(await fila("select acepta_parte_pago, precio_negociable from autos where marca = 'Antiguo'"), {
    acepta_parte_pago: false, precio_negociable: false,
  });
});

test("una solicitud crea interesado y seguimiento, pero no consignación", opciones, async () => {
  await limpiar();
  const d = solicitud({ email: "JUAN@EJEMPLO.CL", patente: "lp-kd 45", precio_esperado: 18000000 });
  const r = await publico(() => recibir(d));
  assert.deepEqual(r, { id: d.id, repetida: false, subir_fotos: false });
  const s = await fila("select * from crm_solicitudes_evaluacion");
  assert.equal(s.coincidencia, "cliente_nuevo");
  assert.equal(s.estado, "nueva");
  assert.equal(s.origen, "Web - Solicitud de evaluación");
  assert.equal(s.patente, "LPKD45");
  const o = await fila("select canal, etapa, proxima_accion, proxima_fecha from crm_oportunidades where id = $1", [s.oportunidad_id]);
  assert.equal(o.canal, "web");
  assert.equal(o.etapa, "nuevo");
  assert.equal(o.proxima_accion, "Revisar solicitud de evaluación");
  assert.ok(o.proxima_fecha);
  assert.equal((await fila("select count(*)::int n from crm_consignaciones")).n, 0);
  assert.equal((await fila("select count(*)::int n from crm_vehiculos")).n, 0);
});

test("valida en la base aunque se salte la página", opciones, async () => {
  await limpiar();
  await publico(async () => {
    for (const [malo, texto] of [
      [{ nombre: "A" }, /nombre/], [{ telefono: "912" }, /WhatsApp/], [{ email: "x" }, /correo/], [{ comuna: "" }, /comuna/],
      [{ marca: "" }, /marca/], [{ modelo: "" }, /modelo/], [{ anio: 1800 }, /año/], [{ km: -1 }, /kilometraje/],
      [{ patente: "MALA" }, /patente/], [{ fotos_esperadas: 11 }, /10 fotografías/],
    ]) await assert.rejects(recibir(solicitud(malo)), texto);
  });
});

test("reintentos y duplicados no crean otro registro", opciones, async () => {
  await limpiar();
  await publico(async () => {
    const d = solicitud();
    await recibir(d);
    assert.equal((await recibir(d)).repetida, true);
    const otra = await recibir({ ...d, id: uuid() });
    assert.deepEqual([otra.id, otra.repetida], [d.id, true]);
  });
  assert.deepEqual(await fila("select (select count(*)::int from crm_solicitudes_evaluacion) s, (select count(*)::int from crm_clientes) c"), { s: 1, c: 1 });
});

test("limita envíos repetidos desde un mismo número", opciones, async () => {
  await limpiar();
  const telefono = "+56911112222";
  await publico(async () => {
    for (const modelo of ["Hilux", "Yaris", "Corolla"]) await recibir(solicitud({ telefono, modelo }));
    await assert.rejects(recibir(solicitud({ telefono, modelo: "Rush" })), /varias solicitudes/);
  });
});

test("asocia cliente claro, sin modificar su ficha", opciones, async () => {
  await limpiar();
  const c = (await fila(`insert into crm_clientes (automotora_id, nombre, telefono, comuna) values ('${A}', 'Juan Pérez Soto', '+56912345678', 'Bulnes') returning id`)).id;
  await publico(() => recibir(solicitud({ telefono: "+56912345678", comuna: "Chillán", email: "otro@ejemplo.cl" })));
  const s = await fila("select cliente_id, coincidencia from crm_solicitudes_evaluacion");
  assert.deepEqual(s, { cliente_id: c, coincidencia: "cliente_existente" });
  assert.deepEqual(await fila("select comuna, email from crm_clientes where id = $1", [c]), { comuna: "Bulnes", email: null });
  assert.equal((await fila("select count(*)::int n from crm_clientes")).n, 1);
});

test("deja pendiente una coincidencia ambigua y permite resolverla", opciones, async () => {
  await limpiar();
  const uno = (await fila(`insert into crm_clientes (automotora_id, nombre, telefono) values ('${A}', 'Ana Díaz', '+56911111111') returning id`)).id;
  const dos = (await fila(`insert into crm_clientes (automotora_id, nombre, email) values ('${A}', 'Pedro Rojas', 'p@ejemplo.cl') returning id`)).id;
  const d = solicitud({ nombre: "Ana Díaz", telefono: "+56911111111", email: "p@ejemplo.cl" });
  await publico(() => recibir(d));
  let s = await fila("select cliente_id, oportunidad_id, coincidencia, candidatos from crm_solicitudes_evaluacion");
  assert.equal(s.cliente_id, null);
  assert.equal(s.oportunidad_id, null);
  assert.equal(s.coincidencia, "revisar");
  assert.deepEqual([...s.candidatos].sort(), [uno, dos].sort());
  assert.equal((await fila("select count(*)::int n from crm_clientes")).n, 2);
  await socio(() => db.query("select crm_resolver_solicitud($1, $2)", [d.id, uno]));
  s = await fila("select cliente_id, coincidencia, oportunidad_id from crm_solicitudes_evaluacion");
  assert.equal(s.cliente_id, uno);
  assert.equal(s.coincidencia, "cliente_existente");
  assert.ok(s.oportunidad_id);
});

test("un mismo teléfono con otro nombre queda para revisión", opciones, async () => {
  await limpiar();
  await db.query(`insert into crm_clientes (automotora_id, nombre, telefono) values ('${A}', 'Ana Díaz', '+56911111111')`);
  await publico(() => recibir(solicitud({ nombre: "Carlos Muñoz", telefono: "+56911111111" })));
  assert.equal((await fila("select coincidencia from crm_solicitudes_evaluacion")).coincidencia, "revisar");
});

test("las fotos solo se suben a una solicitud reciente y quedan privadas", opciones, async () => {
  await limpiar();
  const d = solicitud({ fotos_esperadas: 2 });
  const subir = (name) => db.query("insert into storage.objects (bucket_id, name) values ('evaluaciones', $1)", [name]);
  await publico(async () => {
    assert.equal((await recibir(d)).subir_fotos, true);
    await subir(`${d.id}/0.webp`);
    await subir(`${d.id}/1.jpg`);
    await assert.rejects(subir(`${d.id}/2.jpg`), /row-level security/);
    await assert.rejects(subir(`${uuid()}/0.jpg`), /row-level security/);
    await assert.rejects(subir(`${d.id}/0.exe`), /row-level security/);
    assert.equal((await fila("select count(*)::int n from storage.objects")).n, 0);
    assert.equal((await fila("select crm_confirmar_fotos_evaluacion($1) n", [d.id])).n, 2);
    await assert.rejects(subir(`${d.id}/0.jpg`), /row-level security|duplicate/);
  });
  assert.deepEqual((await fila("select fotos from crm_solicitudes_evaluacion")).fotos, [`${d.id}/0.webp`, `${d.id}/1.jpg`]);
  await socio(async () => assert.equal((await fila("select count(*)::int n from storage.objects")).n, 2));
  await como("authenticated", USUARIO_B, async () => assert.equal((await fila("select count(*)::int n from storage.objects")).n, 0));
});

test("convierte una solicitud en consignación una sola vez", opciones, async () => {
  await limpiar();
  const d = solicitud({ precio_esperado: 18000000, observaciones: "Buen estado" });
  await publico(() => recibir(d));
  await socio(async () => {
    const convertir = (extra) => db.query("select crm_convertir_solicitud($1::jsonb) r", [JSON.stringify({ id: d.id, ...extra })]);
    await assert.rejects(convertir({ patente: "MALA" }), /patente válida/);
    await convertir({ patente: "LPKD45", estado: "activa", precio_minimo: 17000000 });
    const c = await fila("select estado, precio_solicitado::int p, precio_minimo::int m, observaciones o from crm_consignaciones");
    assert.deepEqual(c, { estado: "activa", p: 18000000, m: 17000000, o: "Buen estado" });
    const s = await fila("select estado, patente, vehiculo_id is not null v from crm_solicitudes_evaluacion");
    assert.deepEqual(s, { estado: "convertida", patente: "LPKD45", v: true });
    assert.equal((await fila("select etapa from crm_oportunidades")).etapa, "negociacion");
    await assert.rejects(convertir({ patente: "LPKD45" }), /ya fue cerrada/);
  });
});

test("el público y otra automotora no leen solicitudes", opciones, async () => {
  await limpiar();
  await publico(async () => {
    await recibir(solicitud());
    await assert.rejects(db.query("select * from crm_solicitudes_evaluacion"), /permission denied/);
    await assert.rejects(db.query("select crm_convertir_solicitud('{}'::jsonb)"), /permission denied/);
  });
  await como("authenticated", USUARIO_B, async () => assert.equal((await fila("select count(*)::int n from crm_solicitudes_evaluacion")).n, 0));
});
