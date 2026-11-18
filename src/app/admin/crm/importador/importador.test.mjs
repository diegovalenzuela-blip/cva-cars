import assert from "node:assert/strict";
import { test } from "node:test";
import { buscarCoincidencias } from "./coincidencias.ts";
import { extraerMensajes, separarMensajes } from "./extractor.ts";
import { interpretarDinero, normalizarRut, rutValido } from "./reconocer.ts";
import { cambiosDe, crearRevision, problemasBloque, validarValor, valorDe } from "./revision.ts";

const HOY = new Date(2026, 10, 18);
const extraer = (t) => extraerMensajes(t, HOY).bloques;
const campo = (b, entidad, nombre) => b.campos.find((c) => c.entidad === entidad && c.campo === nombre);
const valor = (b, entidad, nombre) => campo(b, entidad, nombre)?.valor ?? null;
const estado = (b, entidad, nombre) => campo(b, entidad, nombre)?.estado;

const COMPLETO =
  "Toyota Hilux 2021 patente LPKD45, dueño Juan Pérez Soto, RUT 12.345.678-5, teléfono +56 9 1234 5678, correo juan@ejemplo.cl, precio 18 millones, mínimo 17.000.000, comisión 5%, 85.000 km, revisión técnica al día, SOAP vencido, permiso vence 03/2027, Chillán";

test("mensaje completo: extrae cada dato con su origen", () => {
  const [b, sobra] = extraer(COMPLETO);
  assert.equal(sobra, undefined);
  const esperado = [
    ["vehiculo", "marca", "Toyota"], ["vehiculo", "modelo", "Hilux"], ["vehiculo", "anio", "2021"],
    ["vehiculo", "patente", "LPKD45"], ["vehiculo", "km", "85000"], ["cliente", "nombre", "Juan Pérez Soto"],
    ["cliente", "rut", "12345678-5"], ["cliente", "telefono", "+56912345678"], ["cliente", "email", "juan@ejemplo.cl"],
    ["consignacion", "precio_solicitado", "18000000"], ["consignacion", "precio_minimo", "17000000"],
    ["consignacion", "comision_tipo", "porcentaje"], ["consignacion", "comision_valor", "5"],
    ["documento", "revision_tecnica", "al_dia"], ["documento", "soap", "vencido"],
    ["documento", "permiso_circulacion", "al_dia"], ["documento", "permiso_circulacion_vence", "2027-03-31"],
    ["cliente", "comuna", "Chillán"],
  ];
  for (const [e, c, v] of esperado) assert.equal(valor(b, e, c), v, `${e}.${c}`);
  const patente = campo(b, "vehiculo", "patente");
  assert.equal(COMPLETO.slice(patente.inicio, patente.fin).includes("LPKD45"), true);
  assert.ok(patente.fragmento.includes("LPKD45"));
  assert.equal(b.propietario.estado, "respaldado");
  assert.equal(b.tipo, "nuevo");
  assert.equal(b.campos.filter((c) => c.estado === "pendiente").length, 0);
});

test("mensaje incompleto: marca lo que falta sin inventar", () => {
  const [b] = extraer("Corolla blanco 2018");
  assert.equal(valor(b, "vehiculo", "modelo"), "Corolla");
  assert.equal(valor(b, "vehiculo", "marca"), "Toyota");
  assert.equal(estado(b, "vehiculo", "marca"), "por_confirmar");
  for (const [e, c] of [["vehiculo", "patente"], ["cliente", "nombre"], ["cliente", "telefono"], ["consignacion", "precio_solicitado"]]) {
    assert.equal(estado(b, e, c), "pendiente", c);
    assert.equal(valor(b, e, c), null);
  }
  assert.equal(b.propietario.estado, "sin_datos");
});

