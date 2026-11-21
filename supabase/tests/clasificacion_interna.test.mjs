// Pruebas de la clasificación interna (Neutro / Etchevers) sobre Postgres temporal.
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

const sql = readFileSync(new URL("../migrations/20261124_clasificacion_interna.sql", import.meta.url), "utf8");
const fila = async (q, d = []) => (await db.query(q, d)).rows[0];

async function como(rol, usuario, accion) {
  await db.exec(`set role ${rol}; select set_config('t.uid', '${usuario ?? ""}', false);`);
  try {
    return await accion();
  } finally {
    await db.exec("reset role");
  }
}
const socioA = (accion) => como("authenticated", USUARIO_A, accion);
const socioB = (accion) => como("authenticated", USUARIO_B, accion);
const publico = (accion) => como("anon", null, accion);
const clase = async (codigo) =>
  (await fila("select c.clasificacion from autos_clasificacion c join autos a on a.id = c.auto_id where a.codigo = $1", [codigo]))
    ?.clasificacion;

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
    create table public.autos (id uuid primary key default gen_random_uuid(), automotora_id uuid references automotoras(id), codigo text, publicado boolean default true);
    create function public.mi_automotora() returns uuid language sql stable security definer set search_path = '' as
      $$ select p.automotora_id from public.perfiles p where p.user_id = auth.uid() $$;
    grant usage on schema public to anon, authenticated;
    alter table public.autos enable row level security;
    grant select on public.autos to anon;
    grant select, insert, update on public.autos to authenticated;
    create policy "publico ve publicados" on public.autos for select to anon using (publicado);
    create policy "automotora gestiona autos" on public.autos for all to authenticated
      using (automotora_id = mi_automotora()) with check (automotora_id = mi_automotora());
    insert into automotoras values ('${A}', 'chillan-vende-autos'), ('${B}', 'otra');
    insert into perfiles values ('${USUARIO_A}', '${A}'), ('${USUARIO_B}', '${B}');
    insert into autos (automotora_id, codigo) values ('${A}', 'CV-VIEJO'), ('${B}', 'OT-VIEJO');
  `);
  await db.exec(sql);
  await db.exec(sql);
});

test("los autos que ya existían quedan como neutro, sin cambiar nada más", opciones, async () => {
  assert.equal(await clase("CV-VIEJO"), "neutro");
  assert.equal(await clase("OT-VIEJO"), "neutro");
  assert.equal((await fila("select count(*)::int n from autos")).n, 2);
});

test("se puede crear un auto neutro y uno Etchevers, y cambiar la clasificación", opciones, async () => {
  await socioA(async () => {
    const n = await fila(`insert into autos (automotora_id, codigo) values ('${A}', 'CV-N') returning id`);
    const e = await fila(`insert into autos (automotora_id, codigo) values ('${A}', 'CV-E') returning id`);
    await db.query("insert into autos_clasificacion (auto_id, automotora_id, clasificacion) values ($1, $2, 'neutro') on conflict (auto_id) do update set clasificacion = excluded.clasificacion", [n.id, A]);
    await db.query("insert into autos_clasificacion (auto_id, automotora_id, clasificacion) values ($1, $2, 'etchevers') on conflict (auto_id) do update set clasificacion = excluded.clasificacion", [e.id, A]);
  });
  assert.equal(await clase("CV-N"), "neutro");
  assert.equal(await clase("CV-E"), "etchevers");
  await socioA(() => db.query("update autos_clasificacion set clasificacion = 'neutro' where auto_id = (select id from autos where codigo = 'CV-E')"));
  assert.equal(await clase("CV-E"), "neutro");
  await socioA(() => db.query("update autos_clasificacion set clasificacion = 'etchevers' where auto_id = (select id from autos where codigo = 'CV-E')"));
  assert.equal(await clase("CV-E"), "etchevers");
});

test("solo acepta neutro o etchevers", opciones, async () => {
  await assert.rejects(
    socioA(() => db.query("update autos_clasificacion set clasificacion = 'otra' where auto_id = (select id from autos where codigo = 'CV-E')"))
  );
});

test("el público no puede leer ni cambiar la clasificación", opciones, async () => {
  await assert.rejects(publico(() => db.query("select * from autos_clasificacion")));
  await assert.rejects(publico(() => db.query("update autos_clasificacion set clasificacion = 'neutro'")));
  await assert.rejects(
    publico(() => db.query(`insert into autos_clasificacion (auto_id, automotora_id, clasificacion) select id, automotora_id, 'etchevers' from autos limit 1`))
  );
  // Lo que el público sí ve de un auto no trae la clasificación.
  const auto = await publico(() => fila("select * from autos where codigo = 'CV-E'"));
  assert.ok(auto);
  assert.ok(!("clasificacion" in auto));
});

test("otra automotora no ve ni cambia la clasificación ajena", opciones, async () => {
  const vistos = await socioB(async () => (await db.query("select a.codigo from autos_clasificacion c join autos a on a.id = c.auto_id")).rows);
  assert.deepEqual(vistos.map((r) => r.codigo), ["OT-VIEJO"]);
  await socioB(() => db.query("update autos_clasificacion set clasificacion = 'neutro' where auto_id = (select id from autos where codigo = 'CV-E')"));
  assert.equal(await clase("CV-E"), "etchevers");
  const ajeno = (await fila("select id from autos where codigo = 'CV-E'")).id;
  await assert.rejects(
    socioB(() => db.query("insert into autos_clasificacion (auto_id, automotora_id, clasificacion) values ($1, $2, 'neutro')", [ajeno, B]))
  );
});

test("la función del trigger no se puede llamar desde afuera", opciones, async () => {
  await assert.rejects(publico(() => db.query("select public.autos_clasificacion_inicial()")));
});
