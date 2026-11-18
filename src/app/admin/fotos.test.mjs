import assert from "node:assert/strict";
import { test } from "node:test";
import { esHeic, esImagenAdmitida, puedeAbrirse } from "./fotos.ts";

test("reconoce fotos HEIC aunque el navegador no informe el tipo", () => {
  assert.equal(esHeic({ name: "IMG_1.HEIC", type: "" }), true);
  assert.equal(esHeic({ name: "foto", type: "image/heif" }), true);
  assert.equal(esHeic({ name: "foto.jpg", type: "image/jpeg" }), false);
});

test("deja revisar imágenes y HEIC, pero no otros archivos", () => {
  assert.equal(esImagenAdmitida({ name: "a.webp", type: "image/webp" }), true);
  assert.equal(esImagenAdmitida({ name: "IMG_1.heic", type: "" }), true);
  assert.equal(esImagenAdmitida({ name: "video.mov", type: "video/quicktime" }), false);
});

test("informa si una foto se puede abrir", async () => {
  let cerrada = false;
  globalThis.createImageBitmap = async () => ({ close: () => { cerrada = true; } });
  assert.equal(await puedeAbrirse(new Blob(["x"])), true);
  assert.equal(cerrada, true);
  globalThis.createImageBitmap = async () => {
    throw new Error("formato no compatible");
  };
  assert.equal(await puedeAbrirse(new Blob(["x"])), false);
  delete globalThis.createImageBitmap;
});