test("varios vehículos y propietarios en un texto", () => {
  const bloques = extraer("Hilux LPKD45 de Juan Pérez 912345678 en 18 millones\nCorolla GHJK12 de Ana Soto 987654321 en 9 millones");
  assert.equal(bloques.length, 2);
  assert.deepEqual(bloques.map((b) => valor(b, "vehiculo", "patente")), ["LPKD45", "GHJK12"]);
  assert.deepEqual(bloques.map((b) => valor(b, "cliente", "nombre")), ["Juan Pérez", "Ana Soto"]);
  assert.deepEqual(bloques.map((b) => valor(b, "cliente", "telefono")), ["+56912345678", "+56987654321"]);
  assert.ok(bloques.every((b) => b.propietario.estado === "respaldado"));
});

test("persona primero y vehículo después también se separa", () => {
  const bloques = extraer("Juan Pérez 912345678\nHilux LPKD45\nAna Soto 987654321\nCorolla GHJK12");
  assert.equal(bloques.length, 2);
  assert.equal(valor(bloques[1], "cliente", "nombre"), "Ana Soto");
  assert.equal(valor(bloques[1], "vehiculo", "patente"), "GHJK12");
});

test("el segundo vehículo no hereda al dueño: solo lo sugiere", () => {
  const [a, b] = extraer("Juan Pérez tiene una Hilux LPKD45 y una Corolla GHJK12");
  assert.equal(valor(a, "cliente", "nombre"), "Juan Pérez");
  assert.equal(valor(b, "vehiculo", "patente"), "GHJK12");
  assert.equal(estado(b, "cliente", "nombre"), "pendiente");
  assert.equal(b.propietario.estado, "por_confirmar");
  assert.equal(b.propietario.posible_bloque, a.indice);
});

test("quien envía el mensaje no se considera propietario", () => {
  const { mensajes, bloques } = extraerMensajes("[18/11/26, 10:30:12] Pedro Socio: Hilux LPKD45 precio 18 millones", HOY);
  assert.equal(mensajes[0].autor, "Pedro Socio");
  assert.equal(valor(bloques[0], "cliente", "nombre"), null);
  assert.equal(bloques[0].propietario.estado, "sin_datos");
});

test("un nombre suelto no prueba la propiedad", () => {
  const [b] = extraer("Toyota Hilux 2021, patente LPKD45, Juan Pérez, teléfono 912345678, precio 18 millones");
  assert.equal(valor(b, "cliente", "nombre"), "Juan Pérez");
  assert.equal(b.propietario.estado, "por_confirmar");
});

test("separa formatos de exportación de WhatsApp", () => {
  const m = separarMensajes("18/11/2026, 10:30 - Ana: primero\nsigue\n[18/11/26, 10:31:02 p. m.] Luis: segundo");
  assert.deepEqual(m.map((x) => [x.autor, x.texto]), [["Ana", "primero\nsigue"], ["Luis", "segundo"]]);
  assert.equal(separarMensajes("uno\n\ndos").length, 2);
});

test("teléfonos chilenos en distintos formatos", () => {
  for (const t of ["912345678", "9 1234 5678", "9-1234-5678", "+56912345678", "+56 9 1234 5678", "56 9 1234-5678", "09 1234 5678", "(9) 1234 5678"]) {
    const [b] = extraer(`Hilux teléfono ${t}`);
    assert.equal(valor(b, "cliente", "telefono"), "+56912345678", t);
  }
  const [fijo] = extraer("Hilux fono 42 222 3344");
  assert.equal(valor(fijo, "cliente", "telefono"), "+56422223344");
  assert.equal(estado(fijo, "cliente", "telefono"), "por_confirmar");
});

