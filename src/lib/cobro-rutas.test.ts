// Toda ruta de la API que cambia el estado de un pedido tiene que pasar por el control de cobro: pasar a
// Pagado o Entregado un pedido sin pago lo da por cobrado, y eso lo hace solo Santiago con su sesión.
// El 12/11 entró POST /api/admin/pedidos/estado sin ese control (lo saltaba con la clave de agentes); esto lo frena.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function rutas(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? rutas(p) : n === "route.ts" ? [p] : [];
  });
}

test("las rutas que cambian el estado de un pedido exigen sesión para registrar un cobro", () => {
  const conEstado = rutas("src/app/api").filter((p) => /aplicarEstadoPedido\s*\(/.test(readFileSync(p, "utf8")));
  assert.ok(conEstado.length >= 2, "se esperaban al menos /agentes/datos y /pedidos/estado");
  for (const p of conEstado) {
    const src = readFileSync(p, "utf8");
    assert.match(src, /cobroRequiereSesion\(/, `${p} cambia el estado sin el control de cobro`);
    assert.match(src, /esSesionAdmin\(\)/, `${p} no exige la sesión de Santiago para cobrar`);
    assert.ok(src.indexOf("cobroRequiereSesion(") < src.lastIndexOf("aplicarEstadoPedido("), `${p}: el control tiene que ir antes de aplicar el estado`);
  }
});
