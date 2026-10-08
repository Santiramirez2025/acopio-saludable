import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./csv";
import { leerCatalogoCsv } from "./catalogo";
import { calcularCombo, descuentoMaximo, margenPct, precioPorUnidadBase } from "./precios";
import { clasificarObjetivos, detectarUnidad, estimarPesoBruto, motivoOculto } from "./clasificar";
import { urlsDesdeCampoPhotos, BASE_FOTOS } from "./fotos";

const base = { producto: "", presentacion: "", categoria: "Almacen", formato: "Envasado de marca", contenido: 500 };

test("los códigos se mantienen como texto con ceros a la izquierda", () => {
  const csv = '﻿codigo,producto,marca,presentacion,categoria,formato,costo,precio_publico,margen_pct,contenido_g_o_ml\n00000010,"Avena, instantanea",X,x 3kg,Almacen,Fraccionado,10.50,20.00,47.5,3000\n03,B,X,x1,Suplementos,Unidad suelta,5,5,0,\n';
  const filas = leerCatalogoCsv(csv);
  assert.equal(filas[0].codigo, "00000010");
  assert.equal(filas[0].producto, "Avena, instantanea");
  assert.equal(filas[1].codigo, "03");
  assert.equal(filas[1].contenido, null);
});

test("csv con comillas escapadas y CRLF", () => {
  assert.deepEqual(parseCsv('a,b\r\n"x ""y""",2\r\n'), [{ a: 'x "y"', b: "2" }]);
});

test("csv rechaza códigos repetidos y columnas faltantes", () => {
  assert.throws(() => leerCatalogoCsv("codigo,producto\n1,a\n"), /Faltan columnas/);
  const h = "codigo,producto,marca,presentacion,categoria,formato,costo,precio_publico,contenido_g_o_ml\n";
  assert.throws(() => leerCatalogoCsv(h + "1,a,m,p,c,f,1,2,\n1,a,m,p,c,f,1,2,\n"), /repetido/);
  assert.throws(() => leerCatalogoCsv(h + "1,a,m,p,c,f,abc,2,\n"), /costo/);
});

test("margen bruto sobre precio", () => {
  assert.equal(margenPct(3772, 2898), 23.17);
  assert.equal(margenPct(100, 100), 0);
  assert.equal(margenPct(0, 10), 0);
});

test("un combo no puede perforar el margen mínimo", () => {
  const lineas = [{ precio: 1000, costo: 768, cantidad: 2 }];
  assert.equal(calcularCombo(lineas, 0, 12).bloqueado, false);
  const c = calcularCombo(lineas, 15, 12);
  assert.equal(c.precioCombo, 1700);
  assert.equal(c.bloqueado, true);
  const max = descuentoMaximo(lineas, 12);
  assert.equal(calcularCombo(lineas, max, 12).bloqueado, false);
  assert.equal(calcularCombo(lineas, max + 0.5, 12).bloqueado, true);
});

test("precio por kilo y por litro", () => {
  assert.deepEqual(precioPorUnidadBase(3772, 250, "ml"), { valor: 15088, etiqueta: "por litro" });
  assert.equal(precioPorUnidadBase(100, null, null), null);
});

test("tinturas madre y congelados quedan ocultos por defecto", () => {
  assert.match(motivoOculto({ ...base, producto: "Tintura Madre Energizante" })!, /terapéutica/);
  assert.match(motivoOculto({ ...base, producto: "Yogur", categoria: "Congelados" })!, /frío/);
  assert.equal(motivoOculto({ ...base, producto: "Nuez Mariposa" }), null);
});

test("objetivos, unidad y peso bruto", () => {
  assert.deepEqual(clasificarObjetivos({ ...base, producto: "Citrato de Magnesio" }), ["descanso", "huesos", "musculo"]);
  assert.equal(detectarUnidad("x250cc MAKIA", 250), "ml");
  assert.equal(detectarUnidad("x 1kg Granix", 1000), "g");
  assert.equal(estimarPesoBruto({ ...base, formato: "Fraccionado", contenido: 1000 }, "g"), 1030);
  assert.equal(estimarPesoBruto({ ...base, contenido: null }, null), null);
});