test("patentes chilenas", () => {
  for (const [t, p, e] of [
    ["Hilux LPKD45", "LPKD45", "detectado"], ["Hilux LP-KD-45", null, undefined], ["Hilux LPKD-45", "LPKD45", "detectado"],
    ["Hilux patente lpkd 45", "LPKD45", "detectado"], ["Hilux ppu ab1234", "AB1234", "detectado"],
    ["Hilux AB 1234", "AB1234", "detectado"], ["Hilux lpkd45", "LPKD45", "por_confirmar"],
  ]) {
    const [b] = extraer(t);
    if (p) {
      assert.equal(valor(b, "vehiculo", "patente"), p, t);
      assert.equal(estado(b, "vehiculo", "patente"), e, t);
    }
  }
  assert.equal(valor(extraer("Hilux auto 21")[0], "vehiculo", "patente"), null);
  assert.equal(valor(extraer("Hilux KM 1234")[0], "vehiculo", "patente"), null);
});

test("precios escritos de distintas maneras", () => {
  for (const [t, v] of [
    ["18 millones", 18000000], ["18 mill", 18000000], ["18M", 18000000], ["18 MM", 18000000], ["18 palos", 18000000],
    ["17,5 millones", 17500000], ["17.5 palos", 17500000], ["17 millones y medio", 17500000],
    ["17 millones 500 mil", 17500000], ["$17.500.000", 17500000], ["17.500.000", 17500000], ["17500000", 17500000],
    ["17 500 000", 17500000], ["900 lucas", 900000], ["500 mil", 500000],
  ]) {
    const [b] = extraer(`Hilux LPKD45 precio ${t}`);
    assert.equal(valor(b, "consignacion", "precio_solicitado"), String(v), t);
    assert.equal(estado(b, "consignacion", "precio_solicitado"), "detectado", t);
  }
  const [corto] = extraer("Hilux LPKD45 precio 18");
  assert.equal(valor(corto, "consignacion", "precio_solicitado"), "18000000");
  assert.equal(estado(corto, "consignacion", "precio_solicitado"), "por_confirmar");
  const [suelto] = extraer("Hilux LPKD45 $18.000.000");
  assert.equal(estado(suelto, "consignacion", "precio_solicitado"), "por_confirmar");
  assert.deepEqual(interpretarDinero("18", "millones"), { valor: 18000000, exacto: true });
});

test("no confunde año, kilometraje, teléfono o RUT con precio", () => {
  const [b] = extraer("Hilux LPKD45 2021 85 mil km 912345678 rut 12.345.678-5");
  assert.equal(valor(b, "vehiculo", "anio"), "2021");
  assert.equal(valor(b, "vehiculo", "km"), "85000");
  assert.equal(estado(b, "consignacion", "precio_solicitado"), "pendiente");
});

test("una oferta no se convierte en precio", () => {
  const [b] = extraer("Hilux LPKD45 precio 18 millones, le ofrecen 15 millones");
  assert.equal(valor(b, "consignacion", "precio_solicitado"), "18000000");
  assert.ok(valor(b, "consignacion", "observaciones").includes("ofrecen"));
});

test("RUT inválido queda por confirmar", () => {
  assert.equal(normalizarRut("12.345.678-k"), "12345678-K");
  assert.equal(rutValido("12345678-5"), true);
  const [b] = extraer("Hilux rut 12.345.678-9");
  assert.equal(valor(b, "cliente", "rut"), "12345678-9");
  assert.equal(estado(b, "cliente", "rut"), "por_confirmar");
});

test("errores menores de escritura quedan por confirmar", () => {
  const [b] = extraer("hillux LPKD45");
  assert.equal(valor(b, "vehiculo", "modelo"), "Hilux");
  assert.equal(estado(b, "vehiculo", "modelo"), "por_confirmar");
  const [c] = extraer("Toyotta Corolla");
  assert.equal(valor(c, "vehiculo", "marca"), "Toyota");
});

test("lo hipotético no se vuelve consignación confirmada", () => {
  const [b] = extraer("Juan Pérez podría dejar en consignación su Hilux LPKD45 quizás en 18 millones");
  assert.equal(b.hipotetico, true);
  assert.equal(valor(b, "consignacion", "estado"), null);
  assert.equal(estado(b, "consignacion", "precio_solicitado"), "por_confirmar");
  const [firme] = extraer("Juan Pérez dejó en consignación su Hilux LPKD45");
  assert.equal(valor(firme, "consignacion", "estado"), "activa");
});

