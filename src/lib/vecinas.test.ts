import test from "node:test";
import assert from "node:assert/strict";
import { cargoVecinaPorCp, cargoVecinaPorLugar, envioVecina } from "./envios/vecinas";
import { envioZonaPropia } from "./envio-zona";

test("vecinas: Carlos Paz no paga; San Antonio $3.000; Tanti y Bialet $4.000", () => {
  assert.equal(cargoVecinaPorLugar("Villa Carlos Paz"), 0);
  assert.equal(cargoVecinaPorLugar("San Antonio 450, Carlos Paz"), 0);
  assert.equal(cargoVecinaPorLugar("San Antonio de Arredondo"), 3000);
  assert.equal(cargoVecinaPorLugar("Tanti"), 4000);
  assert.equal(cargoVecinaPorLugar("Bialet Massé"), 4000);
  assert.equal(cargoVecinaPorCp("5152"), 0);
  assert.equal(cargoVecinaPorCp("X5153"), 3000);
  assert.equal(cargoVecinaPorCp("5155"), 4000);
});

test("vecinas: sin cargo recién desde $60.000, y el chat cotiza lo mismo", () => {
  assert.equal(envioVecina(4000, 24000), 4000);
  assert.equal(envioVecina(4000, 60000), 0);
  const cfg = { compraMinimaPropia: 20000, envioBajoMinimo: 3000, plazoEntregaPropia: "hoy desde las 16" };
  assert.equal(envioZonaPropia(cfg as never, "Tanti", 24000).costo, 4000);
  assert.equal(envioZonaPropia(cfg as never, "Tanti", 61000).costo, 0);
  assert.equal(envioZonaPropia(cfg as never, "Villa Carlos Paz", 24000).costo, 0);
});
