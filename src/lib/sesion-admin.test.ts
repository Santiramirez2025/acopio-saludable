import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SESION_ADMIN_MAX_AGE_S, RENOVAR_SESION_CADA_MS } from "./sesion-admin";

test("la sesión del panel dura como mucho 7 días sin uso", () => {
  assert.ok(SESION_ADMIN_MAX_AGE_S <= 7 * 24 * 60 * 60);
  assert.ok(SESION_ADMIN_MAX_AGE_S >= 24 * 60 * 60, "menos de un día obligaría a entrar todo el tiempo");
});

test("la renovación con el panel abierto es más frecuente que el vencimiento", () => {
  assert.ok(RENOVAR_SESION_CADA_MS < SESION_ADMIN_MAX_AGE_S * 1000);
});

test("auth.ts usa la duración corta y el panel renueva la sesión", () => {
  const auth = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");
  assert.match(auth, /maxAge:\s*SESION_ADMIN_MAX_AGE_S/);
  assert.doesNotMatch(auth, /60 \* 60 \* 24 \* 60/);
  const layout = readFileSync(new URL("../app/admin/(panel)/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<RenovarSesion \/>/);
});