test("datos contradictorios quedan visibles para decidir", () => {
  const [b] = extraer("Hilux LPKD45 precio 18 millones\nprecio 19 millones");
  const c = campo(b, "consignacion", "precio_solicitado");
  assert.equal(c.estado, "por_confirmar");
  assert.equal(c.valor, "18000000");
  assert.equal(c.alternativas[0].valor, "19000000");
});

test("mensaje natural con etiquetas y abreviaturas", () => {
  const [b, sobra] = extraer(
    "Hola socio, me llegó una camioneta. Ford Ranger XLT 4x4 2019, 92 mil kms, ppu HJKL23. El dueño es Carlos Muñoz, fono 9 8765 4321, de San Carlos. Pide 16,5 palos y acepta hasta 15.800.000. Comisión 500 mil. RT vence en marzo 2027, permiso al día, sin SOAP."
  );
  assert.equal(sobra, undefined);
  assert.equal(valor(b, "cliente", "nombre"), "Carlos Muñoz");
  assert.equal(b.propietario.estado, "respaldado");
  assert.equal(valor(b, "vehiculo", "version"), "XLT 4x4");
  assert.equal(valor(b, "consignacion", "precio_solicitado"), "16500000");
  assert.equal(valor(b, "consignacion", "precio_minimo"), "15800000");
  assert.equal(valor(b, "consignacion", "comision_tipo"), "monto");
  assert.equal(valor(b, "documento", "soap"), "pendiente");
  assert.equal(valor(b, "documento", "revision_tecnica_vence"), "2027-03-31");
  assert.equal(valor(b, "consignacion", "observaciones")?.includes("Hola socio"), false);
});

test("un dueño con dos autos citados de nuevo en el mismo mensaje", () => {
  const bloques = extraer(
    "Don Pedro Rojas trajo su Kia Rio 2017 blanco y su Suzuki Swift 2020, los dos en consignación. Rio ABCD12 7 millones, Swift WXYZ34 9,5 millones"
  );
  assert.equal(bloques.length, 2);
  assert.equal(valor(bloques[0], "cliente", "nombre"), "Pedro Rojas");
  assert.equal(valor(bloques[0], "vehiculo", "patente"), "ABCD12");
  assert.equal(valor(bloques[0], "consignacion", "precio_solicitado"), "7000000");
  assert.equal(valor(bloques[1], "vehiculo", "patente"), "WXYZ34");
  assert.equal(valor(bloques[1], "consignacion", "precio_solicitado"), "9500000");
  assert.equal(valor(bloques[1], "cliente", "nombre"), null);
  assert.equal(bloques[1].propietario.posible_bloque, 0);
});

test("una rebaja se reconoce como actualización del precio", () => {
  const [b] = extraer("La Ranger bajó a 15 millones");
  assert.equal(b.tipo, "actualizacion");
  assert.equal(estado(b, "consignacion", "precio_solicitado"), "detectado");
});

test("saludos y mensajes vacíos no crean registros", () => {
  assert.deepEqual(extraer("gracias, buenas noches"), []);
  assert.deepEqual(extraer("   "), []);
});

const BASE = {
  clientes: [
    { id: "c1", nombre: "Juan Pérez", rut: "12345678-5", telefono: "+56912345678", email: null },
    { id: "c2", nombre: "Juan Soto", rut: null, telefono: "+56911111111", email: null },
    { id: "c3", nombre: "Ana Díaz", rut: "11111111-1", telefono: "+56922222222", email: null },
  ],
  vehiculos: [
    { id: "v1", cliente_id: "c1", patente: "LPKD45", marca: "Toyota", modelo: "Hilux", version: null, anio: 2021, km: null },
    { id: "v2", cliente_id: "c2", patente: "GHJK12", marca: "Toyota", modelo: "Hilux", version: null, anio: 2019, km: null },
  ],
  consignaciones: [
    { id: "o1", vehiculo_id: "v1", propietario_id: "c1", estado: "activa", precio_solicitado: 18000000, precio_minimo: null, comision_tipo: null, comision_valor: null },
  ],
};

