import assert from "node:assert/strict";
import { test } from "node:test";
import { analizarDescripcion, planificarAutocompletado } from "./autocompletar.ts";

const HOY = new Date(2026, 10, 18);
const VACIO = {
  marca: "", modelo: "", version: "", anio: "", km: "", duenos: "", precio: "", combustible: "", transmision: "", color: "",
  tipo: "Auto", ubicacion: "Chillán", descripcion: "", estado_papeles: "", mantenciones: "", revision_tecnica: "",
};
const INICIALES = { tipo: "Auto", ubicacion: "Chillán" };
const analizar = (t) => analizarDescripcion(t, HOY);
const completar = (t, formulario = VACIO, anteriores = {}) => {
  const analisis = analizar(t);
  const plan = planificarAutocompletado(formulario, analisis, anteriores, INICIALES);
  return { analisis, plan, form: { ...formulario, ...plan.aplicar } };
};

test("camioneta con ficha ordenada completa las casillas existentes", () => {
  const { form, analisis } = completar(`Marca: Toyota
Modelo: Hilux
Versión: SRV
Año: 2021
Patente: LPKD45
Kilometraje: 85.000 km
Precio: $18.990.000
Motor: 2.4 turbo diésel
Potencia: 150 HP
Combustible: Diésel
Transmisión: Automática
Tracción: 4x4
Color: Blanco
Carrocería: Doble cabina
Equipamiento: aire acondicionado, Bluetooth, cámara de retroceso y llantas
Único dueño. Mantenciones en concesionario. Revisión técnica al día, permiso al día, SOAP vigente.
Camioneta muy cuidada y lista para trabajar.`);
  assert.equal(form.marca, "Toyota");
  assert.equal(form.modelo, "Hilux");
  assert.equal(form.anio, "2021");
  assert.equal(form.km, "85000");
  assert.equal(form.precio, "18990000");
  assert.equal(form.combustible, "Diésel");
  assert.equal(form.transmision, "Automática");
  assert.equal(form.color, "Blanco");
  assert.equal(form.tipo, "Camioneta");
  assert.equal(form.duenos, "1");
  assert.equal(form.version, "SRV 2.4 4x4");
  assert.equal(form.revision_tecnica, "Al día");
  assert.match(form.estado_papeles, /Permiso de circulación: al día/);
  assert.match(form.estado_papeles, /SOAP: al día/);
  assert.match(form.mantenciones, /concesionario/);
  assert.match(form.descripcion, /muy cuidada/);
  assert.match(form.descripcion, /Motor: 2\.4 turbo diésel/);
  assert.match(form.descripcion, /Potencia: 150 HP/);
  assert.match(form.descripcion, /Equipamiento: Aire acondicionado, Bluetooth, Cámara de retroceso, Llantas de aleación\./);
  assert.ok(analisis.omitidos.includes("patente"));
  assert.ok(!Object.values(form).some((v) => v.includes("LPKD45")));
});

test("auto en texto natural", () => {
  const { form } = completar(
    "Vendo Kia Morning 2019 gris, bencinero, mecánico, 62 mil km, dos dueños, 1.2 litros, en San Carlos. Precio 7,5 millones. Tiene climatizador y cierre centralizado. Excelente estado general y muy económico."
  );
  assert.equal(form.marca, "Kia");
  assert.equal(form.modelo, "Morning");
  assert.equal(form.anio, "2019");
  assert.equal(form.color, "Gris");
  assert.equal(form.combustible, "Bencina");
  assert.equal(form.transmision, "Manual");
  assert.equal(form.km, "62000");
  assert.equal(form.duenos, "2");
  assert.equal(form.version, "1.2");
  assert.equal(form.ubicacion, "San Carlos");
  assert.equal(form.precio, "7500000");
  assert.match(form.descripcion, /Excelente estado/);
  assert.match(form.descripcion, /Climatizador, Cierre centralizado/);
});

test("SUV híbrido con datos técnicos abreviados", () => {
  const { form } = completar("Hyundai Tucson 2023 híbrido AT AWD 1600 cc 230 CV azul, SUV, 18.000 kms, $29.500.000");
  assert.equal(form.marca, "Hyundai");
  assert.equal(form.modelo, "Tucson");
  assert.equal(form.combustible, "Híbrido");
  assert.equal(form.transmision, "Automática");
  assert.equal(form.tipo, "SUV");
  assert.equal(form.color, "Azul");
  assert.match(form.version, /1600 cc AWD/);
  assert.match(form.descripcion, /Potencia: 230 CV/);
  assert.equal(form.precio, "29500000");
});

