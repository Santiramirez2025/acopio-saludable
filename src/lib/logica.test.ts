import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./csv";
import { leerCatalogoCsv } from "./catalogo";
import { calcularCombo, descuentoMaximo, margenPct, precioPorUnidadBase, precioPorUnidadSuelta, unidadesPorEnvase } from "./precios";
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

test("las unidades del envase salen del rótulo del proveedor", () => {
  assert.equal(unidadesPorEnvase("Caja x 6 unidades YUKA"), 6);
  assert.equal(unidadesPorEnvase("x12 unid Sin TACC Angiola"), 12);
  assert.equal(unidadesPorEnvase("Sobre x10 Unidades"), 10);
  assert.equal(unidadesPorEnvase("x 12 Unid. Caja Zanna s"), 12);
  // Un envase de a uno, o uno que solo informa peso, no tiene precio por unidad suelta.
  assert.equal(unidadesPorEnvase("x Unidad 50G"), null);
  assert.equal(unidadesPorEnvase("x1unid 50mts"), null);
  assert.equal(unidadesPorEnvase("500 G"), null);
  assert.equal(precioPorUnidadSuelta(5979.57, "Caja x 6 unidades YUKA"), 996.59);
  assert.equal(precioPorUnidadSuelta(1094.47, "x Unidad 50G"), null);
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
import { TABLA_EJEMPLO, cotizarConTabla, leerTabla, precioBulto, seguroDeclarado } from "./envios/tabla";
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

test("envíos: el seguro se cobra sobre el valor declarado, una vez por envío", async () => {
  const bultos = [{ pesoG: 8000, unidades: 4, excedido: false }, { pesoG: 3000, unidades: 1, excedido: false }];
  const sinSeguro = cotizarConTabla(TABLA_EJEMPLO, "Mendoza", bultos);
  const conSeguro = cotizarConTabla({ ...TABLA_EJEMPLO, seguroPct: 1.21 }, "Mendoza", bultos, 100000);
  // 1,21% de 100.000 = 1.210, y se suma una sola vez aunque viajen dos bultos.
  assert.equal(conSeguro[0].costo - sinSeguro[0].costo, 1210);
  assert.equal(conSeguro[1].costo - sinSeguro[1].costo, 1210);
  assert.equal(seguroDeclarado(0, 1.21), 0);
  assert.equal(seguroDeclarado(100000, 0), 0);
  assert.equal(seguroDeclarado(99256, 1.21), 1201.0);
});

test("envíos: si el correo no informa días, el plazo sale de la zona", async () => {
  const cfg = { cpOrigen: "5152", entregaPropiaActiva: false, cpEntregaPropia: "", envioGratisDesde: null, tabla: TABLA_EJEMPLO };
  const bultos = [{ pesoG: 2000, unidades: 1, excedido: false }];
  const sinPlazo = { id: "micorreo" as const, configurado: () => true, cotizar: async () => [{ id: "micorreo-domicilio", proveedor: "micorreo" as const, modalidad: "domicilio" as const, nombre: "x", costo: 10, plazo: "Plazo a confirmar" }] };
  // Tierra del Fuego es zona patagonia: 3 a 7 días hábiles.
  const [tdf] = await cotizarEnvio(cfg, { cpDestino: "9410", provincia: "Tierra del Fuego", bultos, subtotal: 1 }, [sinPlazo]);
  assert.match(tdf.plazo, /3 a 7 días hábiles de correo/);
  assert.doesNotMatch(tdf.plazo, /confirmar/);
  // Si el correo sí informa días, mandan los suyos, no los de la tabla.
  const conPlazo = { ...sinPlazo, cotizar: async () => [{ ...(await sinPlazo.cotizar())[0], plazo: "1 a 2 días hábiles" }] };
  const [rapido] = await cotizarEnvio(cfg, { cpDestino: "9410", provincia: "Tierra del Fuego", bultos, subtotal: 1 }, [conPlazo]);
  assert.match(rapido.plazo, /1 a 2 días hábiles de correo/);
  // Provincia desconocida: no inventamos una ventana.
  const [raro] = await cotizarEnvio(cfg, { cpDestino: "9410", provincia: "Narnia", bultos, subtotal: 1 }, [sinPlazo]);
  assert.match(raro.plazo, /a confirmar/);
});

import { proveedorMiCorreo } from "./envios/micorreo";

test("micorreo: si rechaza la lista de medidas reintenta con el objeto, y el error llega entero", async () => {
  const original = globalThis.fetch;
  Object.assign(process.env, { MICORREO_USER: "u", MICORREO_PASSWORD: "p", MICORREO_CUSTOMER_ID: "42" });
  const pedido = { cpOrigen: "5152", cpDestino: "1425", provincia: "Buenos Aires", bultos: [{ pesoG: 2000, unidades: 1, excedido: false }], valorDeclarado: 1000 };
  const formas: string[] = [];
  const simular = (responder: (esLista: boolean) => Response) => {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith("/token")) return new Response(JSON.stringify({ token: "jwt" }), { status: 200 });
      const esLista = Array.isArray(JSON.parse(String(init?.body)).dimensions);
      formas.push(esLista ? "lista" : "objeto");
      return responder(esLista);
    }) as typeof fetch;
  };

  simular((esLista) =>
    esLista
      ? new Response("formato invalido", { status: 400 })
      : new Response(JSON.stringify({ rates: [{ deliveredType: "D", productName: "Paq.ar Clásico", price: 5000, deliveryTimeMin: "2", deliveryTimeMax: "5" }] }), { status: 200 }),
  );
  const tarifas = await proveedorMiCorreo.cotizar(pedido);
  assert.deepEqual(formas, ["lista", "objeto"]);
  assert.equal(tarifas[0].costo, 5000);
  assert.equal(tarifas[0].plazo, "2 a 5 días hábiles");

  // Si fallan las dos, el motivo real tiene que viajar en el error: es lo que lee el panel.
  formas.length = 0;
  simular(() => new Response("customerId inexistente", { status: 402 }));
  await assert.rejects(proveedorMiCorreo.cotizar(pedido), /402.*customerId inexistente/);

  globalThis.fetch = original;
  for (const k of ["MICORREO_USER", "MICORREO_PASSWORD", "MICORREO_CUSTOMER_ID"]) delete process.env[k];
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

import { aItemDePedido, linkWhatsapp, listaDeCompra, margenNeto, numeroPedido, validarCliente } from "./pedido-calculos";
import { readFileSync } from "node:fs";

test("el renglón guardado tiene exactamente las columnas de OrderItem", () => {
  // Pasó en producción: `congelado` viajaba a Prisma y tiraba el alta de todos los pedidos con un 500.
  const modelo = /model OrderItem \{([\s\S]*?)\n\}/.exec(readFileSync("prisma/schema.prisma", "utf8"))![1];
  const columnas = new Set(modelo.split("\n").map((l) => l.trim().split(/\s+/)[0]).filter(Boolean));
  const guardado = aItemDePedido({ codigo: "1", producto: "Avena", presentacion: "1 kg", cantidad: 2, precioUnitario: 10, costoUnitario: 5, pesoG: 1000, comboSlug: null, congelado: true });
  for (const campo of Object.keys(guardado)) assert.ok(columnas.has(campo), `OrderItem no tiene la columna "${campo}": el alta del pedido va a fallar`);
  assert.deepEqual(Object.keys(guardado).filter((k) => k === "pesoG" || k === "congelado"), []);
});

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

import { calcularDiff, sanearEntrantes, variacionPct } from "./sync-diff";

test("sincronización: diff, umbral del 10%, nuevos, desaparecidos y reaparecidos", () => {
  const actuales = [
    { codigo: "00000010", producto: "Avena", costo: 1000, precioPublico: 1300, estado: "ACTIVO" as const },
    { codigo: "2", producto: "Sube mucho", costo: 1000, precioPublico: 1300, estado: "ACTIVO" as const },
    { codigo: "3", producto: "Justo 10", costo: 1000, precioPublico: 1300, estado: "ACTIVO" as const },
    { codigo: "4", producto: "Sin cambios", costo: 500, precioPublico: 700, estado: "ACTIVO" as const },
    { codigo: "5", producto: "Se fue", costo: 500, precioPublico: 700, estado: "ACTIVO" as const },
    { codigo: "6", producto: "Volvió", costo: 500, precioPublico: 700, estado: "SIN_STOCK" as const },
    { codigo: "7", producto: "Borrador ausente", costo: 1, precioPublico: 2, estado: "BORRADOR" as const },
  ];
  const { items: entrantes, descartados } = sanearEntrantes([
    { codigo: "00000010", producto: "Avena", costo: 1050, precioPublico: "1365.004" },
    { codigo: "2", producto: "x", costo: 1250, precioPublico: 1300 },
    { codigo: "3", producto: "x", costo: 1000, precioPublico: 1170 },
    { codigo: "4", producto: "x", costo: 500, precioPublico: 700 },
    { codigo: "6", producto: "x", costo: 500, precioPublico: 700 },
    { codigo: "0099", producto: "Nuevo", costo: 10, precioPublico: 15 },
    { codigo: "0099", producto: "Repetido", costo: 10, precioPublico: 15 },
    { codigo: "8", producto: "Precio roto", costo: -5, precioPublico: 15 },
    { codigo: "", producto: "Sin código", costo: 5, precioPublico: 15 },
    { codigo: 7796666359875, producto: "Código numérico", costo: null, precioPublico: null },
  ]);
  assert.equal(descartados, 4);
  assert.equal(entrantes[0].precioPublico, 1365);
  const r = calcularDiff(actuales, entrantes, { umbralAutoPct: 10, completo: true });
  const ver = (c: string, t = "CAMBIO") => r.items.find((i) => i.codigo === c && i.tipo === t);
  assert.deepEqual([ver("00000010")!.pct, ver("00000010")!.estado], [5, "APLICADO"]);
  assert.deepEqual([ver("2")!.pct, ver("2")!.estado], [25, "PENDIENTE"]);
  assert.deepEqual([ver("3")!.pct, ver("3")!.estado], [-10, "PENDIENTE"]); // 10% exacto no es "menor a 10%"
  assert.equal(ver("4"), undefined);
  assert.equal(ver("5", "DESAPARECIDO")!.estado, "APLICADO");
  assert.equal(ver("6", "REAPARECIDO")!.estado, "APLICADO");
  assert.equal(ver("7", "DESAPARECIDO"), undefined);
  assert.equal(ver("0099", "NUEVO")!.costoNuevo, 10);
  // lectura parcial: nadie pasa a sin stock
  const parcial = calcularDiff(actuales, entrantes, { umbralAutoPct: 10, completo: false });
  assert.equal(parcial.items.filter((i) => i.tipo === "DESAPARECIDO").length, 0);
  assert.equal(parcial.avisos.length, 1);
  // baja masiva: pide aprobación
  const muchos = Array.from({ length: 100 }, (_, i) => ({ codigo: `m${i}`, producto: "p", costo: 1, precioPublico: 2, estado: "ACTIVO" as const }));
  const masivo = calcularDiff(muchos, entrantes.slice(0, 1), { umbralAutoPct: 10, completo: true });
  assert.ok(masivo.items.filter((i) => i.tipo === "DESAPARECIDO").every((i) => i.estado === "PENDIENTE"));
  // solo precios públicos: el costo no se toca
  const pub = calcularDiff(actuales, [{ codigo: "4", producto: "x", costo: null, precioPublico: 721 }], { umbralAutoPct: 10, completo: false });
  assert.deepEqual([pub.items[0].costoNuevo, pub.items[0].precioNuevo, pub.items[0].pct], [500, 721, 3]);
  assert.equal(variacionPct(0, 5), 100);
  assert.throws(() => sanearEntrantes({}), /lista/);
});

import { resumir, serieDiaria } from "./estadisticas";

test("estadísticas: ventas, ticket, márgenes y rankings por margen en pesos", () => {
  const pedido = (fecha: string, extra: object, items: object[]) => ({ createdAt: new Date(fecha), subtotal: 0, descuento: 0, envioCobrado: 0, total: 0, costoProductos: 0, costoEnvioReal: 0, comisionPago: 0, costoPackaging: 0, items, ...extra }) as never;
  const it = (codigo: string, cantidad: number, precio: number, costo: number, comboSlug: string | null = null) => ({ codigo, producto: codigo, presentacion: "", cantidad, precioUnitario: precio, costoUnitario: costo, comboSlug });
  const r = resumir(
    [
      pedido("2026-10-05T15:00:00Z", { subtotal: 200000, costoProductos: 150000, costoEnvioReal: 10000, envioCobrado: 4000, comisionPago: 12000, costoPackaging: 1000 }, [it("a", 10, 15000, 11000), it("b", 5, 10000, 8000, "combo-x")]),
      pedido("2026-10-07T02:00:00Z", { subtotal: 100000, descuento: 5000, costoProductos: 80000 }, [it("a", 2, 15000, 11000), it("c", 7, 10000, 8000)]),
    ],
    new Map([["a", ["gimnasios", "kioscos"]], ["b", ["kioscos"]]]),
    { nichos: new Map([["gimnasios", "Gimnasios"]]), combos: new Map([["combo-x", "Combo X"]]) },
  );
  assert.deepEqual([r.pedidos, r.ventas, r.ticketPromedio, r.margenBruto, r.margenNeto], [2, 295000, 147500, 65000, 46000]);
  assert.equal(r.margenBrutoPct, 22.03);
  assert.deepEqual(r.productos.map((p) => [p.clave, p.unidades, p.margen]), [["a", 12, 48000], ["c", 7, 14000], ["b", 5, 10000]]);
  assert.deepEqual(r.combos.map((c) => [c.nombre, c.margen]), [["Combo X", 10000]]);
  assert.deepEqual(r.nichos.map((n) => [n.nombre, n.margen]), [["kioscos", 58000], ["Gimnasios", 48000]]);
  // el segundo pedido es del 6 a la noche en Córdoba (UTC-3)
  assert.deepEqual(serieDiaria(r.porDia, "2026-10-05", "2026-10-07").map((d) => [d.dia, d.ventas, d.pedidos]), [["2026-10-05", 200000, 1], ["2026-10-06", 95000, 1], ["2026-10-07", 0, 0]]);
});

test("imágenes: el código sale del nombre del archivo y se mantiene como texto", async () => {
  const { codigoDesdeArchivo } = await import("./imagenes");
  const c = new Set(["3622", "00000010", "36"]);
  assert.equal(codigoDesdeArchivo("3622-1.png", c), "3622");
  assert.equal(codigoDesdeArchivo("3622_hero.JPG", c), "3622");
  assert.equal(codigoDesdeArchivo("00000010-2.webp", c), "00000010");
  assert.equal(codigoDesdeArchivo("3622.png", c), "3622");
  assert.equal(codigoDesdeArchivo("36-1.png", c), "36");
  assert.equal(codigoDesdeArchivo("aceite-coco.png", c), null);
  assert.equal(codigoDesdeArchivo("10-1.png", c), null);
});

test("precio sugerido: recargo sobre el precio vigente, redondeado hacia arriba a un número fácil", async () => {
  const { precioSugerido } = await import("./precios");
  assert.deepEqual(precioSugerido(1000, 40), { sugerido: 1400, ganancia: 400 });
  assert.deepEqual(precioSugerido(1010, 40), { sugerido: 1450, ganancia: 440 });
  assert.equal(precioSugerido(9000, 40)?.sugerido, 12600);
  assert.equal(precioSugerido(9020, 40)?.sugerido, 12700);
  assert.equal(precioSugerido(100000, 40)?.sugerido, 140000);
  assert.equal(precioSugerido(100100, 40)?.sugerido, 140500);
  assert.equal(precioSugerido(1000, 0), null);
});

test("corte de compra: próximo cierre en hora argentina", async () => {
  const { proximoCorte, leerDiasCorte } = await import("./corte");
  assert.deepEqual(leerDiasCorte("1, 3,5,9,x"), [1, 3, 5]);
  const lv = [1, 2, 3, 4, 5];
  // Jueves 8/10/2026 10:00 en Argentina (13:00 UTC): cierra hoy a las 14 (17:00 UTC).
  assert.equal(proximoCorte(new Date("2026-10-08T13:00:00Z"), lv, 14)?.toISOString(), "2026-10-08T17:00:00.000Z");
  // Jueves 15:00: ya cerró, pasa al viernes.
  assert.equal(proximoCorte(new Date("2026-10-08T18:00:00Z"), lv, 14)?.toISOString(), "2026-10-09T17:00:00.000Z");
  // Viernes 15:00: pasa al lunes.
  assert.equal(proximoCorte(new Date("2026-10-09T18:00:00Z"), lv, 14)?.toISOString(), "2026-10-12T17:00:00.000Z");
  // Un solo día por semana, justo después del cierre: la semana siguiente.
  assert.equal(proximoCorte(new Date("2026-10-08T17:00:01Z"), [4], 14)?.toISOString(), "2026-10-15T17:00:00.000Z");
  assert.equal(proximoCorte(new Date(), [], 14), null);
});

test("precio de lista y de transferencia: el recargo cubre la comisión y la transferencia vuelve al precio base", async () => {
  const { precioVenta, precioTransferencia } = await import("./precios");
  assert.equal(precioVenta(10000, 8), 10800);
  assert.equal(precioVenta(10000, 0), 10000);
  assert.equal(precioTransferencia(10800, 8), 9936);
  assert.equal(precioTransferencia(10800, 0), null);
  // Cobrado por Mercado Pago al instante (7,61%) queda prácticamente el precio base.
  assert.ok(Math.abs(10800 * (1 - 0.0761) - 10000) < 30);
});

import { detectar, palabrasClave } from "./asistente";

test("el asistente reconoce la intención y nunca responde consultas de salud con un producto", () => {
  assert.equal(detectar("¿Cuánto tarda el envío?"), "envio");
  assert.equal(detectar("como puedo pagar"), "pago");
  assert.equal(detectar("¿Hay compra mínima?"), "minimo");
  assert.equal(detectar("entregan los domingos?"), "domingo");
  assert.equal(detectar("Hablar con una persona"), "humano");
  assert.equal(detectar("el magnesio sirve para dormir?"), "salud");
  assert.equal(detectar("cuanto tomo de creatina"), "salud");
  assert.equal(detectar("las nueces son buenas para el corazon?"), "salud");
  assert.equal(detectar("sirve para la piel?"), "salud");
  // Falsos positivos que costaban ventas: "sirve para" sin nada del cuerpo es una compra.
  assert.equal(detectar("Me sirve para casa"), "buscar");
  assert.equal(detectar("me sirven para el kiosco"), "negocio");
  assert.equal(detectar("es para regalar"), "buscar");
  assert.equal(detectar("almendras"), "buscar");
  assert.equal(detectar("tenés maní sin sal?"), "buscar");
  assert.deepEqual(palabrasClave("¿Tenés nueces peladas?").map((g) => g[0]), ["nueces", "peladas"]);
  assert.ok(palabrasClave("nueces")[0].includes("nuez"));
});

import { linkSeguimiento } from "./envios/seguimiento";

test("el seguimiento lleva al rastreo del correo, o a ningún lado si no sabemos cuál es", () => {
  assert.equal(linkSeguimiento("andreani", "360000000000000"), "https://www.andreani.com/#!/informacionEnvio/360000000000000");
  // Andreani lo pide sin guiones ni puntos.
  assert.equal(linkSeguimiento("andreani", " 3600-0000.0000000 "), "https://www.andreani.com/#!/informacionEnvio/360000000000000");
  assert.equal(linkSeguimiento("andreani", null), null);
  assert.equal(linkSeguimiento("andreani", "   "), null);
  // Un número sospechoso no se convierte en link: mejor mostrarlo suelto que mandar a una página rota.
  assert.equal(linkSeguimiento("andreani", "abc"), null);
  assert.equal(linkSeguimiento("andreani", "<script>"), null);
  assert.equal(linkSeguimiento(undefined, "360000000000000"), null);
});

test("la tabla le pone el nombre del correo a la opción que ve el cliente", () => {
  const bultos = [{ pesoG: 5000, unidades: 1, excedido: false }];
  const generica = cotizarConTabla({ ...TABLA_EJEMPLO, correo: undefined }, "Mendoza", bultos).map((t) => t.nombre);
  assert.deepEqual(generica, ["Retiro en sucursal de correo", "Envío a domicilio"]);
  const andreani = cotizarConTabla({ ...TABLA_EJEMPLO, correo: "andreani" }, "Mendoza", bultos).map((t) => t.nombre);
  assert.deepEqual(andreani, ["Andreani: retiro en sucursal", "Andreani a domicilio"]);
  // Un correo que no existe no ensucia el nombre.
  assert.equal(leerTabla({ ...TABLA_EJEMPLO, correo: "fedex" }).correo, undefined);
  assert.equal(leerTabla({ ...TABLA_EJEMPLO, correo: "andreani" }).correo, "andreani");
  assert.equal(leerTabla({ ...TABLA_EJEMPLO, seguroPct: 999 }).seguroPct, 0);
});

import { envioQueSeCobra } from "./pedido-calculos";

test("con tarjeta el envío lleva adentro la comisión del pago", () => {
  // Se divide, no se multiplica: 35.000 / 0,92 = 38.043,48, y el 8% de eso deja los 35.000 del correo.
  const cobrado = envioQueSeCobra(35000, "MERCADOPAGO", 8);
  assert.equal(cobrado, 38043.48);
  assert.ok(Math.abs(cobrado * 0.92 - 35000) < 0.01, "después de la comisión tiene que quedar el costo del correo");
  // Por transferencia no hay comisión que cubrir.
  assert.equal(envioQueSeCobra(35000, "TRANSFERENCIA", 8), 35000);
  // La entrega propia sin cargo sigue sin cargo.
  assert.equal(envioQueSeCobra(0, "MERCADOPAGO", 8), 0);
  // Sin comisión configurada no cambia nada.
  assert.equal(envioQueSeCobra(35000, "MERCADOPAGO", 0), 35000);
  // Un porcentaje absurdo no puede hacer explotar el precio.
  assert.ok(envioQueSeCobra(35000, "MERCADOPAGO", 150) <= 35000 / 0.05 + 1);
});

import { MARGEN_FLACO_PCT } from "./pedido-calculos";

test("un pedido que deja casi nada se marca, no solo el que da perdida", () => {
  // El AS-00003 real: cobró $14.939 de envío y Andreani cobró $23.569.
  const flaco = margenNeto({ subtotal: 61214.44, descuento: 0, total: 76153, costoProductos: 43546.86, costoEnvioReal: 23568.84, envioCobrado: 14939, comisionPago: 6084.66, costoPackaging: 1500 } as never);
  assert.equal(flaco.alerta, "flaco");
  assert.ok(flaco.neto > 0 && flaco.netoPct < MARGEN_FLACO_PCT, "positivo pero flaco");
  assert.equal(flaco.subsidioEnvio, 8629.84);
  // El mismo pedido con el envío bien cobrado.
  const sano = margenNeto({ ...{ subtotal: 61214.44, descuento: 0, total: 85705, costoProductos: 43546.86, costoEnvioReal: 23568.84, comisionPago: 6847.84, costoPackaging: 1500 }, envioCobrado: 24490.69 } as never);
  assert.equal(sano.alerta, "ok");
  const perdida = margenNeto({ subtotal: 60000, descuento: 0, total: 60000, costoProductos: 55000, costoEnvioReal: 30000, envioCobrado: 10000, comisionPago: 4800, costoPackaging: 1500 } as never);
  assert.equal(perdida.alerta, "perdida");
});

test("entrega propia con cargo: solo donde corresponde y sin pisar la gratuita", async () => {
  const tabla = { ...TABLA_EJEMPLO, propiaPaga: { cps: "5000-5025", precio: 15000, costo: 4000, plazo: "24 a 48 hs hábiles" } };
  const cfg = { cpOrigen: "5152", entregaPropiaActiva: true, cpEntregaPropia: "5152,5153", envioGratisDesde: null, tabla };
  const bultos = [{ pesoG: 8000, unidades: 4, excedido: false }];
  const pedir = (cp: string, provincia = "Córdoba") => cotizarEnvio(cfg, { cpDestino: cp, provincia, bultos, subtotal: 100000 }, []);

  // Córdoba capital: aparece la paga, y es la más barata.
  const cba = await pedir("5000");
  const propia = cba.find((o) => o.id === "propia-paga")!;
  assert.equal(propia.precio, 15000);
  assert.equal(propia.costo, 4000, "el costo real viaja aparte del precio, para que el margen no mienta");
  assert.ok(propia.masBarata, "llevarlo nosotros tiene que ser lo más barato: Andreani cobra el doble por ir a 36 km");

  // Carlos Paz ya tiene entrega gratis: no se le cobra por algo que es sin cargo.
  const cpaz = await pedir("5152");
  assert.deepEqual(cpaz.filter((o) => o.modalidad === "propia").map((o) => [o.id, o.precio]), [["propia", 0]]);

  // Fuera de la zona no se ofrece.
  assert.equal((await pedir("1425", "Buenos Aires")).some((o) => o.id === "propia-paga"), false);

  // Apagada si falta el código postal o el precio.
  const sinZona = { ...cfg, tabla: leerTabla({ ...tabla, propiaPaga: { cps: "", precio: 15000 } }) };
  assert.equal((await cotizarEnvio(sinZona, { cpDestino: "5000", provincia: "Córdoba", bultos, subtotal: 100000 }, [])).some((o) => o.id === "propia-paga"), false);

  // Con envío gratis desde cierto monto, la más barata queda en cero y el resto paga la diferencia.
  const conGratis = await cotizarEnvio({ ...cfg, envioGratisDesde: 50000 }, { cpDestino: "5000", provincia: "Córdoba", bultos, subtotal: 100000 }, []);
  assert.equal(conGratis[0].precio, 0);
  assert.equal(conGratis[0].costo, 4000, "el costo real se conserva aunque el cliente no pague");
});

import { contarUnidades, estimarPesoPorUnidades } from "./clasificar";

test("el peso se estima de cuántas unidades trae, sin inventar kilos", () => {
  const g = (producto: string, presentacion: string) => estimarPesoPorUnidades({ producto, presentacion });
  // Un frasco de 100 comprimidos pesa 140 g, no 7 kg: cobrar un envío de 7 kg por esto es perder la venta.
  assert.equal(g("Modelife Acido Folico Caja", "x100comp Modelife"), 140);
  assert.equal(g("Te Negro Ensobrado", "x25unid Tucangua"), 115);
  assert.equal(g("Chocolate al 70% Amargo", "CAJA x 10 tabletas. El Colonial"), 910);
  assert.equal(g("Alfajores Proteicos con Chocolate", "Caja x12unid Olympic"), 700);
  assert.equal(g("Caramelo duro de miel", "x unidad"), 35);
  // Sin saber cuántas trae, no se adivina.
  assert.equal(g("Pan molde integral", "Aroma"), null);
  // Sin saber de qué son, hay tope: nunca un bulto inventado de varios kilos.
  assert.ok((g("Cosa rara", "Caja x 90 piezas") ?? 0) <= 1200);
  assert.deepEqual(contarUnidades("x100comp Modelife"), { unidades: 100, tipo: "comp" });
  assert.deepEqual(contarUnidades("Caja x25 sobres"), { unidades: 25, tipo: "sobres" });
  assert.deepEqual(contarUnidades("x unidad"), { unidades: 1, tipo: "unidad" });
  assert.equal(contarUnidades("500 G"), null);
});

import { compraReportable } from "./pedido-calculos";

test("a Meta solo le contamos compras que existen", () => {
  // Pasó en producción: Meta marcó una compra a las 20:30 del 11/10 y no había ningún pedido nuevo.
  // Mercado Pago devuelve al cliente a la misma URL con éxito, pendiente o rechazo.
  assert.equal(compraReportable("PENDIENTE_PAGO", "MERCADOPAGO"), false);
  assert.equal(compraReportable("PAGADO", "MERCADOPAGO"), true);
  assert.equal(compraReportable("ENVIADO", "MERCADOPAGO"), true);
  // Por transferencia el pedido ya es la compra: eligió, dejó los datos y nos debe la plata.
  assert.equal(compraReportable("PENDIENTE_PAGO", "TRANSFERENCIA"), true);
  // Un pedido cancelado no es una compra por ningún medio.
  assert.equal(compraReportable("CANCELADO", "TRANSFERENCIA"), false);
  assert.equal(compraReportable("CANCELADO", "MERCADOPAGO"), false);
});

import { bajaPct, BAJA_MINIMA_PCT } from "./precios";

test("una baja de precio se mide contra el precio anterior", () => {
  assert.equal(bajaPct(10000, 9000), 10);
  assert.equal(bajaPct(5980, 5500), 8);
  // Redondeo a un decimal, para no mostrar "-7.142857%".
  assert.equal(bajaPct(7000, 6500), 7.1);
  // Subió, quedó igual o los números no sirven: no es oferta.
  assert.equal(bajaPct(9000, 10000), 0);
  assert.equal(bajaPct(9000, 9000), 0);
  assert.equal(bajaPct(0, 500), 0);
  assert.equal(bajaPct(500, 0), 0);
  // El proveedor mueve centavos todos los días: eso no se muestra como oferta.
  assert.ok(bajaPct(10000, 9900) < BAJA_MINIMA_PCT, "1% no llega al mínimo");
  assert.ok(bajaPct(10000, 9500) >= BAJA_MINIMA_PCT, "5% sí");
});

import { esBaja, plantillaDe, textoPlantilla } from "./whatsapp-plantillas";

test("prospección: bajas, plantilla por rubro y texto guardado", () => {
  assert.equal(esBaja("No, gracias"), true);
  assert.equal(esBaja("no me interesa por ahora"), true);
  assert.equal(esBaja("Sí, pasame precios"), false);
  assert.equal(esBaja("no sé, cuánto sale la granola?"), false);
  assert.equal(plantillaDe("hotel"), "desayuno");
  assert.equal(plantillaDe("hostel"), "desayuno");
  assert.equal(plantillaDe("cabañas / complejo"), "kit");
  assert.equal(plantillaDe("departamentos / alquiler temporario"), "kit");
  const t = textoPlantilla("desayuno", "Hotel Capri");
  assert.ok(t.startsWith("Hola, Hotel Capri."));
  assert.ok(!t.includes("{{1}}"));
});

import { canalDe, claveValida, partir } from "./meta-mensajes";

test("canales: clave por canal, validación y corte de textos largos", () => {
  assert.equal(canalDe("5493541519630"), "whatsapp");
  assert.equal(canalDe("fb.123456789"), "messenger");
  assert.equal(canalDe("ig.17841400000000"), "instagram");
  assert.equal(claveValida("fb.123456789"), "fb.123456789");
  assert.equal(claveValida("5493541519630"), "5493541519630");
  assert.equal(claveValida("x.1234567"), null);
  assert.equal(claveValida("fb.12; drop"), null);
  const largo = Array.from({ length: 60 }, (_, i) => `Línea ${i} con un link https://acopiosaludable.com/producto/${i}`).join("\n");
  const partes = partir(largo, 990);
  assert.ok(partes.length > 1);
  assert.ok(partes.every((p) => p.length <= 990));
  assert.equal(partes.join("\n").replace(/\s+/g, " "), largo.replace(/\s+/g, " "));
});

import { cuando, iniciales, pasaFiltro, telefonoLindo, type ResumenCharla } from "./bandeja";

test("bandeja: filtros, búsqueda, iniciales y fechas", () => {
  const base: ResumenCharla = { telefono: "5493541519630", nombre: "María López", estado: "bot", noLeidos: 0, ultimoMensaje: new Date(), anuncioId: null, anuncioTitulo: null, prospecto: null, baja: false, ultimoTexto: "¿Tenés almendras?", ultimoDe: "cliente" };
  assert.equal(pasaFiltro(base, "todas"), true);
  assert.equal(pasaFiltro(base, "sin-leer"), false);
  assert.equal(pasaFiltro({ ...base, noLeidos: 2 }, "sin-leer"), true);
  assert.equal(pasaFiltro({ ...base, estado: "persona" }, "persona"), true);
  assert.equal(pasaFiltro(base, "whatsapp"), true);
  assert.equal(pasaFiltro({ ...base, telefono: "ig.1789" }, "instagram"), true);
  assert.equal(pasaFiltro(base, "todas", "maria"), true);
  assert.equal(pasaFiltro(base, "todas", "almendras"), true);
  assert.equal(pasaFiltro(base, "todas", "3541"), true);
  assert.equal(pasaFiltro(base, "todas", "nueces"), false);
  assert.equal(iniciales("María López", "x"), "ML");
  assert.equal(iniciales(null, "5493541519630"), "30");
  assert.equal(telefonoLindo("5493541519630"), "+54 9 3541 51-9630");
  assert.equal(telefonoLindo("fb.123456"), "Messenger");
  const ahora = new Date("2026-10-15T18:00:00Z");
  assert.equal(cuando(new Date("2026-10-15T17:59:30Z"), ahora), "ahora");
  assert.equal(cuando(new Date("2026-10-15T17:45:00Z"), ahora), "hace 15 min");
  assert.equal(cuando(new Date("2026-10-14T15:00:00Z"), ahora), "ayer");
});

import { separarOpciones, leerToque, planWhatsapp, cuerpoGraph, textoParaPanel } from "./whatsapp-interactivo";
import { pidePersona } from "./asistente";

test("vendedor: la línea OPCIONES se separa del texto y se recorta a botones válidos", () => {
  const r = separarOpciones("Te recomiendo la Despensa.\nOPCIONES: Quiero la Despensa | Ver otros combos | «Una opción demasiado larga para botón» | ver otros combos");
  assert.equal(r.texto, "Te recomiendo la Despensa.");
  assert.deepEqual(r.opciones, ["Quiero la Despensa", "Ver otros combos"]);
  assert.deepEqual(separarOpciones("Hola").opciones, []);
});

test("whatsapp: los ids de botones y filas dicen qué tocó", () => {
  assert.deepEqual(leerToque("quiero|c|despensa-de-4-kilos"), { tipo: "quiero", clase: "combo", id: "despensa-de-4-kilos" });
  assert.deepEqual(leerToque("quiero|p|00123"), { tipo: "quiero", clase: "producto", id: "00123" });
  assert.deepEqual(leerToque("pagar|/carrito?p=c-x*1"), { tipo: "pagar", camino: "/carrito?p=c-x*1" });
  assert.deepEqual(leerToque("transf|/carrito?p=5*2"), { tipo: "transferencia", camino: "/carrito?p=5*2", envio: null });
  assert.deepEqual(leerToque("recibir|/carrito?p=c-d*1~0~Carlos Paz"), { tipo: "recibir", camino: "/carrito?p=c-d*1", envio: { costo: 0, lugar: "Carlos Paz" } });
  assert.deepEqual(leerToque("transf|/carrito?p=c-d*1~~Rosario"), { tipo: "transferencia", camino: "/carrito?p=c-d*1", envio: { costo: null, lugar: "Rosario" } });
  assert.equal(leerToque(null), null);
  assert.equal(leerToque("cualquier cosa"), null);
});

test("whatsapp: productos van en lista para tocar, pedido con botones de pago, sin links sueltos", () => {
  const fichas = [
    { href: "/combos/despensa", nombre: "Combo Despensa de 4 kilos", detalle: "Trae: muchas cosas", precio: "$ 35.268", foto: "https://x/f.jpg" },
  ];
  const plan = planWhatsapp({ texto: "Te conviene la Despensa.", fichas, opciones: ["Quiero la Despensa", "Para un negocio"] }, null);
  assert.equal(plan[0].tipo, "imagen");
  assert.equal(plan[1].tipo, "botones");
  const tarjeta = plan[1] as Extract<(typeof plan)[number], { tipo: "botones" }>;
  assert.deepEqual(tarjeta.botones.map((b) => b.id), ["quiero|c|despensa", "trae|despensa", "op|Para un negocio"]);
  assert.ok(!tarjeta.cuerpo.includes("http"));

  // Productos sueltos: lista para tocar, con títulos dentro del tope de Meta.
  const sueltos = planWhatsapp({ texto: "Hay nueces.", fichas: [{ href: "/producto/9", nombre: "Nuez Mariposa Extra Light Fraccionada de primera calidad", detalle: "x 1 kg", precio: "$ 22.937", foto: null }] }, null);
  const lista = sueltos[0] as Extract<(typeof sueltos)[number], { tipo: "lista" }>;
  assert.equal(lista.tipo, "lista");
  const cuerpo = cuerpoGraph(lista, "549351") as { interactive: { action: { sections: { rows: { title: string }[] }[] } } };
  assert.ok(cuerpo.interactive.action.sections[0].rows.every((r) => r.title.length <= 24));

  // Sin zona todavía: primero se pregunta dónde vive, con botones de zona.
  const sinZona = planWhatsapp({ texto: "Listo, te lo armé." }, { camino: "/carrito?p=c-despensa*1", renglones: ["Despensa — $ 35.268"], total: "$ 35.268", conTransferencia: "$ 32.447", falta: null });
  assert.deepEqual((sinZona[0] as { botones: { id: string }[] }).botones.map((b) => b.id), ["zona|Carlos Paz", "zona|Córdoba Capital", "op|Otra ciudad"]);
  assert.match((sinZona[0] as { cuerpo: string }).cuerpo, /barrio o ciudad/);
  const pedido = planWhatsapp({ texto: "Listo." }, { camino: "/carrito?p=c-despensa*1", renglones: ["Despensa — $ 35.268"], total: "$ 35.268", conTransferencia: "$ 32.447", falta: null, envio: { lugar: "Córdoba Capital", costo: 15000, detalle: "x", propia: true, totalConEnvio: "$ 50.268", transferenciaConEnvio: "$ 47.447" } });
  assert.deepEqual((pedido[0] as { botones: { id: string; titulo: string }[] }).botones.map((b) => b.titulo), ["Mercado Pago", "Transferencia", "Pago al recibir"]);
  assert.equal((pedido[0] as { botones: { id: string }[] }).botones[2].id, "recibir|/carrito?p=c-despensa*1~15000~Córdoba Capital");
  assert.match((pedido[0] as { cuerpo: string }).cuerpo, /Envío: \$\s15\.000\nTotal con envío: \$ 50\.268\nPor transferencia: \$ 47\.447/);
  assert.equal(pedido[0].tipo, "botones");
  const b = pedido[0] as Extract<(typeof pedido)[number], { tipo: "botones" }>;
  assert.deepEqual(b.botones.map((x) => x.titulo), ["Mercado Pago", "Transferencia", "Pago al recibir"]);
  assert.equal(b.botones[0].id, "pagar|/carrito?p=c-despensa*1");
  assert.match(textoParaPanel(b), /\[Botones: Mercado Pago · Transferencia · Pago al recibir\]/);

  const corto = planWhatsapp({ texto: "Listo." }, { camino: "/carrito?p=1*1", renglones: ["Algo — $ 5.000"], total: "$ 5.000", conTransferencia: null, falta: "$ 30.000" });
  assert.match((corto[0] as { cuerpo: string }).cuerpo, /Te faltan \$ 30\.000/);

  assert.deepEqual(planWhatsapp({ texto: "Hola" }, null), [{ tipo: "texto", texto: "Hola" }]);
});

test("whatsapp: pedir una persona es pedirla de verdad, no nombrar whatsapp", () => {
  assert.ok(pidePersona("quiero hablar con una persona"));
  assert.ok(pidePersona("Hablar con Santiago"));
  assert.ok(!pidePersona("te escribo por whatsapp por las almendras"));
  assert.ok(!pidePersona("sos vendedor?"));
  assert.ok(!pidePersona("¡Hola! Quiero precios de frutos secos por kilo"));
});

import { fichasNombradas } from "./whatsapp-interactivo";
test("vendedor: abajo van los productos que nombró", () => {
  const f = (nombre: string) => ({ href: `/combos/${nombre}`, nombre: `Combo ${nombre}`, detalle: "", precio: "$ 1", foto: null });
  const todas = [f("Desayuno 30 días"), f("Despensa de 4 kilos"), f("Alacena de frutos secos")];
  assert.deepEqual(fichasNombradas(todas, "La Despensa de 4 kilos trae…").map((x) => x.nombre), ["Combo Despensa de 4 kilos"]);
  assert.equal(fichasNombradas(todas, "Te paso opciones").length, 3);
  assert.equal(fichasNombradas([...todas, ...todas], "Te paso opciones").length, 0);
});

test("whatsapp: «almendra» encuentra «Almendras» y los tamaños se distinguen en la lista", () => {
  const al = (pres: string, precio: string, cod: string) => ({ href: `/producto/${cod}`, nombre: "Almendras Non Pareil", detalle: `Distrimay · ${pres}`, precio, foto: null });
  const caja = { href: "/combos/caja", nombre: "Combo Caja Sin TACC del mes", detalle: "Trae: x", precio: "$ 66.778", foto: null };
  const todas = [caja, al("x 1 kg", "$ 36.398", "1"), al("x 500 gr", "$ 18.819", "2")];
  const elegidas = fichasNombradas(todas, "Te recomiendo la Almendra Non Pareil de 1 kilo a $ 36.398.");
  assert.deepEqual(elegidas.map((f) => f.href), ["/producto/1", "/producto/2"]);
  const plan = planWhatsapp({ texto: "Hay almendras.", fichas: elegidas }, null);
  const lista = plan.find((x) => x.tipo === "lista") as Extract<(typeof plan)[number], { tipo: "lista" }>;
  const titulos = lista.secciones[0].filas.map((f) => f.titulo);
  assert.equal(new Set(titulos).size, 2);
  assert.match(titulos[0], /^1 kg · Almendras/);
});

import { mensajeSegun, conMensaje, SALUDO_GENERAL } from "./whatsapp-saludo";
test("whatsapp: el mensaje escrito trae lo que la persona estaba mirando", () => {
  assert.equal(mensajeSegun("/producto/123", "Almendras Non Pareil x 1 kg"), "Hola! Quiero Almendras Non Pareil x 1 kg. ¿Me ayudás con el pedido?");
  assert.equal(mensajeSegun("/combos/despensa", "Despensa de 4 kilos"), "Hola! Me interesa el combo Despensa de 4 kilos. ¿Me lo separás?");
  assert.match(mensajeSegun("/carrito", null), /pedido armado/);
  assert.equal(mensajeSegun("/", "Acopio"), SALUDO_GENERAL);
  assert.equal(conMensaje("https://wa.me/5493541519630?text=viejo", "Hola! sí"), "https://wa.me/5493541519630?text=Hola!%20s%C3%AD");
});

import { temaDe } from "./combos-tema";
import { planTrae } from "./whatsapp-interactivo";
test("combos: cada búsqueda va a su combo, y sin TACC gana", () => {
  assert.equal(temaDe("Busco productos sin tacc")?.slugs[0], "caja-sin-tacc-del-mes");
  assert.equal(temaDe("alfajores sin gluten")?.slugs[0], "merienda-sin-tacc");
  assert.equal(temaDe("Nueces x kg.")?.slugs[0], "alacena-de-frutos-secos");
  assert.equal(temaDe("¡Hola! Quiero precios de frutos secos por kilo")?.id, "frutos-secos");
  assert.equal(temaDe("algo para el desayuno, granola")?.id, "desayuno");
  assert.equal(temaDe("proteína para el gym")?.id, "gym");
  assert.equal(temaDe("hola"), null);
  const t = planTrae({ slug: "x", nombre: "X", precio: "$ 1", argumento: "", renglones: ["a", "b"] });
  assert.equal(t[0].tipo, "botones");
  assert.match((t[0] as { cuerpo: string }).cuerpo, /• a\n• b/);
});

import { cortada } from "./whatsapp-interactivo";
test("vendedor: una respuesta cortada no se manda", () => {
  assert.equal(cortada("No hace fal"), true);
  assert.equal(cortada("No hace falta, trabajamos online."), false);
  assert.equal(cortada("Dale 👍"), false);
  assert.equal(cortada("Listo, te la separo\nOPCIONES: Sí | No"), true);
  assert.equal(cortada("Para sin TACC te conviene la Caja Sin TACC del mes: $66.778 y ahorrás"), false);
});

import { zonaDeLugar } from "./envio-zona";
test("envío en el chat: la zona sale de lo que escribe", () => {
  assert.deepEqual(zonaDeLugar("Villa Carlos Paz"), { tipo: "propia" });
  assert.deepEqual(zonaDeLugar("soy de Icho Cruz"), { tipo: "propia" });
  assert.deepEqual(zonaDeLugar("Estancia Vieja, frente a Pekos"), { tipo: "propia" });
  assert.deepEqual(zonaDeLugar("Nueva Córdoba"), { tipo: "capital" });
  assert.deepEqual(zonaDeLugar("Córdoba"), { tipo: "capital" });
  assert.deepEqual(zonaDeLugar("Rosario", "Santa Fe"), { tipo: "correo", provincia: "Santa Fe" });
  assert.deepEqual(zonaDeLugar("Mendoza"), { tipo: "correo", provincia: "Mendoza" });
  assert.deepEqual(zonaDeLugar("CABA"), { tipo: "correo", provincia: "Ciudad Autónoma de Buenos Aires" });
  assert.equal(zonaDeLugar("Rosario"), null);
});

import { esRespuestaAutomatica } from "./asistente";
test("whatsapp: no se le contesta a otro bot", () => {
  assert.ok(esRespuestaAutomatica("Hola, ¿cómo estás? Un gusto saludarte. Gracias por comunicarte y elegir nuestros servicios, soy Terra el asistente virtual de Terra Firma"));
  assert.ok(esRespuestaAutomatica("Gracias por tu mensaje. En breve te responderemos."));
  assert.ok(esRespuestaAutomatica("Nuestro horario de atención es de 9 a 18 hs"));
  assert.ok(!esRespuestaAutomatica("Sí, pasame precios"));
  assert.ok(!esRespuestaAutomatica("Hola, somos 20 habitaciones, qué tienen para el desayuno?"));
});

import { quiereVer, planVer } from "./whatsapp-interactivo";
test("whatsapp: «ver los productos» muestra, no pregunta", () => {
  for (const t of ["Ver los productos", "Ver combos", "Ver otros combos", "Ver otro combo", "ver otras opciones", "¿Qué tienen?", "catálogo", "pasame la lista"]) assert.ok(quiereVer(t), t);
  for (const t of ["Busco frutos secos", "quiero la despensa", "hola"]) assert.ok(!quiereVer(t), t);
  const p = planVer([{ slug: "despensa", nombre: "Despensa de 4 kilos", precio: "$ 35.268", argumento: "$ 8.817 el kilo" }]);
  const l = p[0] as Extract<(typeof p)[number], { tipo: "lista" }>;
  assert.equal(l.secciones[0].filas[0].id, "trae|despensa");
  assert.equal(l.secciones[1].filas.length, 3);
  const conWeb = planVer([{ slug: "d", nombre: "D", precio: "$ 1", argumento: "" }], "https://x/combos");
  assert.equal(conWeb[1].tipo, "cta");
});

import { argumentoCombo } from "./combos-tema";
test("combos: el argumento es el precio por kilo o por transferencia, no «ahorrás»", () => {
  const p = (n: number) => `$${n}`;
  const despensa = { precio: 35268, items: [1, 2, 3, 4].map(() => ({ cantidad: 1, producto: { contenido: 1, unidad: "kg" } })) };
  assert.equal(argumentoCombo(despensa, 8, p).porKilo, "$8817 el kilo");
  const mixto = { precio: 65000, items: [{ cantidad: 1, producto: { contenido: null, unidad: null } }] };
  assert.equal(argumentoCombo(mixto, 8, p).porKilo, null);
  assert.equal(argumentoCombo(mixto, 8, p).corto, "$59800 por transferencia");
});

import { postergaCompra, planSinApuro } from "./whatsapp-interactivo";
test("postergar la compra: se le da tiempo, sin pedido ni zonas", () => {
  for (const t of ["Gracias por pasarme veo traquila y te escribo para encargarte", "Lo veo tranquila y te aviso", "lo voy a pensar", "después te escribo", "Bueno gracias, mañana te confirmo", "lo consulto con mi marido y te aviso", "cualquier cosa te escribo", "voy a mirarlo con calma"]) assert.ok(postergaCompra(t), t);
  for (const t of ["dale, lo quiero", "hola", "lo veo tranquila, ¿hacen envío a Tanti?", "gracias", "Sí, dejámelo listo", "quiero la despensa", "Carlos Paz"]) assert.ok(!postergaCompra(t), t);
  const [s] = planSinApuro("Gloria Pérez", "https://x.com");
  assert.equal(s.tipo, "cta");
  assert.ok(s.tipo === "cta" && s.cuerpo.startsWith("¡Dale, Gloria!"));
});

import { leerEntrante, partirMarca, sinIds } from "./whatsapp-media";
test("audios, fotos y reacciones entran a la charla", () => {
  const r = leerEntrante({ type: "reaction", reaction: { emoji: "🥳", message_id: "x" } });
  assert.deepEqual([r.guardar, r.texto, r.silencioso], ["[reacción 🥳]", null, true]);
  const a = leerEntrante({ type: "audio", audio: { id: "123456789", voice: true } });
  assert.deepEqual([a.guardar, a.texto, a.silencioso], ["[audio·123456789]", null, false]);
  const f = leerEntrante({ type: "image", image: { id: "987654321", caption: "tienen esto?" } });
  assert.deepEqual([f.guardar, f.texto], ["[foto·987654321] tienen esto?", "tienen esto?"]);
  assert.deepEqual(partirMarca(f.guardar), { tipo: "foto", id: "987654321", resto: "tienen esto?" });
  assert.equal(sinIds(f.guardar), "[foto] tienen esto?");
  const l = leerEntrante({ type: "location", location: { latitude: -31.4, longitude: -64.5, address: "Río Salado 451, Carlos Paz" } });
  assert.ok(l.texto?.includes("Carlos Paz"));
  assert.equal(partirMarca("hola"), null);
});

import { soloAgradece } from "./whatsapp-interactivo";
test("gracias solo y «pregunto y te digo»", () => {
  for (const t of ["Gracias.", "ok gracias", "Muchas gracias!", "👍", "dale gracias"]) assert.ok(soloAgradece(t), t);
  for (const t of ["gracias, y el envío?", "Mi nombre es Juan.", "gracias por pasarme veo tranquila y te escribo"]) assert.ok(!soloAgradece(t), t);
  for (const t of ["Pregunto y te digo. Gracias", "consulto y te aviso"]) assert.ok(postergaCompra(t), t);
});