test("mensaje de actualización propone cambiar el precio sin duplicar", () => {
  const { bloques } = extraerMensajes(
    "Toyota Hilux 2021, patente LPKD45, Juan Pérez, teléfono 912345678, precio 18 millones\n\nLa Hilux de Juan finalmente quedó en 17.500.000",
    HOY
  );
  assert.equal(bloques.length, 2);
  assert.equal(bloques[1].tipo, "actualizacion");
  assert.equal(bloques[1].actualiza_bloque, 0);
  const r = buscarCoincidencias(bloques[1], { ...BASE, vehiculos: [BASE.vehiculos[0]], clientes: [BASE.clientes[0]] });
  assert.equal(r.vehiculo.candidatos[0].id, "v1");
  assert.equal(r.vehiculo.candidatos[0].confianza, "probable");
  assert.equal(r.consignacion, "o1");
  assert.deepEqual(r.cambios.find((c) => c.campo === "precio_solicitado"), {
    entidad: "consignacion", id: "o1", campo: "precio_solicitado", de: "18000000", a: "17500000",
  });
});

test("duplicados: patente, RUT y teléfono encuentran el registro existente", () => {
  const [b] = extraer("Hilux LPKD45 rut 12.345.678-5 teléfono 912345678");
  const r = buscarCoincidencias(b, BASE);
  assert.equal(r.vehiculo.sugerido, "v1");
  assert.equal(r.cliente.sugerido, "c1");
  assert.equal(r.propietario_distinto, false);
  const [nuevoAuto] = extraer("Corolla ZXCV12 teléfono 912345678");
  const n = buscarCoincidencias(nuevoAuto, BASE);
  assert.equal(n.cliente.sugerido, "c1");
  assert.equal(n.vehiculo.candidatos.length, 0);
});

test("el nombre solo nunca selecciona un cliente", () => {
  const [b] = extraer("Corolla ZXCV12 de Ana Díaz");
  const r = buscarCoincidencias(b, BASE);
  assert.equal(r.cliente.sugerido, null);
  assert.equal(r.cliente.candidatos[0].confianza, "probable");
});

test("coincidencias ambiguas quedan para elegir", () => {
  const [b] = extraer("La Hilux de Juan quedó en 17 millones");
  const r = buscarCoincidencias(b, BASE);
  assert.equal(r.vehiculo.sugerido, null);
  assert.equal(r.vehiculo.candidatos.length, 2);
  assert.ok(r.avisos.some((a) => a.includes("más de un vehículo")));
  assert.deepEqual(r.cambios, []);
});

test("RUT y teléfono de personas distintas no eligen a ninguna", () => {
  const [b] = extraer("Corolla ZXCV12 rut 11.111.111-1 teléfono 912345678");
  const r = buscarCoincidencias(b, BASE);
  assert.equal(r.cliente.sugerido, null);
  assert.equal(r.cliente.ambiguo, true);
});

test("avisa si el vehículo existe con otro propietario", () => {
  const [b] = extraer("Hilux LPKD45 de Ana Díaz teléfono 922222222");
  const r = buscarCoincidencias(b, BASE);
  assert.equal(r.vehiculo.sugerido, "v1");
  assert.equal(r.propietario_distinto, true);
  assert.equal(r.cliente.sugerido, null);
});

const revisar = (texto, base = BASE) => crearRevision(extraerMensajes(texto, HOY), base);
const decidirTodo = (b) => ({ ...b, campos: b.campos.map((c) => ({ ...c, decision: c.valor && c.estado === "por_confirmar" ? "aceptado" : c.decision })) });

