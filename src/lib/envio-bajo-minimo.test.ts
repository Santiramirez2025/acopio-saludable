import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarReglas, cotizarEnvio, type ConfigEnvio } from "./envios/cotizar";
import { TABLA_EJEMPLO } from "./envios/tabla";
import type { Tarifa } from "./envios/tipos";
import { envioPropioPara, lineaCompraMinima, textoCompraMinima, zonaSinMinimo } from "./minimo-zona";

// Regla del 11/11: en la zona propia no hay compra mínima; abajo del umbral se cobra un envío fijo.
const cfg: ConfigEnvio = {
  cpOrigen: "5152",
  entregaPropiaActiva: true,
  cpEntregaPropia: "5152, 5153",
  plazoEntregaPropia: "24 a 48 hs hábiles",
  envioGratisDesde: null,
  tabla: TABLA_EJEMPLO,
  propiaBajoMinimo: { precio: 3000, desde: 20000 },
};
const bultos = [{ pesoG: 2000, unidades: 2, excedido: false }];

test("aplicarReglas cobra el precio fijo del envío propio bajo mínimo y nos cuesta $0", () => {
  const propia: Tarifa = { id: "propia", proveedor: "propia", modalidad: "propia", nombre: "Te lo llevamos nosotros", costo: 0, precioFijo: 3000, plazo: "" };
  const [o] = aplicarReglas([propia], 15000, null);
  assert.equal(o.precio, 3000);
  assert.equal(o.costo, 0);
  assert.equal(o.masBarata, true);
});

test("cotizarEnvio: con $15.000 en la zona el envío propio sale $3.000 y avisa desde cuándo es sin cargo", async () => {
  const opciones = await cotizarEnvio(cfg, { cpDestino: "5152", provincia: "Córdoba", bultos, subtotal: 15000 }, []);
  const propia = opciones.find((o) => o.id === "propia");
  assert.ok(propia);
  assert.equal(propia.precio, 3000);
  assert.equal(propia.costo, 0);
  assert.equal(propia.nombre, "Te lo llevamos nosotros");
  // `pesos` separa el signo con un espacio no separable: se acepta cualquier espacio.
  assert.match(propia.plazo, /desde \$\s?20\.000 van sin cargo/u);
});

test("cotizarEnvio: con $25.000 en la zona el envío propio sigue sin cargo", async () => {
  const opciones = await cotizarEnvio(cfg, { cpDestino: "5152", provincia: "Córdoba", bultos, subtotal: 25000 }, []);
  const propia = opciones.find((o) => o.id === "propia");
  assert.ok(propia);
  assert.equal(propia.precio, 0);
  assert.equal(propia.nombre, "Entrega propia sin cargo");
});

test("cotizarEnvio: sin propiaBajoMinimo todo sigue como antes (sin cargo, el mínimo lo frena antes)", async () => {
  const opciones = await cotizarEnvio({ ...cfg, propiaBajoMinimo: undefined }, { cpDestino: "5152", provincia: "Córdoba", bultos, subtotal: 15000 }, []);
  const propia = opciones.find((o) => o.id === "propia");
  assert.ok(propia);
  assert.equal(propia.precio, 0);
});

test("la regla de la zona: envío fijo abajo del umbral, nada arriba, y apagada con 0", () => {
  const regla = { compraMinima: 60000, compraMinimaPropia: 20000, envioBajoMinimo: 3000, entregaPropiaActiva: true };
  assert.equal(zonaSinMinimo(regla), true);
  assert.equal(envioPropioPara(regla, 15000), 3000);
  assert.equal(envioPropioPara(regla, 20000), 0);
  assert.equal(envioPropioPara({ ...regla, envioBajoMinimo: 0 }, 15000), 0);
  assert.equal(zonaSinMinimo({ ...regla, envioBajoMinimo: 0 }), false);
  assert.match(textoCompraMinima(regla), /no hay compra mínima/);
  assert.doesNotMatch(textoCompraMinima({ ...regla, envioBajoMinimo: 0 }), /no hay compra mínima/);
});

test("lineaCompraMinima: con zona sin mínimo el $ 60.000 no aparece solo; sin envío fijo vuelve el texto de siempre", () => {
  const regla = { compraMinima: 60000, compraMinimaPropia: 20000, envioBajoMinimo: 3000, entregaPropiaActiva: true };
  const sinMin = lineaCompraMinima(regla).replace(/\s/g, " ");
  assert.match(sinMin, /^En Villa Carlos Paz y la zona no hay compra mínima: sin cargo desde \$ 20\.000\. Al resto del país, compra mínima de \$ 60\.000/);
  assert.match(lineaCompraMinima({ ...regla, envioBajoMinimo: 0 }).replace(/\s/g, " "), /^Compra mínima de \$ 60\.000 por pedido/);
});
