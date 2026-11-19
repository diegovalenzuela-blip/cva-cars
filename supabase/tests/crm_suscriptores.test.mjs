// Pruebas del paso de suscriptores al CRM sobre Postgres temporal.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, test } from "node:test";

const modulo = process.env.PGLITE_MODULE;
const opciones = { skip: modulo ? false : "falta PGLITE_MODULE" };
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const USUARIO_A = "10000000-0000-4000-8000-00000000000a";
let db;

const migracion = (m) => readFileSync(new URL(`../migrations/${m}`, import.meta.url), "utf8");
const fila = async (sql, datos = []) => (await db.query(sql, datos)).rows[0];
const filas = async (sql, datos = []) => (await db.query(sql, datos)).rows;
async function como(rol, usuario, accion) {
  await db.exec(`set role ${rol}; select set_config('t.uid', '${usuario ?? ""}', false);`);
  try {
    return await accion();
  } finally {
    await db.exec("reset role");
  }
}
const publico = (accion) => como("anon", null, accion);
const suscribir = (email, telefono, automotora = A, origen = "/") =>
  publico(() =>
    db.query("insert into public.suscriptores (automotora_id, email, telefono, acepta, origen) values ($1, $2, $3, true, $4)", [
      automotora, email, telefono, origen,
    ])
  );
const notasDe = (cliente) =>
  filas("select contenido, canal, id_externo from public.crm_actividades where cliente_id = $1", [cliente]);

before(async () => {
  if (!modulo) return;
  const { PGlite } = await import(modulo);
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; grant usage on schema auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('t.uid', true), '')::uuid $$;
    create table public.automotoras (id uuid primary key, slug text);
    create table public.perfiles (user_id uuid primary key, automotora_id uuid not null);
    create table public.autos (id uuid primary key default gen_random_uuid(), automotora_id uuid references automotoras(id), marca text);
    create function public.mi_automotora() returns uuid language sql stable security definer set search_path = '' as
      $$ select p.automotora_id from public.perfiles p where p.user_id = auth.uid() $$;
    grant usage on schema public to anon, authenticated;
    insert into automotoras values ('${A}', 'chillan-vende-autos'), ('${B}', 'otra');
    insert into perfiles values ('${USUARIO_A}', '${A}');
  `);
  await db.exec(migracion("20261118_suscriptores.sql"));
  await db.exec("grant insert on public.suscriptores to anon, authenticated; grant select, delete on public.suscriptores to authenticated;");
  await db.exec(migracion("20261119_crm_base.sql"));
  // Un suscriptor que ya existía antes de conectar el CRM.
  await db.exec(`insert into public.suscriptores (automotora_id, email, telefono, origen) values ('${A}', 'antiguo@correo.cl', '+56911111111', '/')`);
  const sql = migracion("20261122_suscriptores_crm.sql");
  await db.exec(sql);
  await db.exec(sql);
});

test("los suscriptores que ya existían pasan una sola vez al CRM", opciones, async () => {
  const c = await fila("select id, nombre, telefono, email from public.crm_clientes where email = 'antiguo@correo.cl'");
  assert.equal(c.nombre, "Suscriptor (antiguo)");
  assert.equal(c.telefono, "+56911111111");
  assert.equal((await notasDe(c.id)).length, 1);
});

test("una suscripción nueva crea el contacto con una nota de la página", opciones, async () => {
  await suscribir("Maria.Soto@Correo.cl".toLowerCase(), "+56922222222", A, "/catalogo");
  const c = await fila("select id, nombre, telefono, email, notas from public.crm_clientes where email = 'maria.soto@correo.cl'");
  assert.equal(c.telefono, "+56922222222");
  assert.match(c.notas, /Falta su nombre/);
  const [n] = await notasDe(c.id);
  assert.equal(n.canal, "web");
  assert.match(n.contenido, /noticias y ofertas en la página \(\/catalogo\)/);
});

test("si el teléfono ya es de un contacto, solo se agrega la nota y su ficha no cambia", opciones, async () => {
  const { id } = await fila(
    `insert into public.crm_clientes (automotora_id, nombre, telefono) values ('${A}', 'Pedro Rojas', '+56933333333') returning id`
  );
  await suscribir("pedro@correo.cl", "+56933333333");
  const c = await fila("select nombre, email from public.crm_clientes where id = $1", [id]);
  assert.deepEqual(c, { nombre: "Pedro Rojas", email: null });
  assert.equal((await fila("select count(*)::int n from public.crm_clientes where telefono = '+56933333333'")).n, 1);
  assert.equal((await notasDe(id)).length, 1);
});

test("también reconoce al contacto por su correo", opciones, async () => {
  const { id } = await fila(
    `insert into public.crm_clientes (automotora_id, nombre, email) values ('${A}', 'Ana Díaz', 'ana@correo.cl') returning id`
  );
  await suscribir("ana@correo.cl", "+56944444444");
  assert.equal((await fila("select count(*)::int n from public.crm_clientes where email = 'ana@correo.cl'")).n, 1);
  assert.equal((await notasDe(id)).length, 1);
});

test("un teléfono con otro formato no impide crear el contacto por correo", opciones, async () => {
  await suscribir("extranjero@correo.com", "4155550199");
  const c = await fila("select telefono, email from public.crm_clientes where email = 'extranjero@correo.com'");
  assert.deepEqual(c, { telefono: null, email: "extranjero@correo.com" });
});

test("cada suscripción queda en el CRM de su propia automotora", opciones, async () => {
  await suscribir("otra@correo.cl", "+56955555555", B);
  assert.equal((await fila(`select automotora_id from public.crm_clientes where email = 'otra@correo.cl'`)).automotora_id, B);
});

test("el público no puede ejecutar la función ni leer el CRM", opciones, async () => {
  await assert.rejects(publico(() => db.query("select public.crm_registrar_suscriptor(gen_random_uuid())")));
  await assert.rejects(publico(() => db.query("select * from public.crm_clientes")));
});

test("el socio ve a los suscriptores como contactos de su CRM", opciones, async () => {
  const visibles = await como("authenticated", USUARIO_A, () =>
    filas("select email from public.crm_clientes where email like '%correo%' order by email")
  );
  assert.ok(visibles.some((c) => c.email === "maria.soto@correo.cl"));
  assert.ok(!visibles.some((c) => c.email === "otra@correo.cl"));
});

test("si el CRM falla, la persona igual queda suscrita", opciones, async () => {
  await db.exec("alter table public.crm_actividades add constraint prueba_falla check (false) not valid");
  try {
    await suscribir("falla@correo.cl", "+56966666666");
  } finally {
    await db.exec("alter table public.crm_actividades drop constraint prueba_falla");
  }
  assert.equal((await fila("select count(*)::int n from public.suscriptores where email = 'falla@correo.cl'")).n, 1);
  assert.equal((await fila("select count(*)::int n from public.crm_clientes where email = 'falla@correo.cl'")).n, 0);
});
