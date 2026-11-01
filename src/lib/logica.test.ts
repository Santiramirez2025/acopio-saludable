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
  assert.equal(precioTransferencia(10800, 8), 9900);
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
  // Se divide, no se multiplica: 35.000 / 0,92 = 38.043,48 → redondo hacia arriba $ 38.500 (cubre la comisión).
  const cobrado = envioQueSeCobra(35000, "MERCADOPAGO", 8);
  assert.equal(cobrado, 38500);
  assert.ok(cobrado * 0.92 >= 35000, "después de la comisión tiene que quedar al menos el costo del correo");
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

  // Productos sueltos: sin lista. Si termina en pregunta, botones con las respuestas; si no, texto.
  const nuez = [{ href: "/producto/9", nombre: "Nuez Mariposa Extra Light", detalle: "x 1 kg", precio: "$ 22.937", foto: null }];
  assert.equal(planWhatsapp({ texto: "La nuez sale $ 22.937 el kilo.", fichas: nuez, opciones: ["Para mi casa"] }, null)[0].tipo, "texto");
  const conPregunta = planWhatsapp({ texto: "La nuez sale $ 22.937. ¿Para tu casa o un negocio?", fichas: nuez, opciones: ["Para mi casa", "Para un negocio"] }, null);
  assert.equal(conPregunta[0].tipo, "botones");
  assert.ok(conPregunta.every((x) => x.tipo !== "lista"));

  // Sin zona todavía: primero se pregunta dónde vive, con botones de zona.
  const sinZona = planWhatsapp({ texto: "Listo, te lo armé." }, { camino: "/carrito?p=c-despensa*1", renglones: ["Despensa — $ 35.268"], total: "$ 35.268", conTransferencia: "$ 32.447", falta: null });
  assert.deepEqual((sinZona[0] as { botones: { id: string }[] }).botones.map((b) => b.id), ["zona|Carlos Paz", "zona|Córdoba Capital", "op|Otra ciudad"]);
  assert.match((sinZona[0] as { cuerpo: string }).cuerpo, /barrio o ciudad/);
  const pedido = planWhatsapp({ texto: "Listo." }, { camino: "/carrito?p=c-despensa*1", renglones: ["Despensa — $ 35.268"], total: "$ 35.268", conTransferencia: "$ 32.447", falta: null, envio: { lugar: "Córdoba Capital", costo: 15000, detalle: "x", propia: true, totalConEnvio: "$ 50.268", transferenciaConEnvio: "$ 47.447" } });
  // Córdoba capital: se paga antes, no hay «Pago al recibir».
  assert.deepEqual((pedido[0] as { botones: { id: string; titulo: string }[] }).botones.map((b) => b.titulo), ["Mercado Pago", "Transferencia", "Sumar algo más"]);
  assert.match((pedido[0] as { cuerpo: string }).cuerpo, /Envío: \$\s15\.000\nTotal con envío: \$ 50\.268\nPor transferencia: \$ 47\.447/);
  assert.equal(pedido[0].tipo, "botones");
  const cp = planWhatsapp({ texto: "Listo." }, { camino: "/carrito?p=c-despensa*1", renglones: ["Despensa — $ 35.268"], total: "$ 35.268", conTransferencia: "$ 32.447", falta: null, envio: { lugar: "Carlos Paz", costo: 0, detalle: "x", propia: true, alRecibir: true, totalConEnvio: "$ 35.268", transferenciaConEnvio: "$ 32.447" } });
  const b = cp[0] as Extract<(typeof cp)[number], { tipo: "botones" }>;
  // Desde el 28/10 no hay pago al recibir: el tercer botón es «Sumar algo más» también en Carlos Paz.
  assert.deepEqual(b.botones.map((x) => x.titulo), ["Mercado Pago", "Transferencia", "Sumar algo más"]);
  assert.equal(b.botones[2].id, "op|Sumar algo más");
  assert.equal(b.botones[0].id, "pagar|/carrito?p=c-despensa*1");
  assert.match(textoParaPanel(b), /\[Botones: Mercado Pago · Transferencia · Sumar algo más\]/);

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
  assert.ok(planWhatsapp({ texto: "Hay almendras.", fichas: elegidas }, null).every((x) => x.tipo !== "lista"));
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
  assert.deepEqual(zonaDeLugar("El Fantasío"), { tipo: "propia" });
  assert.deepEqual(zonaDeLugar("carlos paz, barrio el fantacio"), { tipo: "propia" });
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
  assert.ok(esRespuestaAutomatica("☝️Este es un canal de notificaciones. Si recibiste un mensaje nuestro, no respondas por acá."));
  assert.ok(esRespuestaAutomatica("Hola! 👋 Gracias por comunicarte con Tiendas Eatwell"));
  assert.ok(esRespuestaAutomatica("Nuestro horario de atención es de 9 a 18 hs"));
  assert.ok(!esRespuestaAutomatica("Sí, pasame precios"));
  assert.ok(!esRespuestaAutomatica("Hola, somos 20 habitaciones, qué tienen para el desayuno?"));
});

import { quiereVer, planVer } from "./whatsapp-interactivo";
test("whatsapp: «ver los productos» muestra, no pregunta", () => {
  for (const t of ["Ver los productos", "Ver combos", "Ver otros combos", "Ver otro combo", "ver otras opciones", "¿Qué tienen?", "catálogo", "pasame la lista"]) assert.ok(quiereVer(t), t);
  for (const t of ["Busco frutos secos", "quiero la despensa", "hola"]) assert.ok(!quiereVer(t), t);
  const p = planVer([{ slug: "despensa", nombre: "Despensa de 4 kilos", precio: "$ 35.268", argumento: "$ 8.817 el kilo" }]);
  const b = p[0] as Extract<(typeof p)[number], { tipo: "botones" }>;
  assert.equal(b.tipo, "botones");
  assert.equal(b.botones[0].id, "trae|despensa");
  assert.match(b.cuerpo, /Despensa de 4 kilos: \$ 35\.268/);
  assert.equal(p.length, 1);
});

import { ordenarParaVer } from "./whatsapp-interactivo";
test("whatsapp: «ver combos» muestra primero la Alacena, la Mesa navideña y la Despensa, después por precio", () => {
  const combos = [
    { slug: "despensa-chica", precio: 20500 },
    { slug: "merienda-sin-tacc", precio: 28000 },
    { slug: "desayuno-30-dias", precio: 33000 },
    { slug: "kit-alfajorcitos", precio: 35000 },
    { slug: "despensa-4-kilos", precio: 35500 },
    { slug: "pan-dulce-casero", precio: 38500 },
    { slug: "alacena-de-frutos-secos", precio: 45000 },
    { slug: "mesa-navidena", precio: 49000 },
  ];
  const orden = ordenarParaVer(combos).map((c) => c.slug);
  assert.deepEqual(orden.slice(0, 4), ["alacena-de-frutos-secos", "mesa-navidena", "despensa-4-kilos", "despensa-chica"]);
  assert.equal(orden.length, combos.length);
  assert.equal(combos[0].slug, "despensa-chica"); // no toca el arreglo original
  // Si un combo de los primeros no está disponible, sigue el resto por precio.
  assert.deepEqual(ordenarParaVer(combos.filter((c) => c.slug !== "mesa-navidena")).map((c) => c.slug).slice(0, 3), ["alacena-de-frutos-secos", "despensa-4-kilos", "despensa-chica"]);
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
  assert.equal(s.tipo, "botones");
  assert.ok(s.tipo === "botones" && s.cuerpo.startsWith("¡Dale, Gloria!") && s.botones[0].titulo === "Sí, dejalo listo");
  const [foto, b] = planSinApuro("Ana", "https://x.com", "https://x.com/img/galeria/real-asi-llega.jpg");
  assert.equal(foto.tipo, "imagen");
  assert.equal(b.tipo, "botones");
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
  for (const t of ["gracias, y el envío?", "Mi nombre es Juan.", "gracias por pasarme veo tranquila y te escribo", "?", "??"]) assert.ok(!soloAgradece(t), t);
  for (const t of ["Pregunto y te digo. Gracias", "consulto y te aviso"]) assert.ok(postergaCompra(t), t);
});

import { proveedorDe } from "./proveedores";
test("a quién se le compra cada cosa", () => {
  const S = "Sin marca / fraccionado";
  assert.equal(proveedorDe({ producto: "Mix Clasico", marca: S }), "propio");
  assert.equal(proveedorDe({ producto: "Mix Clásico con cajú", marca: S, codigo: "TG-MIXC" }), "propio");
  assert.equal(proveedorDe({ producto: "Castañas de cajú W4", marca: S, codigo: "TG-CAJU" }), "lagranja");
  assert.equal(proveedorDe({ producto: "Nuez Mariposa Extra Light", marca: S }), "lagranja");
  assert.equal(proveedorDe({ producto: "Banana Chips", marca: S }), "lagranja");
  assert.equal(proveedorDe({ producto: "Avena Instantanea", marca: S }), "lagranja");
  assert.equal(proveedorDe({ producto: "Azucar Mascabo", marca: S }), "lagranja");
  assert.equal(proveedorDe({ producto: "Pasas de uva sin semillas", marca: S }), "lagranja");
  assert.equal(proveedorDe({ producto: "Datiles con carozo", marca: S }), "lagranja");
  assert.equal(proveedorDe({ producto: "Sal Rosada del Himalaya", marca: S }), "lagranja");
  assert.equal(proveedorDe({ producto: "Alfajores Surtidos Sin Gluten", marca: "Yuka" }), "distrimay");
  assert.equal(proveedorDe({ producto: "Pasta de Mani Natural", marca: "Entrenuts" }), "distrimay");
  assert.equal(proveedorDe({ producto: "Mani Japones queso", marca: S }), "distrimay");
});

