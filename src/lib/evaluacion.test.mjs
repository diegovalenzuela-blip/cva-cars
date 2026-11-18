import assert from "node:assert/strict";
import { test } from "node:test";
import { BORRADOR_EVALUACION, validarEvaluacion } from "./evaluacion.ts";

const base = {
  ...BORRADOR_EVALUACION, nombre: " Juan Pérez ", telefono: "9 1234 5678", comuna: "Chillán",
  marca: "Toyota", modelo: "Hilux", anio: "2021", km: "85.000",
};
const HOY = new Date(2026, 10, 18);

test("normaliza una solicitud válida", () => {
  const r = validarEvaluacion({ ...base, email: "JUAN@EJEMPLO.CL", patente: "lp-kd 45", precio_esperado: "$18.000.000" }, HOY);
  assert.deepEqual(r.datos, {
    nombre: "Juan Pérez", telefono: "+56912345678", email: "juan@ejemplo.cl", comuna: "Chillán", marca: "Toyota",
    modelo: "Hilux", version: null, anio: 2021, km: 85000, patente: "LPKD45", precio_esperado: 18000000, observaciones: null,
  });
});

test("marca los campos obligatorios y los formatos inválidos", () => {
  const { errores } = validarEvaluacion({ ...BORRADOR_EVALUACION, email: "x", patente: "MALA" }, HOY);
  assert.deepEqual(Object.keys(errores).sort(), ["anio", "comuna", "email", "km", "marca", "modelo", "nombre", "patente", "telefono"]);
});

test("acepta kilometraje cero y rechaza años imposibles", () => {
  assert.equal(validarEvaluacion({ ...base, km: "0" }, HOY).datos.km, 0);
  assert.ok(validarEvaluacion({ ...base, anio: "2030" }, HOY).errores.anio);
});
