// Prueba del auto de la portada sobre Postgres temporal.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, test } from "node:test";

const modulo = process.env.PGLITE_MODULE;
const opciones = { skip: modulo ? false : "falta PGLITE_MODULE" };
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
let db;

const sql = readFileSync(new URL("../migrations/20261123_auto_portada.sql", import.meta.url), "utf8");

before(async () => {
  if (!modulo) return;
  const { PGlite } = await import(modulo);
  db = new PGlite();
  await db.exec(`
    create table public.automotoras (id uuid primary key, slug text);
    create table public.autos (id uuid primary key default gen_random_uuid(), automotora_id uuid references automotoras(id), codigo text);
    insert into automotoras values ('${A}', 'chillan-vende-autos'), ('${B}', 'otra');
    insert into autos (automotora_id, codigo) values ('${A}', 'CV-1'), ('${A}', 'CV-2'), ('${B}', 'OT-1');
  `);
  await db.exec(sql);
  await db.exec(sql);
});

test("los autos quedan fuera de la portada hasta que se elija uno", opciones, async () => {
  const { rows } = await db.query("select count(*)::int n from autos where en_portada");
  assert.equal(rows[0].n, 0);
});

test("solo un auto por automotora puede estar en la portada", opciones, async () => {
  await db.exec("update autos set en_portada = true where codigo = 'CV-1'");
  await assert.rejects(db.exec("update autos set en_portada = true where codigo = 'CV-2'"));
  await db.exec("update autos set en_portada = true where codigo = 'OT-1'");
  await db.exec("update autos set en_portada = false where automotora_id = '" + A + "'; update autos set en_portada = true where codigo = 'CV-2'");
  const { rows } = await db.query("select codigo from autos where en_portada order by codigo");
  assert.deepEqual(rows.map((r) => r.codigo), ["CV-2", "OT-1"]);
});