import { pagaAlRecibir, tieneDireccion } from "./whatsapp-interactivo";
test("pago aquí y dirección", () => {
  for (const t of ["Pago aquí.", "pago cuando me lo traes", "Lo pago al recibir", "en efectivo", "contra entrega", "te pago aca"]) assert.ok(pagaAlRecibir(t), t);
  for (const t of ["¿puedo pagar al recibir?", "Mi nombre es Juan.", "quiero la despensa", "transferencia"]) assert.ok(!pagaAlRecibir(t), t);
  for (const t of ["La dirección es Cartago 100, esquina Rosario casa blanca", "Río Salado 451 Barrio El Fantasio", "Av. San Martín 1200"]) assert.ok(tieneDireccion(t), t);
  for (const t of ["Pago aquí.", "gracias", "quiero 2 kilos"]) assert.ok(!tieneDireccion(t), t);
});

import { planRecordatorio, cerroLaCharla, clienteDijoQueNo, enHorario, horaArgentina } from "./whatsapp-recordatorio";
test("recordatorio: corto, con pregunta, y nunca de noche", () => {
  const conPedido = planRecordatorio({ nombre: "Patricia Sanchez", anuncioTitulo: null, pedido: "/carrito?p=c-despensa*1" }) as { cuerpo: string; botones: { id: string }[] };
  assert.match(conPedido.cuerpo, /^¡Hola Patricia!.*\?/);
  assert.equal(conPedido.botones[0].id, "op|Sí, cerrémoslo");
  const anuncio = planRecordatorio({ nombre: "Casa Playas de Oro", anuncioTitulo: "Despensa de 4 kilos a $35.268", pedido: null }) as { cuerpo: string };
  assert.match(anuncio.cuerpo, /^¡Hola! ¿Pudiste ver lo de la Despensa de 4 kilos\?/);
  assert.ok(cerroLaCharla("¡De nada, María! Cualquier cosa nos escribís por acá 🙌"));
  assert.ok(!cerroLaCharla("La nuez sale $X. ¿Para tu casa o para un negocio?"));
  assert.equal(horaArgentina(new Date("2026-10-18T11:00:00Z")), 8);
  assert.ok(enHorario(new Date("2026-10-18T11:00:00Z")));
  assert.ok(!enHorario(new Date("2026-10-18T02:00:00Z")));
  assert.ok(!enHorario(new Date("2026-10-18T00:30:00Z")));
});

import { prolijo } from "./nombres";
test("tienda: nombres del proveedor prolijos", () => {
  assert.equal(prolijo("x1kg-DEAN FUNES"), "x 1 kg · Dean Funes");
  assert.equal(prolijo("x100 Grs-DEAN FUNES"), "x 100 g · Dean Funes");
  assert.equal(prolijo("Mix Clásico con cajú"), "Mix Clásico con cajú");
  assert.equal(prolijo("x 1kg Fraccionada"), "x 1 kg Fraccionada");
  assert.equal(prolijo("Barritas Zannas Almendras y Sal marina Sin Glutenx 12 Unid."), "Barritas Zannas Almendras y Sal marina Sin Glutenx 12 Unid.");
  assert.equal(prolijo("x25 saq. Hurlingham Sin Gluten"), "x 25 saq. Hurlingham Sin Gluten");
});

import { factorHogar } from "./armador";
test("mi lista: el pedido base crece con las personas del hogar", () => {
  assert.equal(factorHogar(1), 1);
  assert.equal(factorHogar(2), 1.5);
  assert.equal(factorHogar(4), 2);
  assert.equal(factorHogar(6), 3);
  const items = armarPedido({ base: [{ codigo: "a", precio: 9000, cantidad: 1 }, { codigo: "b", precio: 9000, cantidad: 1 }], candidatos: [{ codigo: "c", precio: 5000 }], personas: 2, presupuesto: 50000, compraMinima: 35000, factor: factorHogar(2) });
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  assert.ok(total >= 35000 && total <= 50000, String(total));
});

import { cotizarDesayunos, desayunosDe } from "./cotizador-hotel";
test("cotizador hoteles: desayunos del período y envases que hacen falta", () => {
  assert.equal(desayunosDe(20, 60, 30), 360);
  const cat = [
    { codigo: "g1", producto: "Granola con pasta de maní", presentacion: "x 1 kg", precio: 14000, contenido: 1000, unidad: "g" },
    { codigo: "g2", producto: "Granola Tradicional", presentacion: "x 500 g", precio: 9000, contenido: 500, unidad: "g" },
    { codigo: "t", producto: "Te Negro Seleccion", presentacion: "x 25 saq. Hurlingham", precio: 770, contenido: null, unidad: null },
  ];
  const r = cotizarDesayunos(360, ["granola", "te"], [...cat, { codigo: "gal", producto: "Galletas de Granola", presentacion: "x 1 kg", precio: 100, contenido: 1000, unidad: "g" }]);
  assert.deepEqual(r.map((x) => [x.codigo, x.cantidad]), [["g1", 9], ["t", 8]]);
  const avena = cotizarDesayunos(360, ["avena"], [
    { codigo: "a25", producto: "Avena Tradicional Bolson", presentacion: "x 25 kg", precio: 59000, contenido: 25000, unidad: "g" },
    { codigo: "a3", producto: "Avena Instantanea", presentacion: "x 3 kg", precio: 8900, contenido: 3000, unidad: "g" },
  ]);
  assert.deepEqual(avena.map((x) => [x.codigo, x.cantidad]), [["a3", 3]]);
});

import { etapaDe, teEspera } from "./bandeja";

test("bandeja: etapa de venta de cada charla", () => {
  const ahora = new Date("2026-10-18T18:00:00Z");
  const base: ResumenCharla = { telefono: "5493541519630", nombre: "Ana", estado: "bot", noLeidos: 0, ultimoMensaje: new Date("2026-10-18T17:00:00Z"), anuncioId: null, anuncioTitulo: null, prospecto: null, baja: false, ultimoTexto: "hola", ultimoDe: "cliente" };
  assert.equal(etapaDe(base, ahora), "consulta");
  assert.equal(etapaDe({ ...base, ultimoMensaje: new Date("2026-10-10T00:00:00Z") }, ahora), "fria");
  assert.equal(etapaDe({ ...base, pedido: "/carrito?p=1*1" }, ahora), "cerrar");
  assert.equal(etapaDe({ ...base, compras: 1, aCobrar: 1 }, ahora), "cobrar");
  assert.equal(etapaDe({ ...base, compras: 2, aCobrar: 0 }, ahora), "cliente");
  assert.equal(etapaDe({ ...base, prospecto: "hotel" }, ahora), "negocio");
  assert.equal(teEspera({ ...base, estado: "persona" }), true);
  assert.equal(teEspera({ ...base, estado: "persona", ultimoDe: "persona" }), false);
});

import { comentariosDe, mensajePrivado, tieneIntencion } from "./comentarios";

test("comentarios: intención de compra y lectura del webhook", () => {
  assert.equal(tieneIntencion("Precio?"), true);
  assert.equal(tieneIntencion("cuánto sale la despensa"), true);
  assert.equal(tieneIntencion("Info"), true);
  assert.equal(tieneIntencion("Qué rico 😍"), false);
  const ig = comentariosDe("instagram", [{ changes: [{ field: "comments", value: { id: "1", text: "precio", from: { id: "9", username: "ana" }, media: { id: "m" } } }] }]);
  assert.equal(ig.length, 1);
  assert.equal(ig[0].canal, "instagram");
  const fb = comentariosDe("page", [{ changes: [{ field: "feed", value: { item: "comment", verb: "add", comment_id: "2_3", post_id: "2", parent_id: "2", message: "info", from: { id: "7", name: "Juan" } } }] }]);
  assert.equal(fb.length, 1);
  assert.equal(fb[0].esRespuesta, false);
  assert.match(mensajePrivado("$ 35.232"), /35\.232.*\?$/);
});

import { nuevas, textoAviso, type Publicacion } from "./radar";

test("radar: solo publicaciones recientes y no avisadas", () => {
  const ahora = new Date("2026-10-18T20:00:00Z");
  const p = (id: string, min: number): Publicacion => ({ id, username: "cuenta", seguidores: 25400, caption: "Llega el finde largo", permalink: "https://instagram.com/p/x", timestamp: new Date(ahora.getTime() - min * 60_000).toISOString(), likes: 10, comentarios: 2 });
  const r = nuevas([p("a", 5), p("b", 120), p("c", 10)], new Set(["c"]), ahora);
  assert.deepEqual(r.map((x) => x.id), ["a"]);
  assert.match(textoAviso(p("a", 5), "¡Qué bueno!", ahora), /@cuenta \(25\.4 mil seguidores\) publicó hace 5 min/);
});

test("un código postal solo no es un gracias", () => {
  assert.equal(soloAgradece("3300"), false);
  assert.equal(soloAgradece("5152"), false);
  assert.equal(soloAgradece("👍"), true);
  assert.equal(soloAgradece("gracias"), true);
});

test("recordatorio: no se insiste después de un no", () => {
  assert.ok(cerroLaCharla("Gracias a vos, Carlos. Cuando quieras armamos el mix a medida, acá estamos para ayudarte."));
});

test("seguimiento: el día de entrega es pasado mañana y nunca domingo", async () => {
  const { diaDeEntrega } = await import("./seguimiento-dia");
  assert.equal(diaDeEntrega(new Date("2026-10-19T15:00:00Z")), "miércoles");
  assert.equal(diaDeEntrega(new Date("2026-10-23T15:00:00Z")), "lunes");
});

