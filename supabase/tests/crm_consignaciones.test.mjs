// Pruebas de la base del CRM sobre un Postgres temporal en memoria.
// No toca Supabase. Requiere PGlite fuera del proyecto, indicado con PGLITE_MODULE.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, test } from "node:test";
import { extraerMensajes } from "../../src/app/admin/crm/importador/extractor.ts";
import { construirImportacion } from "../../src/app/admin/crm/importador/guardado.ts";
import { claveCambio, cambiosDe, crearRevision } from "../../src/app/admin/crm/importador/revision.ts";

const modulo = process.env.PGLITE_MODULE;
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const USUARIO_A = "10000000-0000-4000-8000-00000000000a";
const USUARIO_B = "10000000-0000-4000-8000-00000000000b";
const AUTO_B = "20000000-0000-4000-8000-00000000000b";

let db;
let secuencia = 0;

const uuid = () => `30000000-0000-4000-8000-${String(++secuencia).padStart(12, "0")}`;
const migracion = (nombre) => readFileSync(new URL(`../migrations/${nombre}`, import.meta.url), "utf8");

async function como(rol, usuario, accion) {
  await db.exec(`set role ${rol}; select set_config('t.uid', '${usuario ?? ""}', false);`);
  try {
    return await accion();
  } finally {
    await db.exec("reset role");
  }
}

const socio = (accion) => como("authenticated", USUARIO_A, accion);
const fila = async (sql, datos = []) => (await db.query(sql, datos)).rows[0];
const filas = async (sql, datos = []) => (await db.query(sql, datos)).rows;

const mensaje = (texto = "Toyota Hilux 2021 patente LPKD45 de Juan Pérez") => ({ orden: 0, autor: "Socio", texto });
const clienteNuevo = (extra = {}) => ({
  accion: "crear",
  datos: { nombre: "Juan Pérez", rut: "12.345.678-5", telefono: "+56912345678", ...extra },
});
const vehiculoNuevo = (patente = "LPKD45", extra = {}) => ({
  accion: "crear",
  propietario_origen: "mensaje",
  propietario_fragmento: "Hilux de Juan Pérez",
  datos: { patente, marca: "Toyota", modelo: "Hilux", anio: 2021, ...extra },
});
const consignacionNueva = (precio = 18000000) => ({
  accion: "crear",
  datos: { estado: "activa", precio_solicitado: precio },
});

async function importar(bloques, extra = {}) {
  const r = await fila("select public.crm_confirmar_importacion($1::jsonb) as r", [
    JSON.stringify({ importacion_id: uuid(), mensajes: [mensaje()], bloques, ...extra }),
  ]);
  return r.r;
}

async function limpiar() {
  await db.exec(`
    alter table public.crm_actividades disable trigger all;
    delete from public.crm_actividades;
    alter table public.crm_actividades enable trigger all;
    delete from public.crm_importaciones;
    delete from public.crm_consignaciones;
    delete from public.crm_vehiculo_documentos;
    delete from public.crm_vehiculos;
    delete from public.crm_oportunidades;
    delete from public.crm_clientes;
    delete from public.crm_cambios;
  `);
}

const opciones = { skip: modulo ? false : "falta PGLITE_MODULE" };

