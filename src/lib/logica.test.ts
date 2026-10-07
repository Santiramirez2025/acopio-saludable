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