test("fotos: varias por producto y nombres raros descartados", () => {
  assert.deepEqual(urlsDesdeCampoPhotos("article_1_a;article_1_b"), [BASE_FOTOS + "article_1_a", BASE_FOTOS + "article_1_b"]);
  assert.deepEqual(urlsDesdeCampoPhotos("../x?y=1"), []);
  assert.deepEqual(urlsDesdeCampoPhotos(null), []);
});

import { armarPedido } from "./armador";
import { sanearLineas } from "./tienda-saneo";

test("armador: llega al mínimo y no supera el presupuesto", () => {
  const base = [
    { codigo: "a", precio: 9000, cantidad: 2 },
    { codigo: "b", precio: 27000, cantidad: 1 },
    { codigo: "c", precio: 700, cantidad: 10 },
  ];
  for (const [personas, presupuesto] of [[5, 200000], [40, 350000], [100, 200000], [8, 1000000], [20, 50000]]) {
    const r = armarPedido({ base, candidatos: [{ codigo: "d", precio: 5000 }], personas, presupuesto, compraMinima: 200000 });
    const t = r.reduce((s, i) => s + i.precio * i.cantidad, 0);
    assert.ok(t >= 200000, `mínimo con ${personas}/${presupuesto}: ${t}`);
    assert.ok(t <= Math.max(200000, presupuesto) + 27000, `techo con ${personas}/${presupuesto}: ${t}`);
    assert.ok(r.every((i) => Number.isInteger(i.cantidad) && i.cantidad >= 1));
  }
  // Sin pedido base y con candidatos caros: no debe pasarse de largo del mínimo.
  const caros = Array.from({ length: 12 }, (_, i) => ({ codigo: `c${i}`, precio: 15000 + i * 3000 }));
  const r2 = armarPedido({ base: [], candidatos: caros, personas: 5, presupuesto: 50000, compraMinima: 200000 });
  const t2 = r2.reduce((s, i) => s + i.precio * i.cantidad, 0);
  assert.ok(t2 >= 200000 && t2 <= 200000 + 48000, `sin base: ${t2}`);
  // Caso real: un producto muy caro al final de la ronda no debe disparar el total.
  const mixtos = [29520, 16974, 1631, 536.28, 1889.28, 2792.92, 6625.6, 3722.8, 61008, 1889.3].map((precio, i) => ({ codigo: `m${i}`, precio }));
  const r3 = armarPedido({ base: [], candidatos: mixtos, personas: 8, presupuesto: 50000, compraMinima: 200000 });
  const t3 = r3.reduce((s, i) => s + i.precio * i.cantidad, 0);
  assert.ok(t3 >= 200000 && t3 <= 217000, `mixtos: ${t3}`);
  assert.deepEqual(armarPedido({ base: [], candidatos: [], personas: 5, presupuesto: 1, compraMinima: 1 }), []);
});

test("carrito: sanea lo que manda el navegador", () => {
  const r = sanearLineas([
    { tipo: "producto", id: "00000010", cantidad: 2 },
    { tipo: "producto", id: "00000010", cantidad: "3" },
    { tipo: "producto", id: 10, cantidad: 1 },
    { tipo: "otro", id: "x", cantidad: 1 },
    { tipo: "combo", id: "duo", cantidad: -4 },
    { tipo: "combo", id: "duo", cantidad: 5000 },
    null,
  ]);
  assert.deepEqual(r, [
    { tipo: "producto", id: "00000010", cantidad: 5 },
    { tipo: "combo", id: "duo", cantidad: 999 },
  ]);
  assert.deepEqual(sanearLineas("nada"), []);
});

import { leerItemsCombo, slugDesdeNombre } from "./combos";

test("combos: lectura de items y slug", () => {
  assert.deepEqual(leerItemsCombo("3622\n00000010 x 2\n95668, 4\n707 3\n\n3622"), [
    { codigo: "3622", cantidad: 2 },
    { codigo: "00000010", cantidad: 2 },
    { codigo: "95668", cantidad: 4 },
    { codigo: "707", cantidad: 3 },
  ]);
  assert.throws(() => leerItemsCombo("3622 x muchos"), /Línea 1/);
  assert.throws(() => leerItemsCombo("3622 x 0"), /cantidad/);
  assert.equal(slugDesdeNombre("  Dúo Magnesio / Ñandú!  "), "duo-magnesio-nandu");
});