test("listas de precios: lee renglones de Todo Granolas y La Granja", async () => {
  const { parsearLista, detectarProveedor, leerPrecio } = await import("./listas-pdf");
  const filas = ["  981-007 NUEZ MARIPOSA EXTRA LIGHT X 1 KG $ 15,993.45 $ 15,993.45", "095-016 MIX CLASICO ( CON CAJU ) X1 KG $ 7,364.63 $ 7,364.63", "LISTA DE PRECIOS Desde , Precios#2", "  980-047   DATILES DEGLET NOUR C/CAROZO X 5KG - ARGELIA   $   9,068.53   $   45,342.64"];
  const l = parsearLista(filas);
  assert.deepEqual(l.map((x) => [x.codigo, x.precio]), [["981-007", 15993.45], ["095-016", 7364.63], ["980-047", 9068.53]]);
  assert.equal(l[2].nombre, "DATILES DEGLET NOUR C/CAROZO X 5KG - ARGELIA");
  assert.equal(detectarProveedor("PRECIOS MAYORISTAS REFERENCIAL"), "LG");
  assert.equal(detectarProveedor("LISTA DISTRIBUIDORES ... TODO GRANOLAS"), "TG");
  assert.equal(leerPrecio("1.234,50"), 1234.5);
});

import { derivacion } from "./derivacion";
test("derivación al dueño: con y sin número", () => {
  assert.deepEqual(derivacion("Hola buenos días, te paso el número de uno de los dueños para que te puedas comunicar mejor, su nombre es lourdes"), { telefono: null, nombre: "Lourdes" });
  assert.deepEqual(derivacion("👤 Contacto: Lourdes Pérez +54 9 3541 55-1234"), { telefono: "5493541551234", nombre: "Lourdes Pérez" });
  assert.deepEqual(derivacion("hablá con la encargada, Marta: 3541551234"), { telefono: "5493541551234", nombre: "Marta" });
  assert.equal(derivacion("Sí, pasame precios"), null);
  assert.equal(derivacion("¿Cuánto sale el kilo de nuez?"), null);
});

test("fotos pedidas: salen antes del texto, con pie", () => {
  const plan = planWhatsapp({ texto: "Te paso las fotos. ¿Te armo la caja?", fotos: [{ url: "https://x/a.jpg", pie: "Barrita · $2.657" }, { url: "https://x/b.jpg", pie: "Granola · $9.000" }] }, null);
  assert.equal(plan[0].tipo, "imagen");
  assert.equal(plan[1].tipo, "imagen");
  assert.ok(plan.length >= 3 && plan[2].tipo !== "imagen");
});

import { lugarDelHistorial, sumarLineas } from "./pedido-charla";
test("el pedido acumula: lo nuevo se suma y lo repetido pisa la cantidad", () => {
  const previas = [{ tipo: "producto" as const, id: "TG-MIXC", cantidad: 1 }, { tipo: "combo" as const, id: "despensa-chica", cantidad: 1 }];
  const r = sumarLineas(previas, [{ tipo: "producto", id: "TG-MIXCERV-500", cantidad: 1 }, { tipo: "producto", id: "TG-MIXC", cantidad: 2 }]);
  assert.deepEqual(r.map((l) => `${l.id}x${l.cantidad}`), ["TG-MIXCx2", "despensa-chicax1", "TG-MIXCERV-500x1"]);
});
test("la zona dicha antes se reutiliza", () => {
  assert.equal(lugarDelHistorial([{ de: "yo", texto: "Carlos Paz" }, { de: "acopio", texto: "Listo, pagás al recibir." }, { de: "yo", texto: "Y quiero el mix cervecero" }]), "Carlos Paz");
  assert.equal(lugarDelHistorial([{ de: "acopio", texto: "Envío a San Roque: sin cargo." }, { de: "yo", texto: "dale" }]), "San Roque");
  assert.equal(lugarDelHistorial([{ de: "yo", texto: "hola" }]), null);
});

import { productosDe, sugerirDelStock, EN_STOCK } from "./en-stock";

test("stock: ofrece lo que combina y no repite lo que lleva", () => {
  const cat = [
    { codigo: "TG-NUEZ", producto: "Nuez Mariposa blanca light", marca: "Sin marca", presentacion: "x 1 kg", precio: 23000 },
    { codigo: "LG-DATIL-500", producto: "Dátiles Deglet Nour con carozo (Argelia)", marca: "Sin marca", presentacion: "x 500 g", precio: 7500 },
    { codigo: "LG-DATIL", producto: "Dátiles Deglet Nour con carozo (Argelia)", marca: "Sin marca", presentacion: "x 1 kg", precio: 14500 },
    { codigo: "LG-MIEL", producto: "Miel de abejas pura", marca: "Los Dos Zánganos", presentacion: "x 500 g", precio: 11000 },
    { codigo: "TG-GTRAD", producto: "Granola Tradicional", marca: "Todo Granolas", presentacion: "x 1 kg", precio: 12000 },
    { codigo: "TG-MIXC", producto: "Mix Clásico con cajú", marca: "Sin marca", presentacion: "x 1 kg", precio: 15000 },
  ];
  const despensa = sugerirDelStock("Despensa: mix clásico, pasas, semillas", cat);
  assert.equal(despensa[0].producto.codigo, "LG-DATIL-500"); // dátiles primero, el de 500 g
  assert.equal(despensa[1].producto.codigo, "TG-NUEZ");
  const conNuez = sugerirDelStock("nuez mariposa 1 kg", cat);
  assert.ok(!conNuez.some((s) => s.producto.codigo === "TG-NUEZ"));
  const desayuno = sugerirDelStock("granola tradicional", cat);
  assert.equal(desayuno[0].producto.codigo, "LG-MIEL");
  // Todo Granolas no cuenta como stock; el mix con cajú no es «cajú».
  const caju = EN_STOCK.find((i) => i.id === "caju")!;
  assert.equal(productosDe(caju, cat).length, 0);
  const granola = EN_STOCK.find((i) => i.id === "granola")!;
  assert.equal(productosDe(granola, cat).length, 0);
});

import { cuantoTrae } from "./precios";

test("combo: cada renglón dice su cantidad", () => {
  assert.equal(cuantoTrae({ cantidad: 1, producto: { producto: "Dátiles", contenido: 1000, unidad: "g" } }), "1 kg de Dátiles");
  assert.equal(cuantoTrae({ cantidad: 1, producto: { producto: "Pasas", contenido: 500, unidad: "g" } }), "500 g de Pasas");
  assert.equal(cuantoTrae({ cantidad: 2, producto: { producto: "Mix", contenido: 1000, unidad: "g" } }), "2 kg de Mix");
  assert.equal(cuantoTrae({ cantidad: 6, producto: { producto: "Barra", contenido: 40, unidad: "g" } }), "6 x Barra (240 g)");
  assert.equal(cuantoTrae({ cantidad: 1, producto: { producto: "Pack", contenido: null, unidad: null } }), "Pack");
});

import { imagenCombo, imagenProducto, pideFotosReales, fotosReales } from "./galeria";
import { existsSync } from "node:fs";

test("galería: cada imagen mapeada existe y se reconoce el «cómo llega»", () => {
  for (const s of ["despensa-4-kilos", "despensa-chica", "alacena-de-frutos-secos", "desayuno-30-dias", "mixes-del-mes", "arranque-gym"]) {
    const u = imagenCombo(s)!;
    assert.ok(existsSync(`public${u}`), u);
  }
  for (const c of ["TG-NUEZ", "LG-ALMNP", "TG-CAJU", "TG-MIXCG", "LG-DATIL", "TG-PASAS"]) assert.ok(existsSync(`public${imagenProducto(c)}`), c);
  for (const f of fotosReales()) assert.ok(existsSync(`public${f.url}`), f.url);
  assert.equal(imagenCombo("no-existe"), null);
  assert.ok(pideFotosReales("¿cómo llega el pedido?"));
  assert.ok(!pideFotosReales("nueces"));
});

import { fotosOportunas } from "./galeria";

test("imágenes oportunas: en el momento justo y sin repetir", () => {
  const vacio: { de: "yo" | "acopio"; texto: string }[] = [];
  // Duda → foto real
  assert.equal(fotosOportunas({ entrante: "¿es confiable?", respuesta: "Somos de Carlos Paz", historial: vacio })[0].url, "/img/galeria/real-asi-llega.jpg");
  // Combo nombrado → su imagen
  assert.equal(fotosOportunas({ entrante: "qué me recomendás", respuesta: "Te conviene la Despensa de 4 kilos a $35.227", historial: vacio })[0].url, "/img/galeria/combo-despensa-4-kilos.jpg");
  // Producto preguntado y cotizado → su imagen
  assert.equal(fotosOportunas({ entrante: "precio nueces?", respuesta: "La nuez sale $24.872 el kilo", historial: vacio })[0].url, "/img/galeria/producto-nuez.jpg");
  // Ya se mandó → no se repite
  const conFoto = [{ de: "acopio" as const, texto: "[Foto] Despensa de 4 kilos" }];
  assert.equal(fotosOportunas({ entrante: "y la despensa?", respuesta: "La Despensa de 4 kilos sale $35.227", historial: conFoto }).length, 0);
  // Tope de 3 por charla
  const tres = ["a", "b", "c"].map((x) => ({ de: "acopio" as const, texto: `[Foto] ${x}` }));
  assert.equal(fotosOportunas({ entrante: "¿es confiable?", respuesta: "sí", historial: tres }).length, 0);
  // Charla común sin disparador → nada
  assert.equal(fotosOportunas({ entrante: "hola", respuesta: "¡Hola! ¿Qué estás buscando?", historial: vacio }).length, 0);
  // Pidió una granola: no va la foto del mix (Lorenzo)
  assert.equal(fotosOportunas({ entrante: "Hola! Quiero Granola proteica Sport x 1 kg", respuesta: "La granola sale $14.200", historial: vacio }).length, 0);
  // El vendedor ofrece un combo que nadie pidió: sin foto
  assert.equal(fotosOportunas({ entrante: "quiero sal rosada y granola", respuesta: "Te paso: Despensa de 4 kilos a $35.500", historial: vacio }).length, 0);
});