test("los datos ausentes quedan vacíos y no se inventan", () => {
  const { form } = completar("Chevrolet Sail 2017");
  assert.equal(form.marca, "Chevrolet");
  assert.equal(form.modelo, "Sail");
  assert.equal(form.anio, "2017");
  for (const c of ["version", "km", "duenos", "precio", "combustible", "transmision", "color", "descripcion", "estado_papeles", "mantenciones", "revision_tecnica"]) {
    assert.equal(form[c], "", c);
  }
  assert.equal(form.tipo, "Auto");
});

test("no publica datos personales ni comerciales internos", () => {
  const { form, analisis } = completar(
    "Ford Ranger 2020 patente HJKL23. Dueño Carlos Muñoz, RUT 11.111.111-1, teléfono 987654321, correo carlos@ejemplo.cl. Precio 20 millones, mínimo 18 millones, comisión 5%. Muy buen estado de pintura y motor."
  );
  const todo = Object.values(form).join(" ");
  for (const dato of ["HJKL23", "Carlos", "11.111", "987654321", "ejemplo.cl", "18000000", "comisión"]) assert.ok(!todo.includes(dato), dato);
  assert.equal(form.precio, "20000000");
  assert.equal(form.duenos, "");
  assert.match(form.descripcion, /Muy buen estado/);
  assert.deepEqual(analisis.omitidos, ["patente", "nombre del dueño", "RUT", "teléfono", "correo", "precio mínimo", "comisión"]);
});

test("no confunde colores de interior ni dinero con el color del vehículo", () => {
  assert.equal(completar("Mazda CX-5 2022, tapiz de cuero negro, llantas negras").form.color, "");
  assert.equal(completar("Mazda CX-5 2022, necesito plata luego").form.color, "");
  assert.equal(completar("Mazda CX-5 2022 color plata").form.color, "Plata");
});

test("avisa si el texto trae más de un vehículo y usa el primero", () => {
  const { form, analisis } = completar("Kia Rio 2018 LPKD45 en 7 millones\nToyota Yaris 2020 GHJK12 en 9 millones");
  assert.equal(form.marca, "Kia");
  assert.equal(form.modelo, "Rio");
  assert.equal(form.precio, "7000000");
  assert.match(analisis.avisos[0], /más de un vehículo/);
});

test("no sobrescribe información manual sin advertir", () => {
  const manual = { ...VACIO, marca: "Nissan", precio: "9990000" };
  const { form, plan } = completar("Toyota Corolla 2018 precio 10 millones", manual);
  assert.equal(form.marca, "Nissan");
  assert.equal(form.precio, "9990000");
  assert.equal(form.modelo, "Corolla");
  assert.deepEqual(plan.conflictos.map((c) => [c.campo, c.actual, c.nuevo]), [
    ["marca", "Nissan", "Toyota"],
    ["precio", "9990000", "10000000"],
  ]);
});

test("volver a analizar actualiza lo autocompletado pero respeta lo editado", () => {
  const primero = completar("Toyota Corolla 2018 precio 10 millones");
  const segundo = completar("Toyota Corolla 2019 precio 9 millones", primero.form, primero.plan.aplicar);
  assert.equal(segundo.form.anio, "2019");
  assert.equal(segundo.form.precio, "9000000");
  assert.deepEqual(segundo.plan.conflictos, []);
  const editado = { ...primero.form, precio: "9500000" };
  const tercero = completar("Toyota Corolla 2019 precio 9 millones", editado, primero.plan.aplicar);
  assert.equal(tercero.form.precio, "9500000");
  assert.equal(tercero.plan.conflictos[0].campo, "precio");
});

test("al editar un auto, tipo y ubicación existentes también se protegen", () => {
  const form = { ...VACIO, tipo: "Auto", ubicacion: "Chillán" };
  const plan = planificarAutocompletado(form, analizar("Ford Ranger camioneta en Bulnes"), {}, {});
  assert.deepEqual(plan.conflictos.map((c) => c.campo).sort(), ["tipo", "ubicacion"]);
});
