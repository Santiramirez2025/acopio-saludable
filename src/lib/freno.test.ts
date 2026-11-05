import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { _reiniciarFreno, admiteFreno, admiteMedicion, decidirLogin, igualesSeguro, ipDe, LOGIN_AVISO_TOTAL, LOGIN_MAX_POR_IP, LOGIN_MAX_TOTAL, MEDICION_MAX_MINUTO } from "./freno";

test("medición: tope global por minuto contado en la base", () => {
  assert.equal(admiteMedicion(0), true);
  assert.equal(admiteMedicion(MEDICION_MAX_MINUTO - 1), true);
  assert.equal(admiteMedicion(MEDICION_MAX_MINUTO), false);
  assert.equal(admiteMedicion(MEDICION_MAX_MINUTO + 500), false);
});

beforeEach(() => _reiniciarFreno());

test("freno: deja pasar hasta el tope y frena el siguiente dentro de la ventana", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(admiteFreno("ip:1.2.3.4", 3, 60_000, t0 + i), true);
  assert.equal(admiteFreno("ip:1.2.3.4", 3, 60_000, t0 + 10), false);
  assert.equal(admiteFreno("ip:1.2.3.4", 3, 60_000, t0 + 59_999), false);
});

test("freno: cada origen tiene su propio cupo y la ventana vuelve a abrir cuando vence", () => {
  const t0 = 1_000_000;
  assert.equal(admiteFreno("a", 1, 60_000, t0), true);
  assert.equal(admiteFreno("a", 1, 60_000, t0 + 1), false);
  assert.equal(admiteFreno("b", 1, 60_000, t0 + 1), true);
  assert.equal(admiteFreno("a", 1, 60_000, t0 + 60_000), true);
});

test("freno: no crece sin tope con miles de orígenes distintos", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 12_000; i++) admiteFreno(`ip:${i}`, 5, 60_000, t0);
  // Después de la limpieza sigue frenando y sigue contando bien al que viene.
  assert.equal(admiteFreno("nuevo", 1, 60_000, t0), true);
  assert.equal(admiteFreno("nuevo", 1, 60_000, t0 + 1), false);
});

test("ipDe: toma la primera IP de x-forwarded-for y no revienta sin headers", () => {
  assert.equal(ipDe(new Request("https://x/", { headers: { "x-forwarded-for": "190.1.2.3, 10.0.0.1" } })), "190.1.2.3");
  assert.equal(ipDe(new Request("https://x/", { headers: { "x-real-ip": "190.1.2.4" } })), "190.1.2.4");
  assert.equal(ipDe(new Request("https://x/")), "desconocida");
});

test("igualesSeguro: solo vale la firma exacta, no una parcial, de otro largo ni vacía", () => {
  const f = "AbCdEfGh12345678";
  assert.equal(igualesSeguro(f, f), true);
  assert.equal(igualesSeguro(f.slice(0, 15), f), false);
  assert.equal(igualesSeguro(f + "x", f), false);
  assert.equal(igualesSeguro(f.slice(0, 15) + "9", f), false);
  assert.equal(igualesSeguro("", ""), false);
  assert.equal(igualesSeguro("", f), false);
});

test("login: frena por IP sin afectar a otra IP, y frena todo al llegar al tope global", () => {
  assert.equal(decidirLogin({ total: 0, ip: 0 }).admite, true);
  assert.equal(decidirLogin({ total: LOGIN_MAX_POR_IP - 1, ip: LOGIN_MAX_POR_IP - 1 }).admite, true);
  assert.equal(decidirLogin({ total: LOGIN_MAX_POR_IP, ip: LOGIN_MAX_POR_IP }).admite, false);
  assert.equal(decidirLogin({ total: LOGIN_MAX_POR_IP, ip: 0 }).admite, true); // otra máquina sigue entrando
  assert.equal(decidirLogin({ total: LOGIN_MAX_TOTAL, ip: 0 }).admite, false);
});

test("login: avisa una sola vez, con el fallo que llega al umbral", () => {
  const avisos = Array.from({ length: LOGIN_MAX_TOTAL }, (_, total) => decidirLogin({ total, ip: 0 }).avisar).filter(Boolean);
  assert.equal(avisos.length, 1);
  assert.equal(decidirLogin({ total: LOGIN_AVISO_TOTAL - 1, ip: 0 }).avisar, true);
});