test("imágenes oportunas: el primer «precios por kilo» va con la imagen del mix", () => {
  const r = fotosOportunas({ entrante: "Hola, quiero precios por kilo", respuesta: "Te paso precios por kilo de hoy: Mix clásico $12.451", historial: [] });
  assert.equal(r[0].url, "/img/galeria/producto-mix-clasico.jpg");
});

import { mensajeDespacho, mensajesGracias } from "./despacho-texto";

test("despacho sin referidos; gracias con referidos", () => {
  const base = { id: 17, nombre: "Lilita", medioPago: "AL_RECIBIR" as const, pagadoAt: null, total: 15400 as unknown as never, token: "abc123" };
  const d = mensajeDespacho(base);
  assert.match(d, /Hola Lilita! 😊 Tu pedido AS-00017 ya está en el reparto de hoy/);
  assert.match(d, /Lo pagás cuando te llega/);
  assert.doesNotMatch(d, /5%|recomend/i);
  const [g, link] = mensajesGracias(base, "https://www.acopiosaludable.com");
  assert.match(g, /Gracias por tu compra, Lilita/);
  assert.match(g, /5%/);
  assert.match(link, /\?ref=amigo-/);
});

test("precios redondos: $35.227 se vende como $35.000", async () => {
  const { precioRedondo, precioVenta } = await import("./precios");
  assert.equal(precioRedondo(35227), 35000);
  assert.equal(precioRedondo(15430), 15400);
  assert.equal(precioRedondo(1237), 1250);
  assert.equal(precioVenta(32600, 8), 35000);
});

test("fotos reales por producto y video de cómo armamos", async () => {
  const { fotoRealDe, fotosReales } = await import("./galeria");
  assert.equal(fotoRealDe("almendras 500 g")?.url, "/img/reales/real-almendras-500.jpg");
  assert.equal(fotoRealDe("Castañas de cajú W4")?.url, "/img/reales/real-caju.jpg");
  assert.equal(fotoRealDe("granola proteica")?.url, "/img/reales/real-granola-proteica.jpg");
  assert.equal(fotoRealDe("tostadas de arroz"), null);
  assert.ok(fotosReales()[0].url.endsWith(".mp4"));
  const { planWhatsapp, cuerpoGraph } = await import("./whatsapp-interactivo");
  const s = planWhatsapp({ texto: "Te paso", fotos: [{ url: "https://x/video/a.mp4", pie: "Así armamos" }] } as never, null as never);
  assert.equal(s[0].tipo, "video");
  assert.equal((cuerpoGraph(s[0], "549") as { type: string }).type, "video");
});

// Captación orgánica: elegir a quién escribir y no repetir lecciones.
import { bloqueLecciones, celular, elegirHoy, parecidas, puntajeRubro } from "./organico-reglas";

test("celular: lo que viene de Google queda en formato WhatsApp", () => {
  assert.equal(celular("+54 3541 64-2177"), "5493541642177");
  assert.equal(celular("+54 9 351 808-0305"), "5493518080305");
  assert.equal(celular("0351 15 559-0099"), "5493515590099");
  assert.equal(celular("011 4647-3089"), "5491146473089");
  assert.equal(celular("4647-3089"), null);
  assert.equal(celular(""), null);
});

test("elegirHoy: reparte entre rubros, prefiere el que responde y no pasa el tope por rubro", () => {
  const c = (rubro: string, n: number) => Array.from({ length: n }, (_, i) => ({ telefono: `${rubro}${i}`, negocio: `${rubro} ${i}`, rubro, localidad: null, rating: 5 - i * 0.1, resenas: 100 - i }));
  const candidatos = [...c("dietética", 10), ...c("gimnasio", 10), ...c("hotel", 10)];
  const resultados = [
    { rubro: "dietética", enviados: 20, respondieron: 8 },
    { rubro: "gimnasio", enviados: 20, respondieron: 1 },
    { rubro: "hotel", enviados: 0, respondieron: 0 },
  ];
  const hoy = elegirHoy(candidatos, resultados, 8, () => 0.5);
  assert.equal(hoy.length, 8);
  const porRubro = (r: string) => hoy.filter((h) => h.rubro === r).length;
  assert.ok(porRubro("dietética") <= 4 && porRubro("dietética") >= 3);
  assert.ok(porRubro("gimnasio") >= 1, "el que menos responde sigue recibiendo algo");
  assert.equal(hoy[0].rubro, "dietética");
  assert.equal(hoy.find((h) => h.rubro === "dietética")?.negocio, "dietética 0", "dentro del rubro, el mejor puntuado primero");
  assert.ok(puntajeRubro(resultados[0]) > puntajeRubro(resultados[2]) && puntajeRubro(resultados[2]) > puntajeRubro(resultados[1]));
});

test("elegirHoy: con pocos candidatos no inventa ni repite", () => {
  const hoy = elegirHoy([{ telefono: "1", negocio: "a", rubro: "x", localidad: null, rating: null, resenas: null }], [], 8, () => 0);
  assert.equal(hoy.length, 1);
});

test("lecciones: parecidas detecta la misma regla dicha distinto y el bloque entra a las instrucciones", () => {
  assert.ok(parecidas("Cuando pregunta el precio del mix, dale el precio y ofrecé la Despensa en la misma frase", "Si pregunta precio del mix: precio y la Despensa en la misma frase"));
  assert.ok(!parecidas("Cuando pregunta el precio del mix, dale el precio", "Pedí la dirección antes de hablar de pago"));
  assert.equal(bloqueLecciones([]), "");
  const b = bloqueLecciones([{ texto: "Pedí la dirección apenas dice «lo quiero»", evidencia: "3 charlas" }]);
  assert.ok(b.includes("LO QUE APRENDIMOS") && b.includes("- Pedí la dirección apenas dice «lo quiero» (3 charlas)"));
});

// Temporadas: qué fecha rige y qué pide la gente.
import { bloqueTemporada, demanda, diasHasta, proximaTemporada, temporadaActual } from "./temporada";

test("temporada: Navidad rige en noviembre y diciembre, con los días que faltan", () => {
  const nov = new Date("2026-11-10T15:00:00Z");
  assert.equal(temporadaActual(nov)?.id, "navidad");
  assert.equal(diasHasta(temporadaActual(nov)!, nov), 44);
  assert.ok(bloqueTemporada(nov).includes("NAVIDAD") && bloqueTemporada(nov).includes("faltan 44 días"));
  assert.equal(temporadaActual(new Date("2027-01-10T15:00:00Z"))?.id, "verano");
  assert.equal(temporadaActual(new Date("2026-06-10T15:00:00Z")), null);
  assert.equal(temporadaActual(new Date("2026-10-22T15:00:00Z"))?.id, "navidad");
  assert.equal(proximaTemporada(new Date("2026-12-20T15:00:00Z"))?.t.id, "verano");
});

test("temporada: el pan dulce lleva al combo navideño y la demanda cuenta lo que piden", () => {
  assert.equal(temaDe("nueces para el pan dulce de fin de año")?.id, "navidad");
  assert.equal(temaDe("quiero nueces")?.id, "frutos-secos");
  const d = demanda(["Precio de nueces?", "nuez x kilo", "almendras y nueces", "algo sin TACC"]);
  assert.deepEqual(d[0], { que: "nuez", veces: 3 });
  assert.ok(d.some((x) => x.que === "sin TACC"));
});

// Salud de las tareas automáticas.
import { tareasVencidas } from "./salud-reglas";

test("salud: avisa la tarea del día que no corrió y no molesta antes de hora ni el domingo", () => {
  const jueves11 = new Date("2026-10-22T14:30:00Z"); // 11:30 en Córdoba
  const hoy = (h: number) => new Date(Date.UTC(2026, 9, 22, h + 3, 0));
  const corridas = [
    { nombre: "listas", ok: true, detalle: null, fecha: hoy(7.67) },
    { nombre: "organico", ok: true, detalle: null, fecha: hoy(9) },
    { nombre: "ml", ok: true, detalle: null, fecha: hoy(9.25) },
    { nombre: "reactivacion", ok: false, detalle: "error", fecha: hoy(9.5) },
    { nombre: "radar", ok: true, detalle: null, fecha: new Date(jueves11.getTime() - 10 * 60_000) },
  ];
  const v = tareasVencidas(corridas, jueves11).map((t) => t.nombre);
  assert.deepEqual(v, ["reactivacion"], "la que falló sí; el seguimiento (11:00) todavía tiene margen hasta las 12");
  assert.ok(tareasVencidas(corridas, new Date("2026-10-22T15:30:00Z")).some((t) => t.nombre === "seguimiento"));
  const domingo = new Date("2026-10-25T15:00:00Z");
  assert.deepEqual(tareasVencidas([{ nombre: "radar", ok: true, detalle: null, fecha: domingo }], domingo).map((t) => t.nombre), []);
});