before(async () => {
  if (!modulo) return;
  const { PGlite } = await import(modulo);
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; grant usage on schema auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('t.uid', true), '')::uuid $$;
    create table public.automotoras (id uuid primary key);
    create table public.perfiles (user_id uuid primary key, automotora_id uuid not null);
    create table public.autos (id uuid primary key default gen_random_uuid(), automotora_id uuid references automotoras(id));
    create function public.mi_automotora() returns uuid language sql stable security definer set search_path = '' as
      $$ select p.automotora_id from public.perfiles p where p.user_id = auth.uid() $$;
    grant usage on schema public to anon, authenticated;
    grant select on public.autos to anon, authenticated;
    insert into automotoras values ('${A}'), ('${B}');
    insert into perfiles values ('${USUARIO_A}', '${A}'), ('${USUARIO_B}', '${B}');
    insert into autos (id, automotora_id) values ('${AUTO_B}', '${B}');
  `);
  await db.exec(migracion("20261119_crm_base.sql"));
  const sql = migracion("20261120_crm_consignaciones.sql");
  await db.exec(sql);
  await db.exec(sql);
});

test("valida RUT y patentes chilenas", opciones, async () => {
  const r = await fila(`select
    crm_rut_valido(crm_rut_normalizar('12.345.678-5')) ok1,
    crm_rut_valido(crm_rut_normalizar('11111111-1')) ok2,
    crm_rut_valido(crm_rut_normalizar('12.345.678-9')) malo,
    crm_patente_valida(crm_patente_normalizar('lp-kd 45')) nueva,
    crm_patente_valida(crm_patente_normalizar('AB.1234')) antigua,
    crm_patente_valida(crm_patente_normalizar('1234AB')) invalida`);
  assert.deepEqual(r, { ok1: true, ok2: true, malo: false, nueva: true, antigua: true, invalida: false });
});

test("un cliente puede tener varios vehículos con operaciones separadas", opciones, async () => {
  await limpiar();
  await socio(async () => {
    const primero = await importar([{ cliente: clienteNuevo(), vehiculo: vehiculoNuevo(), consignacion: consignacionNueva() }]);
    const cliente = primero.registros["0"].cliente;
    await importar([{
      cliente: { accion: "usar", id: cliente },
      vehiculo: vehiculoNuevo("GHJK12", { marca: "Kia", modelo: "Rio" }),
      consignacion: consignacionNueva(9000000),
    }]);
    const r = await fila(`select
      (select count(*)::int from crm_clientes) clientes,
      (select count(*)::int from crm_vehiculos where cliente_id = $1) vehiculos,
      (select count(*)::int from crm_consignaciones where propietario_id = $1) consignaciones`, [cliente]);
    assert.deepEqual(r, { clientes: 1, vehiculos: 2, consignaciones: 2 });
  });
});

test("no duplica clientes ni patentes", opciones, async () => {
  await limpiar();
  await socio(async () => {
    await importar([{ cliente: clienteNuevo(), vehiculo: vehiculoNuevo() }]);
    await assert.rejects(importar([{ cliente: clienteNuevo({ telefono: "+56999999999" }) }]), /ya existe un cliente/);
    await assert.rejects(
      importar([{ cliente: clienteNuevo({ rut: "11111111-1", telefono: "+56912345678" }) }]),
      /ya existe un cliente/
    );
    await assert.rejects(
      importar([{
        cliente: clienteNuevo({ rut: "11111111-1", telefono: "+56988888888" }),
        vehiculo: vehiculoNuevo(),
      }]),
      /ya está registrada/
    );
    assert.equal((await fila("select count(*)::int n from crm_clientes")).n, 1);
  });
});

test("todo el guardado se revierte si un bloque falla", opciones, async () => {
  await limpiar();
  await socio(async () => {
    await assert.rejects(
      importar([
        { cliente: clienteNuevo(), vehiculo: vehiculoNuevo() },
        { cliente: clienteNuevo({ rut: "11111111-1", telefono: "+56977777777" }), vehiculo: vehiculoNuevo("MALA") },
      ]),
      /patente no es válida/
    );
    const r = await fila(`select (select count(*)::int from crm_clientes) c, (select count(*)::int from crm_importaciones) i`);
    assert.deepEqual(r, { c: 0, i: 0 });
  });
});

test("la propiedad necesita respaldo y no se hereda", opciones, async () => {
  await limpiar();
  await socio(async () => {
    await assert.rejects(
      importar([{ cliente: clienteNuevo(), vehiculo: { ...vehiculoNuevo(), propietario_origen: null } }]),
      /confirma quién es el propietario/
    );
    await assert.rejects(
      importar([{ cliente: clienteNuevo(), vehiculo: { ...vehiculoNuevo(), propietario_fragmento: " " } }]),
      /fragmento que respalda/
    );
    const r = await importar([{ cliente: clienteNuevo(), vehiculo: vehiculoNuevo() }]);
    const otro = await importar([{ cliente: clienteNuevo({ rut: "11111111-1", telefono: "+56977777777", nombre: "Ana" }) }]);
    const vehiculo = r.registros["0"].vehiculo;
    const usar = { accion: "usar", id: vehiculo, propietario_origen: "usuario" };
    const ana = { accion: "usar", id: otro.registros["0"].cliente };
    await assert.rejects(importar([{ cliente: ana, vehiculo: usar }]), /pertenece a otro cliente/);
    await importar([{ cliente: ana, vehiculo: { ...usar, cambiar_propietario: true } }]);
    assert.equal((await fila("select cliente_id from crm_vehiculos where id = $1", [vehiculo])).cliente_id, ana.id);
  });
});

test("una consignación vigente impide otra y bloquea el cambio de dueño", opciones, async () => {
  await limpiar();
  await socio(async () => {
    const r = await importar([{ cliente: clienteNuevo(), vehiculo: vehiculoNuevo(), consignacion: consignacionNueva() }]);
    const { cliente, vehiculo, consignacion } = r.registros["0"];
    const usar = { accion: "usar", id: vehiculo, propietario_origen: "usuario" };
    await assert.rejects(
      importar([{ cliente: { accion: "usar", id: cliente }, vehiculo: usar, consignacion: consignacionNueva() }]),
      /consignación vigente/
    );
    const ana = await importar([{ cliente: clienteNuevo({ rut: "11111111-1", telefono: "+56977777777", nombre: "Ana" }) }]);
    await assert.rejects(
      importar([{ cliente: { accion: "usar", id: ana.registros["0"].cliente }, vehiculo: { ...usar, cambiar_propietario: true } }]),
      /cierra la consignación vigente/
    );
    await db.query("update crm_consignaciones set estado = 'retirada' where id = $1", [consignacion]);
    const cerrada = await fila("select cerrado_en from crm_consignaciones where id = $1", [consignacion]);
    assert.ok(cerrada.cerrado_en);
    await importar([{ cliente: { accion: "usar", id: cliente }, vehiculo: usar, consignacion: consignacionNueva(17000000) }]);
    assert.equal((await fila("select count(*)::int n from crm_consignaciones where vehiculo_id = $1", [vehiculo])).n, 2);
  });
});

test("actualiza precio conservando historial y detecta datos desactualizados", opciones, async () => {
  await limpiar();
  await socio(async () => {
    const r = await importar([{ cliente: clienteNuevo(), vehiculo: vehiculoNuevo(), consignacion: consignacionNueva() }]);
    const { cliente, vehiculo, consignacion } = r.registros["0"];
    const bloque = (de) => ({
      cliente: { accion: "usar", id: cliente },
      vehiculo: { accion: "usar", id: vehiculo, propietario_origen: "usuario" },
      consignacion: { accion: "actualizar", id: consignacion, cambios: { precio_solicitado: { de, a: "17500000" } } },
    });
    await assert.rejects(importar([bloque("19000000")]), /cambió mientras revisabas/);
    await importar([bloque("18000000")]);
    const precio = await fila("select precio_solicitado::text p from crm_consignaciones where id = $1", [consignacion]);
    assert.equal(precio.p, "17500000");
    const cambio = await fila(
      "select valor_anterior, valor_nuevo, vehiculo_id, importacion_id, creado_por from crm_cambios where campo = 'precio_solicitado'"
    );
    assert.equal(cambio.valor_anterior, "18000000");
    assert.equal(cambio.valor_nuevo, "17500000");
    assert.equal(cambio.vehiculo_id, vehiculo);
    assert.ok(cambio.importacion_id);
    assert.equal(cambio.creado_por, USUARIO_A);
  });
});

test("compara decimales por valor al revisar cambios", opciones, async () => {
  await limpiar();
  await socio(async () => {
    const r = await importar([{
      cliente: clienteNuevo(), vehiculo: vehiculoNuevo(),
      consignacion: { accion: "crear", datos: { estado: "activa", comision_tipo: "porcentaje", comision_valor: "5" } },
    }]);
    const { cliente, vehiculo, consignacion } = r.registros["0"];
    await importar([{
      cliente: { accion: "usar", id: cliente },
      vehiculo: { accion: "usar", id: vehiculo, propietario_origen: "usuario" },
      consignacion: { accion: "actualizar", id: consignacion, cambios: { comision_valor: { de: "5", a: "6" } } },
    }]);
    assert.equal((await fila("select comision_valor::text v from crm_consignaciones")).v, "6.00");
  });
});

test("solo modifica campos permitidos y oculta el RUT en el historial", opciones, async () => {
  await limpiar();
  await socio(async () => {
    const r = await importar([{ cliente: clienteNuevo() }]);
    const id = r.registros["0"].cliente;
    await assert.rejects(
      importar([{ cliente: { accion: "usar", id, cambios: { automotora_id: { de: A, a: B } } } }]),
      /no se puede modificar/
    );
    await importar([{ cliente: { accion: "usar", id, cambios: { rut: { de: "12345678-5", a: "11111111-1" } } } }]);
    const c = await fila("select valor_anterior a, valor_nuevo n from crm_cambios where campo = 'rut'");
    assert.deepEqual(c, { a: "***78-5", n: "***11-1" });
  });
});

test("una importación pendiente guarda el mensaje sin crear registros", opciones, async () => {
  await limpiar();
  await socio(async () => {
    const id = uuid();
    const campos = [{ bloque: 0, mensaje_orden: 0, entidad: "vehiculo", campo: "patente", estado: "pendiente", inicio: 0, fin: 4, fragmento: "Hilux" }];
    const base = { importacion_id: id, mensajes: [mensaje()], campos };
    const llamar = (p) => fila("select public.crm_confirmar_importacion($1::jsonb) r", [JSON.stringify(p)]);
    await llamar({ ...base, estado: "pendiente", bloques: [{ cliente: clienteNuevo() }] });
    let r = await fila(`select (select count(*)::int from crm_clientes) c, (select count(*)::int from crm_importacion_mensajes) m,
      (select estado from crm_importaciones where id = $1) e`, [id]);
    assert.deepEqual(r, { c: 0, m: 1, e: "pendiente" });
    await llamar({ ...base, bloques: [{ cliente: clienteNuevo(), vehiculo: vehiculoNuevo() }] });
    r = await fila(`select (select count(*)::int from crm_clientes) c, (select count(*)::int from crm_importacion_mensajes) m,
      (select count(*)::int from crm_importacion_campos where registro_id is not null) k,
      (select estado from crm_importaciones where id = $1) e`, [id]);
    assert.deepEqual(r, { c: 1, m: 1, k: 1, e: "confirmada" });
    await assert.rejects(llamar({ ...base, bloques: [] }), /ya fue confirmada/);
  });
});

test("no borra por accidente a un cliente con vehículos", opciones, async () => {
  await limpiar();
  await socio(async () => {
    const r = await importar([{ cliente: clienteNuevo(), vehiculo: vehiculoNuevo() }]);
    await assert.rejects(db.query("delete from crm_clientes where id = $1", [r.registros["0"].cliente]), /crm_vehiculos_cliente/);
  });
});

test("aísla los datos entre automotoras", opciones, async () => {
  await limpiar();
  const r = await socio(() => importar([{ cliente: clienteNuevo(), vehiculo: vehiculoNuevo(), consignacion: consignacionNueva() }]));
  await como("authenticated", USUARIO_B, async () => {
    for (const t of ["crm_vehiculos", "crm_consignaciones", "crm_importaciones", "crm_importacion_mensajes", "crm_cambios"]) {
      assert.equal((await fila(`select count(*)::int n from ${t}`)).n, 0, t);
    }
    await assert.rejects(
      importar([{ cliente: { accion: "usar", id: r.registros["0"].cliente } }]),
      /cliente elegido no existe/
    );
  });
  await socio(() =>
    assert.rejects(
      db.query("update crm_vehiculos set auto_id = $1 where id = $2", [AUTO_B, r.registros["0"].vehiculo]),
      /row-level security/
    )
  );
});

test("el público no accede y nadie escribe el historial", opciones, async () => {
  await limpiar();
  await como("anon", null, async () => {
    for (const t of ["crm_vehiculos", "crm_consignaciones", "crm_vehiculo_documentos", "crm_importaciones", "crm_importacion_mensajes", "crm_importacion_campos", "crm_cambios"]) {
      await assert.rejects(db.query(`select * from ${t}`), /permission denied/, t);
    }
    await assert.rejects(importar([]), /permission denied/);
  });
  await socio(async () => {
    await assert.rejects(
      db.query("insert into crm_cambios (automotora_id, tabla, registro_id, operacion) values ($1, 'x', $2, 'crear')", [A, uuid()]),
      /permission denied/
    );
    await assert.rejects(db.query("delete from crm_cambios"), /permission denied/);
  });
  const columnas = await filas("select column_name from information_schema.columns where table_name = 'autos'");
  assert.ok(!columnas.some((c) => ["patente", "rut", "cliente_id"].includes(c.column_name)));
});

const HOY = new Date(2026, 10, 18);

async function baseActual() {
  const [clientes, vehiculos, consignaciones, documentos] = await Promise.all(
    ["crm_clientes", "crm_vehiculos", "crm_consignaciones", "crm_vehiculo_documentos"].map((t) => filas(`select * from ${t} order by creado_en desc`))
  );
  const numero = (c) => ({
    ...c,
    precio_solicitado: c.precio_solicitado === null ? null : Number(c.precio_solicitado),
    precio_minimo: c.precio_minimo === null ? null : Number(c.precio_minimo),
    comision_valor: c.comision_valor === null ? null : Number(c.comision_valor),
  });
  return { clientes, vehiculos, consignaciones: consignaciones.map(numero), documentos };
}

const aprobar = (b) => ({
  ...b,
  propietario_confirmado: b.relacion.estado !== "respaldado",
  campos: b.campos.map((c) => (c.valor && c.estado === "por_confirmar" && c.decision === "sin_decision" ? { ...c, decision: "aceptado" } : c)),
});

async function guardarTexto(texto, ajustar = (b) => b) {
  const base = await baseActual();
  const r = crearRevision(extraerMensajes(texto, HOY), base);
  const bloques = r.bloques.map((b, i) => ajustar(aprobar(b), i, base));
  const solicitud = construirImportacion({ ...r, bloques }, base, uuid());
  return (await fila("select public.crm_confirmar_importacion($1::jsonb) r", [JSON.stringify(solicitud)])).r;
}

test("de punta a punta: crea, reutiliza al dueño y actualiza con historial", opciones, async () => {
  await limpiar();
  await socio(async () => {
    await guardarTexto("Toyota Hilux 2021 patente LPKD45 de Juan Pérez, RUT 12.345.678-5, teléfono 912345678, dejó en consignación, precio 18 millones, SOAP vencido");
    let datos = await baseActual();
    assert.equal(datos.clientes.length, 1);
    assert.equal(datos.consignaciones[0].estado, "activa");
    assert.equal(datos.documentos[0].estado, "vencido");
    assert.equal(datos.vehiculos[0].propietario_origen, "mensaje");

    await guardarTexto("Kia Sportage GHJK12 teléfono 912345678 precio 12 millones");
    datos = await baseActual();
    assert.equal(datos.clientes.length, 1);
    assert.equal(datos.vehiculos.length, 2);
    assert.equal(datos.consignaciones.length, 2);
    assert.ok(datos.vehiculos.every((v) => v.cliente_id === datos.clientes[0].id));

    await guardarTexto("La patente LPKD45 finalmente quedó en 17.500.000", (b, _i, base) => ({
      ...b,
      cambios_aceptados: cambiosDe(b, base).filter((c) => c.campo === "precio_solicitado").map(claveCambio),
    }));
    datos = await baseActual();
    assert.equal(datos.consignaciones.find((c) => c.precio_solicitado === 17500000)?.estado, "activa");
    const h = await fila("select valor_anterior, valor_nuevo from crm_cambios where campo = 'precio_solicitado'");
    assert.deepEqual(h, { valor_anterior: "18000000", valor_nuevo: "17500000" });
    const origen = await fila("select count(*)::int n from crm_importacion_campos c join crm_importacion_mensajes m on m.id = c.mensaje_id where c.campo = 'patente' and c.registro_id is not null");
    assert.equal(origen.n, 3);
  });
});

test("de punta a punta: sin aceptar un cambio no se sobrescribe", opciones, async () => {
  await limpiar();
  await socio(async () => {
    await guardarTexto("Hilux LPKD45 de Juan Pérez teléfono 912345678 precio 18 millones");
    await guardarTexto("LPKD45 ahora precio 16 millones");
    assert.equal((await baseActual()).consignaciones[0].precio_solicitado, 18000000);
    assert.equal((await fila("select count(*)::int n from crm_cambios where campo = 'precio_solicitado'")).n, 0);
  });
});

test("de punta a punta: un segundo auto puede usar al dueño del bloque anterior", opciones, async () => {
  await limpiar();
  await socio(async () => {
    await guardarTexto("Juan Pérez teléfono 912345678 tiene una Hilux LPKD45 y una Corolla GHJK12", (b, i) =>
      i === 1 ? { ...b, cliente: { modo: "bloque", id: null, bloque: 0 }, propietario_confirmado: true } : { ...b, propietario_confirmado: true }
    );
    const datos = await baseActual();
    assert.equal(datos.clientes.length, 1);
    assert.equal(datos.vehiculos.length, 2);
    assert.ok(datos.vehiculos.every((v) => v.propietario_origen === "usuario"));
  });
});