import { armarBultos } from "./envios/bultos";
import { cpEnLista, normalizarCp, validarListaCp } from "./envios/geo";
import { TABLA_EJEMPLO, cotizarConTabla, leerTabla, precioBulto } from "./envios/tabla";
import { aplicarReglas, cotizarEnvio } from "./envios/cotizar";

test("envíos: bultos de hasta 25 kg", () => {
  const b = armarBultos([{ pesoG: 3090, cantidad: 10 }, { pesoG: 1030, cantidad: 4 }, { pesoG: 25500, cantidad: 1 }]);
  assert.equal(b.reduce((s, x) => s + x.pesoG, 0), 30900 + 4120 + 25500);
  assert.ok(b.filter((x) => !x.excedido).every((x) => x.pesoG <= 25000));
  assert.equal(b.filter((x) => x.excedido).length, 1);
  assert.equal(b.length, 3);
  assert.deepEqual(armarBultos([]), []);
});

test("envíos: códigos postales", () => {
  assert.equal(normalizarCp(" x5152abc "), "5152");
  assert.equal(normalizarCp("5152"), "5152");
  assert.equal(normalizarCp("515"), null);
  assert.equal(normalizarCp("0001"), null);
  assert.ok(cpEnLista("5010", "5152,5000-5022"));
  assert.ok(cpEnLista("5152", "5152, 5000-5022"));
  assert.ok(!cpEnLista("5023", "5152,5000-5022"));
  assert.throws(() => validarListaCp("5152, abc"), /inválido/);
});

test("envíos: tabla por peso y zona", () => {
  const t = TABLA_EJEMPLO;
  assert.equal(precioBulto([10, 20, 30], [1, 5, 10], 900), 10);
  assert.equal(precioBulto([10, 20, 30], [1, 5, 10], 5000), 20);
  assert.equal(precioBulto([10, 20, 30], [1, 5, 10], 20000), 60);
  const r = cotizarConTabla(t, "Mendoza", [{ pesoG: 24000, unidades: 5, excedido: false }, { pesoG: 800, unidades: 1, excedido: false }]);
  assert.equal(r.find((x) => x.modalidad === "sucursal")!.costo, t.zonas.centro.sucursal[5] + t.zonas.centro.sucursal[0]);
  assert.deepEqual(cotizarConTabla(t, "Narnia", [{ pesoG: 1, unidades: 1, excedido: false }]), []);
  assert.equal(leerTabla({ tramosKg: [1], zonas: {} }), TABLA_EJEMPLO);
});

test("envíos: entrega propia, envío gratis, más barata y respaldo si la API falla", async () => {
  const cfg = { cpOrigen: "5152", entregaPropiaActiva: true, cpEntregaPropia: "5152,5000-5022", envioGratisDesde: null, tabla: TABLA_EJEMPLO };
  const bultos = [{ pesoG: 8000, unidades: 4, excedido: false }];
  const cba = await cotizarEnvio(cfg, { cpDestino: "5000", provincia: "Córdoba", bultos, subtotal: 250000 }, []);
  assert.deepEqual(cba.map((o) => o.id), ["propia", "tabla-sucursal", "tabla-domicilio"]);
  assert.ok(cba[0].masBarata && cba[0].precio === 0);
  const mza = await cotizarEnvio(cfg, { cpDestino: "5500", provincia: "Mendoza", bultos, subtotal: 250000 }, []);
  assert.deepEqual(mza.map((o) => [o.id, o.masBarata]), [["tabla-sucursal", true], ["tabla-domicilio", false]]);
  const gratis = aplicarReglas(mza, 250000, 200000);
  assert.equal(gratis[0].precio, 0);
  assert.equal(gratis[1].precio, mza[1].costo - mza[0].costo);
  assert.equal(gratis[0].costo, mza[0].costo); // el costo real se conserva para el margen neto
  const rota = { id: "micorreo" as const, configurado: () => true, cotizar: async () => { throw new Error("caída"); } };
  const respaldo = await cotizarEnvio(cfg, { cpDestino: "5500", provincia: "Mendoza", bultos, subtotal: 1 }, [rota]);
  assert.equal(respaldo[0].proveedor, "tabla");
  const viva = { id: "micorreo" as const, configurado: () => true, cotizar: async () => [{ id: "micorreo-sucursal", proveedor: "micorreo" as const, modalidad: "sucursal" as const, nombre: "x", costo: 1234, plazo: "" }] };
  assert.deepEqual((await cotizarEnvio(cfg, { cpDestino: "5500", provincia: "Mendoza", bultos, subtotal: 1 }, [viva])).map((o) => o.id), ["micorreo-sucursal"]);
});