import { costoDePresentacion } from "./listas-presentacion";
test("lista La Granja: el precio por kilo se lleva a la presentación chica", () => {
  assert.equal(costoDePresentacion(10933, 2734, 250), 2733); // cacao 250 g
  assert.equal(costoDePresentacion(29362, 14681, 500), 14681); // almendras 500 g
  assert.equal(costoDePresentacion(31000, 14681, 500), 15500); // subió la lista: el medio kilo sube igual
  assert.equal(costoDePresentacion(29362, 29362, 1000), 29362); // el kilo queda igual
  assert.equal(costoDePresentacion(2162, 2162, 400), 2162); // por unidad: no se toca
});

import { resumenPedido, textoRecompra } from "./recompra-reglas";
test("recompra: resumen corto para la plantilla y códigos exactos para el vendedor", () => {
  const despensa = [
    { codigo: "TG-MIXCG", producto: "Mix Clásico con cajú y girasol", presentacion: "x 1 kg", cantidad: 1, comboSlug: "despensa-4-kilos" },
    { codigo: "LG-DATIL", producto: "Dátiles", presentacion: "x 1 kg", cantidad: 1, comboSlug: "despensa-4-kilos" },
  ];
  assert.equal(resumenPedido(despensa), "la Despensa de 4 kilos");
  const sueltos = [
    { codigo: "TG-NUEZ", producto: "Nuez Mariposa", presentacion: "x 1 kg", cantidad: 1, comboSlug: null },
    { codigo: "TG-PASAS", producto: "Pasas negras", presentacion: "x 1 kg", cantidad: 2, comboSlug: null },
    { codigo: "LG-AVENA", producto: "Avena", presentacion: "x 1 kg", cantidad: 1, comboSlug: null },
  ];
  assert.equal(resumenPedido(sueltos), "tu pedido (nuez mariposa, pasas negras y más)");
  const t = textoRecompra({ numero: "AS-00010", id: 10, nombre: "Ariel", items: sueltos, direccion: "Gran Malvina 2439, Villa Carlos Paz", total: "$ 57.663" });
  assert.ok(t.startsWith("[Recompra pedido AS-00010 (id 10)]"));
  assert.ok(t.includes("codigo TG-PASAS · Pasas negras x 1 kg x 2") && t.includes("Gran Malvina 2439"));
  assert.ok(textoRecompra({ numero: "AS-1", id: 1, nombre: "Ana", items: despensa, direccion: "x", total: "$1" }).includes("combo slug despensa-4-kilos x 1"));
});

import { netoCanal, precioCanal } from "./canales";
test("canales: el precio de Mercado Libre y PedidosYa deja al menos lo mismo que la web", () => {
  for (const web of [6500, 15400, 25000, 35000, 38500, 83000]) {
    for (const canal of ["mercadolibre", "mercadolibre-premium", "pedidosya"] as const) {
      const p = precioCanal(web, canal);
      assert.ok(netoCanal(p, canal) >= web, `${canal} ${web} → ${p} deja ${netoCanal(p, canal)}`);
      assert.ok(p % 100 === 0);
    }
  }
  // La Despensa ($35.000): en ML Clásica tiene que salir bastante más cara por el envío gratis y la comisión.
  const despensa = precioCanal(35000, "mercadolibre");
  assert.ok(despensa > 48000 && despensa < 56000, String(despensa));
});

test("la primera respuesta se presenta como asistente con IA, una sola vez", async () => {
  const { conPresentacion } = await import("./whatsapp-saludo");
  const a = conPresentacion("¡Hola Quique! El mix sale $15.400 el kilo. ¿Para tu casa o un negocio?");
  assert.ok(a.startsWith("¡Hola Quique! Soy el asistente con IA de Acopio"));
  assert.ok(a.endsWith("¿Para tu casa o un negocio?"));
  assert.ok(conPresentacion("El mix sale $15.400. ¿Te lo separo?").startsWith("¡Hola! Soy el asistente con IA"));
  assert.equal(conPresentacion(a), a);
});

test("Mercado Libre: la respuesta no lleva contacto ni links y nunca «perfecto»", async () => {
  const { textoRespuestaMl } = await import("./mercadolibre-reglas");
  assert.equal(textoRespuestaMl("¡Hola! Escribinos al WhatsApp 3541 123456"), null);
  assert.equal(textoRespuestaMl("¡Hola! Miralo en www.acopiosaludable.com"), null);
  assert.equal(textoRespuestaMl("¡Hola! Perfecto, trae 1 kg de cada uno. Saludos, Acopio Saludable"), "¡Hola! trae 1 kg de cada uno. Saludos, Acopio Saludable");
  assert.ok(textoRespuestaMl("¡Hola! Sí, el mix trae nueces, almendras y cajú. Podés comprarlo ahora y te llega por Mercado Envíos."));
});

test("ML: el precio mínimo deja la ganancia mínima y no sube si ya alcanza", async () => {
  const { precioMinimoMl } = await import("./mercadolibre-reglas");
  const mix3 = precioMinimoMl(25800); // Mix con cajú 3 kg
  assert.ok(mix3 <= 55000, `mix 3 kg hoy a $55.000 no se toca (mínimo ${mix3})`);
  assert.ok(precioMinimoMl(30000) > precioMinimoMl(25800));
  assert.equal(precioMinimoMl(25800) % 500, 0);
});

test("Plantilla dietética: regla mayorista única y cobro anticipado", async () => {
  const { contextoProspecto } = await import("./whatsapp-plantillas");
  const c = contextoProspecto("dietética", "Dietética Sol");
  assert.match(c, /−10% desde 5 kg, −15% desde 10 kg y −20% desde 25 kg/);
  assert.match(c, /mínimo \$60\.000/);
  assert.doesNotMatch(c, /\$10\.000 el kilo|\$50\.000|pagando al recibir|martes Punilla/);
});

test("ML: fila de precios marca la promoción y el precio final bajo el piso", async () => {
  const { filaPrecioMl } = await import("./mercadolibre-reglas");
  const it = { id: "MLA1", title: "Alacena 3 kg", price: 58000, original_price: null, listing_type_id: "gold_special" };
  const f = filaPrecioMl(it, "AS-ALACENA-3KG", { amount: 52200, regular_amount: 58000, metadata: { promotion_type: "DEAL" } }, 65000);
  assert.deepEqual([f.lista, f.final, f.promo, f.promoTipo, f.bajoPiso], [58000, 52200, true, "DEAL", true]);
  const sin = filaPrecioMl({ ...it, price: 70000 }, "AS-ALACENA-3KG", null, 65000);
  assert.deepEqual([sin.lista, sin.final, sin.promo, sin.bajoPiso], [70000, 70000, false, false]);
  const conOriginal = filaPrecioMl({ ...it, price: 52200, original_price: 58000 }, "X", null, null);
  assert.deepEqual([conOriginal.lista, conOriginal.final, conOriginal.promo, conOriginal.bajoPiso], [58000, 52200, true, false]);
});

test("estadoAgente: descanso, pendiente, ok, atrasado y falla", async () => {
  const { AGENTES, estadoAgente } = await import("./agentes");
  const logi = AGENTES.find((a) => a.id === "logistica")!;
  assert.ok(AGENTES.every((a) => a.dias.length === 7), "todos trabajan todos los días");
  assert.equal(estadoAgente({ ...logi, dias: [1, 2, 3, 4, 5, 6] }, { dia: 0, min: 600, fecha: "2026-10-25" }, null).estado, "descanso");
  assert.equal(estadoAgente(logi, { dia: 1, min: 7 * 60, fecha: "2026-10-26" }, null).estado, "pendiente");
  assert.equal(estadoAgente(logi, { dia: 1, min: 9 * 60, fecha: "2026-10-26" }, { fecha: "2026-10-26", hora: "8:20", ok: true }).estado, "ok");
  assert.equal(estadoAgente(logi, { dia: 1, min: 11 * 60, fecha: "2026-10-26" }, { fecha: "2026-10-24", hora: "8:20", ok: true }).estado, "atrasado");
  assert.equal(estadoAgente(logi, { dia: 1, min: 9 * 60, fecha: "2026-10-26" }, { fecha: "2026-10-26", hora: "8:20", ok: false }).estado, "falla");
  assert.equal(new Set(AGENTES.map((a) => a.id)).size, AGENTES.length);
});

test("separarOrden: saca la línea ORDEN y deja la respuesta", async () => {
  const { separarOrden } = await import("./agentes");
  assert.deepEqual(separarOrden("Dale, lo hago.\nORDEN: priorizar gimnasios de Carlos Paz"), { respuesta: "Dale, lo hago.", orden: "priorizar gimnasios de Carlos Paz" });
  assert.deepEqual(separarOrden("Vamos bien, 3 pedidos hoy."), { respuesta: "Vamos bien, 3 pedidos hoy.", orden: null });
});