test("revisión: un contacto nuevo completo queda listo solo tras revisar dudas", () => {
  const vacia = { clientes: [], vehiculos: [], consignaciones: [] };
  const { bloques: [b] } = revisar("Toyota Hilux 2021 LPKD45 de Juan Pérez, teléfono 912345678, precio 18 millones, Chillán", vacia);
  assert.equal(b.cliente.modo, "crear");
  assert.equal(b.vehiculo.modo, "crear");
  assert.deepEqual(problemasBloque(b, vacia), ["Revisa 1 dato por confirmar."]);
  assert.deepEqual(problemasBloque(decidirTodo(b), vacia), []);
});

test("revisión: sin patente ni dueño confirmado no se puede guardar", () => {
  const vacia = { clientes: [], vehiculos: [], consignaciones: [] };
  const { bloques: [b] } = revisar("Corolla 2018 Juan Pérez teléfono 912345678", vacia);
  const p = problemasBloque(decidirTodo(b), vacia);
  assert.ok(p.includes("Falta la patente."));
  assert.ok(p.includes("Confirma quién es el propietario."));
});

test("revisión: dos mensajes del mismo auto se fusionan sin duplicar", () => {
  const vacia = { clientes: [], vehiculos: [], consignaciones: [] };
  const r = revisar("Hilux LPKD45 de Juan Pérez teléfono 912345678 precio 18 millones\n\nLa Hilux de Juan quedó en 17.500.000", vacia);
  assert.equal(r.bloques.length, 1);
  assert.equal(r.fusionados, 1);
  const c = r.bloques[0].campos.find((x) => x.campo === "precio_solicitado");
  assert.equal(c.valor, "17500000");
  assert.equal(c.estado, "por_confirmar");
  assert.equal(c.alternativas[0].valor, "18000000");
});

test("revisión: muestra cambios y exige confirmar otro propietario", () => {
  const { bloques: [b] } = revisar("Hilux LPKD45 de Ana Díaz teléfono 922222222 precio 17 millones");
  assert.equal(b.vehiculo.id, "v1");
  assert.equal(b.cliente.modo, null);
  const elegido = decidirTodo({ ...b, cliente: { modo: "usar", id: "c3", bloque: null } });
  assert.ok(problemasBloque(elegido, BASE).some((p) => p.includes("cambio de propietario")));
  const conConfirmacion = { ...elegido, cambiar_propietario: true, propietario_confirmado: true };
  assert.deepEqual(problemasBloque(conConfirmacion, BASE), []);
  assert.equal(cambiosDe(conConfirmacion, BASE).find((c) => c.campo === "precio_solicitado").a, "17000000");
  assert.equal(valorDe(b, "vehiculo", "patente"), "LPKD45");
});

test("revisión: valida y normaliza lo editado", () => {
  assert.deepEqual(validarValor({ entidad: "vehiculo", campo: "patente" }, "lp kd 45"), { valor: "LPKD45" });
  assert.equal(validarValor({ entidad: "cliente", campo: "rut" }, "12.345.678-9").error, "RUT no válido.");
  assert.deepEqual(validarValor({ entidad: "cliente", campo: "telefono" }, "9 1234 5678"), { valor: "+56912345678" });
  assert.deepEqual(validarValor({ entidad: "consignacion", campo: "precio_solicitado" }, "$17.500.000"), { valor: "17500000" });
});

test("revisión: una actualización simple solo pide confirmar el cambio", () => {
  const base = { ...BASE, clientes: [BASE.clientes[0]], vehiculos: [BASE.vehiculos[0]] };
  const { bloques: [b] } = revisar("La Hilux de Juan finalmente quedó en 17.500.000", base);
  assert.equal(b.cliente.id, "c1");
  assert.equal(b.vehiculo.id, "v1");
  assert.deepEqual(problemasBloque(b, base), []);
  assert.deepEqual(b.cambios_aceptados, []);
  assert.equal(cambiosDe(b, base)[0].campo, "precio_solicitado");
});