import { firmaValida } from "./mercadopago";
import { createHmac } from "node:crypto";

test("mercado pago: firma del aviso", () => {
  process.env.MP_WEBHOOK_SECRET = "secreto-de-prueba";
  const v1 = createHmac("sha256", "secreto-de-prueba").update("id:123;request-id:abc;ts:1700000000;").digest("hex");
  const h = (firma: string) => new Headers({ "x-signature": firma, "x-request-id": "abc" });
  assert.equal(firmaValida(h(`ts=1700000000,v1=${v1}`), "123"), true);
  assert.equal(firmaValida(h(`ts=1700000000,v1=${v1}`), "124"), false);
  assert.equal(firmaValida(h(`ts=1700000001,v1=${v1}`), "123"), false);
  assert.equal(firmaValida(new Headers(), "123"), false);
  delete process.env.MP_WEBHOOK_SECRET;
  assert.equal(firmaValida(new Headers(), "123"), true);
});

import { linkWhatsapp, listaDeCompra, margenNeto, numeroPedido, validarCliente } from "./pedido-calculos";

test("pedidos: validación de datos del cliente", () => {
  const ok = { nombre: "Ana Pérez", email: "ANA@Ejemplo.com ", telefono: "3541 555555", calle: "San Martín 123", ciudad: "Villa Carlos Paz", provincia: "Córdoba", cp: "x5152abc", notas: "" };
  const c = validarCliente(ok);
  assert.equal(c.cp, "5152");
  assert.equal(c.email, "ana@ejemplo.com");
  assert.equal(c.notas, null);
  for (const [campo, valor, error] of [["email", "ana@", /email/], ["telefono", "123", /teléfono/], ["provincia", "Narnia", /provincia/], ["cp", "99", /postal/], ["nombre", "", /nombre/]] as const) {
    assert.throws(() => validarCliente({ ...ok, [campo]: valor }), error);
  }
  assert.throws(() => validarCliente(null), /nombre/);
});

test("pedidos: lista de compra, margen neto, número y WhatsApp", () => {
  const D = (n: number) => n as unknown as never; // Decimal de Prisma se comporta como número para Number()
  const lista = listaDeCompra([
    { codigo: "00000010", producto: "Avena", presentacion: "x 3kg", cantidad: 2, costoUnitario: D(6345.5) },
    { codigo: "706", producto: "Nuez", presentacion: "x 1kg", cantidad: 1, costoUnitario: D(16310) },
    { codigo: "00000010", producto: "Avena", presentacion: "x 3kg", cantidad: 3, costoUnitario: D(6345.5) },
  ]);
  assert.deepEqual(lista.renglones.map((r) => [r.codigo, r.cantidad, r.total]), [["00000010", 5, 31727.5], ["706", 1, 16310]]);
  assert.equal(lista.total, 48037.5);
  const m = margenNeto({ subtotal: D(250000), descuento: D(5000), envioCobrado: D(0), total: D(245000), costoProductos: D(192000), costoEnvioReal: D(9500), comisionPago: D(0), costoPackaging: D(1500) });
  assert.deepEqual([m.venta, m.bruto, m.subsidioEnvio, m.neto], [245000, 53000, 9500, 42000]);
  assert.equal(m.netoPct, 17.14);
  assert.equal(numeroPedido(7), "AS-00007");
  assert.equal(linkWhatsapp("0351 15-555-1234", "hola"), "https://wa.me/549351155551234?text=hola");
  assert.equal(linkWhatsapp("+54 9 3541 555555", "a b"), "https://wa.me/5493541555555?text=a%20b");
  assert.equal(linkWhatsapp("123", "x"), null);
});