test("pedido de la web: se arma completo (5 ítems) y redondo", async () => {
  const { esPedidoWeb, leerPedidoWeb, resolverPedidoWeb } = await import("./pedido-web");
  const t = "Hola! Quiero hacer este pedido de la web:\n• 1 × Mix Clásico con cajú: $ 15.400\n• 1 × Granola proteica Sport: $ 14.200\n• 1 × Sal Rosada del Himalaya: $ 2.600\n• 1 × Sal Marina Fina yodada: $ 2.400\n• 1 × Pasas de uva negras sin semilla: $ 3.700\nTotal: $ 38.300";
  assert.ok(esPedidoWeb(t));
  const l = leerPedidoWeb(t);
  assert.equal(l.length, 5);
  assert.deepEqual(l[4], { cantidad: 1, nombre: "Pasas de uva negras sin semilla", subtotal: 3700 });
  const productos = [
    { codigo: "MIX", producto: "Mix Clásico con cajú", presentacion: "x 1 kg", precio: 15400 },
    { codigo: "GR1", producto: "Granola proteica Sport", presentacion: "x 1 kg", precio: 14200 },
    { codigo: "GR5", producto: "Granola proteica Sport", presentacion: "x 500 g", precio: 7600 },
    { codigo: "SR", producto: "Sal Rosada del Himalaya", presentacion: "x500gr", precio: 2600 },
    { codigo: "SM", producto: "Sal Marina Fina yodada", presentacion: "x500gr", precio: 2400 },
    { codigo: "PAS", producto: "Pasas de uva negras sin semilla", presentacion: "x 500 g", precio: 3700 },
  ];
  const r = resolverPedidoWeb(l, productos, []);
  assert.deepEqual(r.faltan, []);
  assert.deepEqual(r.elegidos.map((e) => e.id), ["MIX", "GR1", "SR", "SM", "PAS"]);
  const { aplicarReglas } = await import("./envios/cotizar");
  const op = aplicarReglas([{ id: "x", proveedor: "propia", modalidad: "propia", nombre: "Te lo llevamos", costo: 16304.35, plazo: "" } as never], 38300, null);
  assert.equal(op[0].precio % 100, 0);
});


test("envío a Córdoba Capital con entrega propia: $15.000 fijo, pague como pague", () => {
  assert.equal(envioQueSeCobra(15000, "MERCADOPAGO", 8, true), 15000);
  assert.equal(envioQueSeCobra(15000, "TRANSFERENCIA", 8, true), 15000);
  assert.equal(envioQueSeCobra(15000, "MERCADOPAGO", 8) % 100, 0);
});

test("pizarra de armado: gramos, totales y nombre corto", async () => {
  const { gramosDe, totalesDeArmado, nombreCorto } = await import("./armado");
  assert.equal(gramosDe("x 1 kg"), 1000);
  assert.equal(gramosDe("x500gr Fraccionada"), 500);
  assert.equal(gramosDe("Unidad"), null);
  assert.equal(nombreCorto("Lorenzo Albert"), "Lorenzo A.");
  assert.equal(nombreCorto("Mabel (tía)"), "Mabel T.");
  assert.equal(nombreCorto("Mabel ("), "Mabel");
  assert.equal(gramosDe("1/2 kilo"), 500);
  assert.equal(gramosDe("Fraccionada x 250 Grs"), 250);
  const base = { id: 1, codigo: "AS-00001", cliente: "A", zona: "", cobrar: "", pagado: true, notas: null, estado: "PAGADO", hace: "", mapa: null, direccion: "", telefono: "", total: 0 };
  const t = totalesDeArmado([
    { ...base, items: [{ producto: "Granola", presentacion: "x 1 kg", cantidad: 1, combo: null }] },
    { ...base, id: 2, items: [{ producto: "Granola", presentacion: "x 500 g", cantidad: 1, combo: null }] },
  ]);
  assert.match(t[0].texto, /^1,5 kg/);
});

test("vendedor: el mix con cajú mantiene el mismo producto y precio que pasó en la lista", () => {
  const txt = readFileSync("src/lib/vendedor.ts", "utf8");
  assert.ok(txt.includes("MISMO MIX, MISMO PRECIO"));
  assert.ok(txt.includes("Mix Clásico con cajú y girasol"));
});

test("vendedor: ningún texto modelo le hace decir al bot que se paga al recibir", () => {
  const txt = readFileSync("src/lib/vendedor.ts", "utf8");
  // Frases entre «» que el bot copia tal cual: ninguna puede prometer pago al recibir (política 28/10).
  const frases = txt.match(/«[^»]*»/g) ?? [];
  // («recién ahí pagás» aparece solo como frase prohibida: «Nunca digas…»).
  const malas = frases.filter((f) => /(la |lo |y )pag[aá]s al recibir/i.test(f));
  assert.deepEqual(malas, []);
});

test("mapa: link de navegación con la dirección completa y sin repetir", async () => {
  const { linkMapa, direccionCompleta, linkRuta } = await import("./mapa");
  assert.equal(direccionCompleta("Virgen de Lourdes 4480", "Cordoba", "Córdoba"), "Virgen de Lourdes 4480, Cordoba, Argentina");
  assert.equal(direccionCompleta("San Martín 100", "Villa Carlos Paz", null), "San Martín 100, Villa Carlos Paz, Córdoba, Argentina");
  assert.match(linkMapa("Virgen de Lourdes 4480", "Cordoba", "Córdoba") ?? "", /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=Virgen/);
  assert.equal(linkMapa("", "Carlos Paz"), null);
  assert.match(linkRuta(["A 1, X", "B 2, Y"]) ?? "", /destination=B.*waypoints=A/);
});

test("reparto: Córdoba al final y la parada con mapa, cobro y link para marcar entregado", async () => {
  const { ordenarParadas, textoParada } = await import("./reparto");
  const o = ordenarParadas([{ zona: "Cordoba · envío $ 16.304" }, { zona: "Villa Carlos Paz · sin cargo" }]);
  assert.match(o[0].zona, /Carlos Paz/);
  const t = textoParada({ id: 28, codigo: "AS-00028", cliente: "Lorenzo A.", zona: "Cordoba", cobrar: "Ya pagó", pagado: true, notas: "Casa blanca", items: [{ producto: "Mix Clásico con cajú", presentacion: "x 1 kg", cantidad: 1, combo: null }], estado: "PAGADO", hace: "", mapa: "https://maps/x", direccion: "Virgen de Lourdes 4480, Cordoba, Argentina", telefono: "+5493517623124", total: 54604 }, 0, 4);
  assert.match(t, /Parada 1 de 4 · AS-00028/);
  assert.match(t, /wa\.me\/5493517623124/);
  assert.match(t, /1 × Mix Clásico con cajú 1 kg/);
  assert.match(t, /admin\/pedidos\/28/);
});

test("comprobante: lee el monto en cualquier formato y acepta diferencias chicas", async () => {
  const { leerRespuestaComprobante, coincideMonto } = await import("./comprobante");
  assert.equal(leerRespuestaComprobante('{"esComprobante": true, "monto": "$ 47.660,00", "fecha": "23/10/2026"}')?.monto, 47660);
  assert.equal(leerRespuestaComprobante('Acá va: {"esComprobante": true, "monto": 54604.35}')?.monto, 54604);
  assert.equal(leerRespuestaComprobante('{"esComprobante": true, "monto": "47.660"}')?.monto, 47660);
  assert.equal(leerRespuestaComprobante("no es json"), null);
  assert.ok(coincideMonto(47660, 47660));
  assert.ok(coincideMonto(54604, 54604));
  assert.ok(!coincideMonto(10000, 84700));
});

test("boleta y resúmenes: mapea renglones de La Granja y lee el resumen", async () => {
  const { mapearRenglon } = await import("./boleta");
  const { leerResumen } = await import("./resumen-charlas");
  const { direccionDeUbicacion } = await import("./direccion-cliente");
  assert.ok(mapearRenglon({ codigo: "009-037", descripcion: "PASAS DE UVA", precio_unitario: 3150 }).length > 0);
  assert.deepEqual(mapearRenglon({ descripcion: "TORNILLOS", precio_unitario: 100 }), []);
  assert.deepEqual(leerResumen('{"calor":"Frío","resumen":"Pidió precios y no contestó"}'), { calor: "frio", texto: "Pidió precios y no contestó" });
  assert.equal(direccionDeUbicacion("Te mando mi ubicación: Bar Tifozzi, 9 de Julio 7 (-31.42, -64.49)"), "Bar Tifozzi, 9 de Julio 7");
  assert.equal(direccionDeUbicacion("Te mando mi ubicación: sin dirección (-31.42, -64.49)"), "-31.42,-64.49");
});

test("resumen: lee «calor | resumen» y rescata formatos sueltos", async () => {
  const { leerResumen } = await import("./resumen-charlas");
  assert.deepEqual(leerResumen("caliente | Quiere la Despensa; mandarle el link de pago"), { calor: "caliente", texto: "Quiere la Despensa; mandarle el link de pago" });
  assert.equal(leerResumen("calor: tibio, resumen: Pidió precios del mix")?.texto, "Pidió precios del mix");
});

test("entrega: las notas no repiten horario ni referencia", async () => {
  const { unirNotas } = await import("./pedido-calculos");
  const n1 = unirNotas("Venta por WhatsApp", "13 a 14 hs");
  const n2 = unirNotas(n1, "Preferencia entre 13 y 14 hs", "Paralelo a la colectora");
  const n3 = unirNotas(n2, "Preferencia entre 13 y 14 hs");
  assert.equal(n3, "Horario: Preferencia entre 13 y 14 hs · Referencia: Paralelo a la colectora · Venta por WhatsApp");
});

test("teléfono: cualquier forma de escribirlo va al mismo celular", async () => {
  const { telefonoWa } = await import("./telefono");
  assert.equal(telefonoWa("0351 15 555-1234"), "5493515551234");
  assert.equal(telefonoWa("+54 9 351 555-1234"), "5493515551234");
  assert.equal(telefonoWa("3515551234"), "5493515551234");
  assert.equal(telefonoWa("03541 15 51-9630"), "5493541519630");
  assert.equal(telefonoWa("+5493517623124"), "5493517623124");
  assert.equal(telefonoWa("1234"), null);
});

