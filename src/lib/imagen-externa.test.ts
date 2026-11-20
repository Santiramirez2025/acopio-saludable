import { test } from "node:test";
import assert from "node:assert/strict";
import { formatoFotoSeguro, OPCIONES_SHARP_EXTERNA } from "./imagen-externa";

const con = (cabeza: number[] | string, largo = 64) => {
  const b = new Uint8Array(largo);
  const bytes = typeof cabeza === "string" ? [...cabeza].map((c) => c.charCodeAt(0)) : cabeza;
  b.set(bytes);
  return b;
};

test("acepta JPEG, PNG y WebP por sus bytes", () => {
  assert.equal(formatoFotoSeguro(con([0xff, 0xd8, 0xff, 0xe0])), "jpeg");
  assert.equal(formatoFotoSeguro(con([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(formatoFotoSeguro(con("RIFF\0\0\0\0WEBPVP8 ")), "webp");
});

test("rechaza HEIF/AVIF, TIFF, SVG, GIF y HTML aunque el servidor diga image/jpeg", () => {
  assert.equal(formatoFotoSeguro(con("\0\0\0\x18ftypheic")), null);
  assert.equal(formatoFotoSeguro(con("\0\0\0\x1cftypavif")), null);
  assert.equal(formatoFotoSeguro(con([0x49, 0x49, 0x2a, 0x00])), null);
  assert.equal(formatoFotoSeguro(con("<svg xmlns='http://www.w3.org/2000/svg'>")), null);
  assert.equal(formatoFotoSeguro(con("GIF89a")), null);
  assert.equal(formatoFotoSeguro(con("<!DOCTYPE html><html>")), null);
  assert.equal(formatoFotoSeguro(con("RIFF\0\0\0\0WAVEfmt ")), null);
});

test("rechaza archivos demasiado cortos", () => {
  assert.equal(formatoFotoSeguro(new Uint8Array([0xff, 0xd8, 0xff])), null);
  assert.equal(formatoFotoSeguro(new Uint8Array()), null);
});

test("sharp con tope de píxeles por debajo del default", () => {
  assert.ok(OPCIONES_SHARP_EXTERNA.limitInputPixels < 268_402_689);
  assert.equal(OPCIONES_SHARP_EXTERNA.failOn, "error");
});
