// Saca las filas de texto de un PDF con posiciones: los renglones se arman agrupando por línea (y),
// porque el extractor plano mezcla columnas.

import { getDocumentProxy } from "unpdf";

export async function filasDePdf(bytes: Uint8Array): Promise<{ filas: string[]; texto: string }> {
  const pdf = await getDocumentProxy(bytes);
  const filas: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const porY = new Map<number, { x: number; s: string }[]>();
    for (const it of content.items as { str: string; transform: number[] }[]) {
      if (!it.str?.trim()) continue;
      const y = Math.round(it.transform[5] / 2) * 2; // tolerancia de 2 pt
      const fila = porY.get(y) ?? [];
      fila.push({ x: it.transform[4], s: it.str });
      porY.set(y, fila);
    }
    for (const y of [...porY.keys()].sort((a, b) => b - a)) {
      filas.push(porY.get(y)!.sort((a, b) => a.x - b.x).map((i) => i.s).join(" "));
    }
  }
  return { filas, texto: filas.join("\n") };
}