test("bot: nunca «perfecto»", async () => {
  const { sinPerfecto } = await import("./sin-perfecto");
  assert.equal(sinPerfecto("¡Perfecto! Te lo llevo"), "¡Genial! Te lo llevo");
  assert.equal(sinPerfecto("Quedó perfecto."), "Quedó genial.");
});

test("vendedor: después de la lista por kilo propone un carrito armado y no promete mañana sin zona", () => {
  const txt = readFileSync("src/lib/vendedor.ts", "utf8");
  assert.ok(txt.includes("CARRITO ARMADO"));
  assert.ok(txt.includes("Si no sabés la zona, no prometas mañana"));
  assert.ok(!txt.includes("El combo NO va en ese primer mensaje"));
  // La reactivación no lleva un precio escrito a mano (la Despensa sale $35.500, no $35.000).
  assert.ok(!txt.includes("la Despensa de 4 kilos a $35.000"));
});

test("canales: Rappi deja al menos lo que deja la web", async () => {
  const { precioCanal, netoCanal } = await import("./canales");
  const p = precioCanal(35500, "rappi");
  assert.ok(p > 35500 && netoCanal(p, "rappi") >= 35500);
});

import { dioPorCerrada } from "./whatsapp-recordatorio";
test("venta dada por hecha sin pedido: se avisa (Olga 26/10)", () => {
  assert.ok(dioPorCerrada("Dale, Olga. Quedó la Despensa de 4 kilos por $35.500, con entrega en Esparta 437 y Beker, y la pagás al recibir. Gracias por la compra, que la disfrutes."));
  assert.ok(dioPorCerrada("Tu pedido queda agendado para el jueves."));
  assert.ok(!dioPorCerrada("La Alacena sale $45.000. ¿Te la separo?"));
});

test("recordatorio: carrito con total real o propuesta concreta, nunca la duda genérica si hay precio", () => {
  const conCarrito = planRecordatorio({ nombre: "Sara Muñoz", anuncioTitulo: null, pedido: "/carrito?p=TG-NUEZ*1" }, { total: 25000, transferencia: 23000, resumen: "Nuez Mariposa" }) as { cuerpo: string; botones: { id: string }[] };
  assert.equal(conCarrito.cuerpo, "¡Hola Sara! Te guardamos tu pedido: Nuez Mariposa, $25.000 ($23.000 por transferencia). ¿Te lo separamos?");
  assert.equal(conCarrito.botones[0].id, "op|Sí, separalo");
  const oferta = { nombre: "Alacena de frutos secos", total: 45000, transferencia: 41400, resumen: "1 kg de nuez, 1 kg de mix con cajú y 1 kg de pasas" };
  const sinNada = planRecordatorio({ nombre: "Azu", anuncioTitulo: "La ves antes de pagar · Carlos Paz", pedido: null }, null, oferta) as { cuerpo: string; botones: { titulo: string }[] };
  assert.match(sinNada.cuerpo, /^¡Hola Azu! Para arrancar te propongo la Alacena de frutos secos: .*\$45\.000 \(\$41\.400 por transferencia\)\. ¿Te la separamos\?$/);
  assert.doesNotMatch(sinNada.cuerpo, /sin cargo|mañana|duda/);
  assert.ok(sinNada.botones.some((b) => /ciudad/.test(b.titulo)));
  // Sin precio a mano, sale el texto de siempre.
  assert.match((planRecordatorio({ nombre: null, anuncioTitulo: null, pedido: null }) as { cuerpo: string }).cuerpo, /duda/);
});

import { admiteLead, LEADS_MAX_15MIN, LEADS_MAX_TELEFONO_DIA } from "./oferta-sistema";
test("formulario /agentes: freno general cada 15 min y por teléfono por día", () => {
  assert.ok(admiteLead(0, 0));
  assert.ok(admiteLead(LEADS_MAX_15MIN - 1, LEADS_MAX_TELEFONO_DIA - 1));
  assert.ok(!admiteLead(LEADS_MAX_15MIN, 0));
  assert.ok(!admiteLead(0, LEADS_MAX_TELEFONO_DIA));
});

test("vendedor: detecta una lista de productos para contestar cada uno", async () => {
  const { listaDeProductos } = await import("./whatsapp-interactivo");
  const sara = listaDeProductos("Sii. Pero me gusta armar mi propio pedido\nPor ejemplo necesito saber precio\nDátiles  por kg\nCacao amargo al 80 % /en polvo y tableta para derretir \nHarina de almendras \nHarina de maní\nHarina de coco \nArándanos pasas\nManteca de mani\nAceite de coco");
  assert.equal(sara.length, 9, sara.join(" | ")); // cacao en polvo y en tableta van por separado
  assert.equal(sara[0], "Dátiles");
  assert.equal(listaDeProductos("Hola, precio de nueces, almendras y castañas").length, 3);
  assert.deepEqual(listaDeProductos("Hola quiero la despensa de 4 kilos"), []);
  assert.deepEqual(listaDeProductos("[Mandó una foto: comprobante de transferencia\n- Al alias acopio.saludable\n- Con motivo Cuotas\n- Sin producto ni combo identificable.]"), []);
});


test("vendedor: una «lista» sin productos no reemplaza la respuesta (Graciela 31/10)", async () => {
  const { listaDeVerdad } = await import("./whatsapp-interactivo");
  assert.equal(listaDeVerdad(0, 3), false); // «Mandame tu ubicación, WhatsApp y nos hablamos»
  assert.equal(listaDeVerdad(1, 4), false);
  assert.equal(listaDeVerdad(2, 4), true);
  assert.equal(listaDeVerdad(5, 5), true);
});

test("cobro anticipado: «lo pienso» no promete pagar al recibir", () => {
  const plan = planSinApuro("Ana", "Acopio Saludable", "https://x/foto.jpg");
  const texto = JSON.stringify(plan);
  assert.doesNotMatch(texto, /reci[eé]n ah[ií] (pag|decid)|decid[ií]s si lo pag|sin compromiso|en tu puerta|al recibir|antes de pagar|tra[eé]melo/i);
  assert.ok(plan.some((s) => s.tipo === "imagen"));
});

test("prospección del sistema: exclusiones, mails válidos y ventana de envío", async () => {
  const o = await import("./oferta-sistema");
  assert.equal(o.excluido("Clínica Mottura", "esteticamottura.com"), true);
  assert.equal(o.excluido("Azul Colchones", "azulcolchones.com"), true);
  assert.equal(o.excluido("Distribuidora del Centro", "districentro.com.ar"), false);
  assert.equal(o.emailValido("ventas@districentro.com.ar"), true);
  assert.equal(o.emailValido("noreply@x.com"), false);
  assert.equal(o.emailValido("sin-arroba"), false);
  // Miércoles 28/10/2026 11:00 en Córdoba = 14:00 UTC: en horario. Sábado, no. Miércoles 20 hs, no.
  assert.equal(o.enVentanaDeEnvio(new Date("2026-10-28T14:00:00Z")), true);
  assert.equal(o.enVentanaDeEnvio(new Date("2026-10-31T14:00:00Z")), false);
  assert.equal(o.enVentanaDeEnvio(new Date("2026-10-28T23:00:00Z")), false);
  assert.equal(o.diasHabiles(new Date("2026-10-30T12:00:00Z"), new Date("2026-11-05T12:00:00Z")), 4);
});

test("harinar: lee precios de Pediwa y compara por kilo con La Granja", async () => {
  const { productosDeHtml, comparar } = await import("./harinar");
  const html = `<div><h5>SEMILLA DE GIRASOL PELADA X KG</h5><span>$3.019,30</span></div><div><p>SEMILLA DE LINO X 1 KG</p><b>$2.850,39</b></div><div>NUECES BLANCAS MARIPOZAS X 1 KG</div><div>$17.008,50</div>`;
  const h = productosDeHtml(html).map(([n, p]) => [n, p, "x"] as [string, number, string]);
  assert.equal(h.length, 3);
  assert.equal(h[0][1], 3019.3);
  const g: [string, string, number][] = [["1", "GIRASOL PELADO X 1 KG", 4503], ["2", "LINO SEMILLAS X 1 KG", 2500], ["3", "NUEZ MARIPOSA LIGHT X 1 KG", 16500]];
  const c = comparar(h, g);
  const gir = c.find((x) => x.producto === "girasol")!;
  assert.equal(gir.conviene, "Harinar");
  assert.equal(gir.alerta, null);
  const lino = c.find((x) => x.producto === "lino")!;
  assert.equal(lino.conviene, "La Granja");
  assert.match(lino.alerta ?? "", /volver a comprarlo/);
});

import { esSinTacc, textosSeguros } from "./filtros-producto";

test("sin TACC: solo envasado con marca, nunca fraccionado ni sin marca", () => {
  assert.equal(esSinTacc({ producto: "Alfajores de chocolate sin TACC", presentacion: "x 6 unidades", marca: "Yuka" }), true);
  assert.equal(esSinTacc({ producto: "Pasas de uva con chocolate sin TACC", presentacion: "x 400 g", marca: "" }), false);
  assert.equal(esSinTacc({ producto: "Miel Organica Mistol sin tacc", presentacion: "x 480 gs", marca: "Sin marca" }), false);
  assert.equal(esSinTacc({ producto: "Harina de arroz sin TACC", presentacion: "x1kg Fraccionada", marca: "Granja" }), false);
  assert.equal(esSinTacc({ producto: "Nuez Mariposa", presentacion: "x 1 kg", marca: "Yuka" }), false);
  const t = textosSeguros({ producto: "Pasas de uva con chocolate sin Tacc", presentacion: "x 400 g", marca: "" });
  assert.equal(t.producto, "Pasas de uva con chocolate");
  assert.equal(textosSeguros({ producto: "Alfajores sin TACC", presentacion: "x 6", marca: "Yuka" }).producto, "Alfajores sin TACC");
});

