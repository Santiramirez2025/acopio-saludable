import assert from "node:assert/strict";
import { test } from "node:test";
import { filasDePdf } from "./listas-pdf-leer";
import { detectarProveedor, parsearLista } from "./listas-pdf";

// PDF mínimo armado a mano: dos renglones de lista con código, nombre y precio en columnas separadas
// (como la lista de La Granja). Sirve para que una actualización de unpdf no cambie lo que lee el robot.
function pdfDePrueba(lineas: { x: number; y: number; t: string }[]): Uint8Array {
  const contenido = lineas.map((l) => `BT /F1 10 Tf ${l.x} ${l.y} Td (${l.t}) Tj ET`).join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

test("lector de PDF: arma renglones por línea y el parser saca código, nombre y precio", async () => {
  const bytes = pdfDePrueba([
    { x: 40, y: 360, t: "PRECIOS MAYORISTAS REFERENCIALES" },
    { x: 40, y: 320, t: "001-201" },
    { x: 110, y: 320, t: "ALPISTE SEMILLAS X 2.5 KG" },
    { x: 420, y: 320, t: "$ 495,88" },
    { x: 40, y: 300, t: "001-202" },
    { x: 110, y: 300, t: "AMAPOLA SEMILLAS X 1 KG" },
    { x: 420, y: 300, t: "$ 17.456,20" },
  ]);
  const { filas, texto } = await filasDePdf(bytes);
  assert.equal(filas.length, 3);
  assert.equal(detectarProveedor(texto), "LG");
  assert.deepEqual(parsearLista(filas), [
    { codigo: "001-201", nombre: "ALPISTE SEMILLAS X 2.5 KG", precio: 495.88 },
    { codigo: "001-202", nombre: "AMAPOLA SEMILLAS X 1 KG", precio: 17456.2 },
  ]);
});