import { presupuestoMesa } from "./mesa-dulce";

test("mesa dulce: redondea envases hacia arriba y suma con el precio vigente", () => {
  const prods = [
    { codigo: "A", precio: 1000, contenido: 500 },
    { codigo: "B", precio: 2000, contenido: null },
  ];
  const r = presupuestoMesa(12, prods, [
    { codigo: "A", gramosPorPersona: 50, para: "" },
    { codigo: "B", gramosPorPersona: 10, para: "" },
    { codigo: "C", gramosPorPersona: 10, para: "" },
  ]);
  assert.equal(r.lineas.length, 1); // sin contenido o sin producto, no se presupuesta
  assert.equal(r.lineas[0].gramos, 600);
  assert.equal(r.lineas[0].envases, 2);
  assert.equal(r.total, 2000);
});

test("mayorista: escalera con piso de costo + 25% y −10% fijo en almendras, cajú, maní, banana y ciruelas", async () => {
  const { precioMayorista, topeEscalon } = await import("./mayorista-precios");
  // Sin problema de margen: escalera completa.
  assert.deepEqual(precioMayorista(10000, 5000, "Dátiles Deglet Nour", 15), { precio: 8500, pct: 15 });
  // Coco: al −15% quedaría bajo costo + 25% → se recorta.
  const coco = precioMayorista(12700, 9500, "Coco rallado", 15);
  assert.ok(coco.precio >= 9500 * 1.25 && coco.pct < 15, JSON.stringify(coco));
  // Piso arriba de la lista: precio de lista, sin descuento.
  assert.deepEqual(precioMayorista(10000, 9000, "Lentejas", 15), { precio: 10000, pct: 0 });
  // Fijo −10%: no pasa de 10 aunque el escalón sea 15; los mixes y la harina de maní siguen la escalera.
  assert.equal(topeEscalon("Almendras Non Pareil x 500 g", 15), 10);
  assert.equal(topeEscalon("Castanas Caju x500g Fraccionada", 15), 10);
  assert.equal(topeEscalon("Maní con sal", 15), 10);
  assert.equal(topeEscalon("Mix de cajú y banana chips", 15), 15);
  assert.equal(topeEscalon("Harina de maní", 15), 15);
  // Mix Clásico con cajú y girasol: −10% fijo (los demás Mix Clásico siguen la escalera).
  assert.equal(topeEscalon("Mix Clásico con cajú y girasol", 15), 10);
  assert.equal(topeEscalon("Mix Clasico con caju y girasol", 20), 10);
  assert.equal(topeEscalon("Mix Clásico con cajú", 15), 15);
  assert.deepEqual(precioMayorista(12500, 7400, "Mix Clásico con cajú y girasol", 15), { precio: 11300, pct: 10 });
  assert.deepEqual(precioMayorista(6500, 3700, "Mix Clásico con cajú y girasol", 15), { precio: 5900, pct: 10 });
});

import { noPorAhora } from "./whatsapp-interactivo";
test("sin IA: «Más adelante» y «No, gracias» se cierran amable, sin «te escribe Santiago»", () => {
  for (const t of ["Más adelante", "No, gracias", "X ahora No", "por ahora no gracias", "Lo pienso", "no por el momento"]) assert.ok(noPorAhora(t), t);
  for (const t of ["Sí, agendalo", "no tengo el alias", "¿más adelante hay stock?", "no se cuanto sale la nuez", "hola", "no"]) assert.ok(!noPorAhora(t), t);
});

import { pidePreciosPorKilo, textoPreciosPorKilo, MARCA_PRECIOS_POR_KILO } from "./whatsapp-interactivo";
import { pesos as pesosAR } from "./precios";
const transfAR = (precio: number, pct: number) => (pct > 0 ? Math.round((precio * (1 - pct / 100)) / 100) * 100 : null);
test("sin IA: «Quiero precios de frutos secos por kilo» recibe la lista de hoy y la Despensa, con cobro antes", () => {
  for (const t of ["¡Hola! Quiero precios de frutos secos por kilo", "precio x kg?", "cuanto sale el kilo de nuez", "Me pasás la lista de precios por kilo"]) assert.ok(pidePreciosPorKilo(t), t);
  for (const t of ["hola", "Más adelante", "quiero 2 kilos de pasas", "pasame el alias", "precio del envío a Tanti"]) assert.ok(!pidePreciosPorKilo(t), t);
  const kg = (producto: string, precio: number) => ({ producto, precio, contenido: 1, unidad: "kg" });
  const productos = [
    kg("Mix Clásico con cajú y girasol x 1 kg", 12500),
    kg("Mix Clásico con cajú x 1 kg", 15400),
    { producto: "Mix Clásico con cajú x 500 g", precio: 8000, contenido: 500, unidad: "g" },
    kg("Nuez Mariposa blanca light x 1 kg", 25000),
    kg("Pasas de uva rubias x 1 kg", 9000),
    { producto: "Pasas de uva negras sin semilla x 1 kg", precio: 7800, contenido: null, unidad: null },
    kg("Dátiles Deglet Nour con carozo (Argelia) x 1 kg", 11000),
  ];
  const despensa = { precio: 35500, items: ["Mix Clásico con cajú y girasol x 1 kg", "Dátiles Deglet Nour con carozo (Argelia) x 1 kg", "Pasas de uva negras sin semilla x 1 kg", "Mix de semillas para el desayuno x 1 kg"].map((producto) => ({ producto: { producto } })) };
  const t = textoPreciosPorKilo(productos, despensa, 8, pesosAR, transfAR)!;
  assert.ok(t.includes(MARCA_PRECIOS_POR_KILO));
  assert.match(t, /Mix clásico con cajú \$\s?15\.400/);
  assert.match(t, /Mix con cajú y girasol \$\s?12\.500/);
  assert.match(t, /Pasas de uva \$\s?7\.800/);
  assert.match(t, /Despensa de 4 kilos \(Mix Clásico con cajú y girasol, Dátiles/);
  assert.match(t, /\$\s?35\.500, \$\s?32\.700 por transferencia/);
  assert.match(t, /se paga antes del reparto/);
  assert.ok(!/al recibir|recién ahí|ves antes de pagar/i.test(t));
  assert.ok(!t.includes("500 g"));
  assert.equal(textoPreciosPorKilo(productos, null, 8, pesosAR, transfAR), null);
  assert.equal(textoPreciosPorKilo([], despensa, 8, pesosAR, transfAR), null);
});

test("recordatorio: no se insiste a quien dijo «Más adelante» o «Lo pienso»", () => {
  for (const no of ["Más adelante", "Lo pienso", "Lo veo después", "No, gracias", "Por ahora no", "Lo veo tranquila y te escribo"]) assert.ok(clienteDijoQueNo(no), no);
  for (const si of ["Sí, agendalo", "¿Cuánto sale el envío?", "Quiero la despensa", "Busco nueces y pasas rubias", "", null]) assert.ok(!clienteDijoQueNo(si), String(si));
});

test("listaDeProductos: un audio transcripto con etiquetas delante no es una lista", async () => {
  const { listaDeProductos } = await import("./whatsapp-interactivo");
  const t = "<cliente>Vanesa</cliente>\n<anuncio>La ves antes de pagar</anuncio>\n[Mandó un audio que dice: «Hola, ¿cómo estás? Sí, yo lo estaba averiguando para los primeros días, ¿viste? para ver si podía invertir en algo. Pero ustedes, ¿de dónde son?»]";
  assert.deepEqual(listaDeProductos(t), []);
});

test("tiktok-lab: el puntaje premia compartir y retener, y la ganadora tiene que superar 1,5 veces la mediana", async () => {
  const { puntaje, elegirGanadoras } = await import("./tiktok-puntaje");
  assert.ok(puntaje({ vistas: 1000, compartidos: 20, retencion: 0.5 }) > puntaje({ vistas: 1000, likes: 20, retencion: 0.5 }));
  assert.equal(puntaje({ vistas: 0 }), 0);
  const base = { video: "x", receta: "r", gancho: null, ia: false, programado: null, url: null, likes: 0, comentarios: 0, compartidos: 0, guardados: 0, retencion: null, videoUrl: null, promovido: null, nota: null };
  const ahora = new Date("2026-11-02T12:00:00Z");
  const hace = (h: number) => new Date(ahora.getTime() - h * 3600e3);
  const v = (id: number, vistas: number) => ({ ...base, id, vistas, estado: "MEDIDO", puntaje: puntaje({ vistas }), medido: hace(2), creado: hace(26) });
  const g = elegirGanadoras([v(1, 400), v(2, 500), v(3, 2000), v(4, 450)], ahora);
  assert.deepEqual(g.map((x) => x.id), [3]);
  assert.deepEqual(elegirGanadoras([v(1, 200), v(2, 250)], ahora), []);
});

import { cobroRequiereSesion } from "./cobro-permiso";
test("seguridad: dejar un pedido como cobrado (Pagado o Entregado sin pago) es solo de Santiago con sesión", () => {
  assert.ok(cobroRequiereSesion("PAGADO", false));
  assert.ok(cobroRequiereSesion("ENTREGADO", false));
  assert.ok(!cobroRequiereSesion("ENTREGADO", true), "ya pagado: entregarlo no cobra nada");
  for (const e of ["EN_COMPRA", "PREPARADO", "ENVIADO", "CANCELADO"]) assert.ok(!cobroRequiereSesion(e, false), e);
});

