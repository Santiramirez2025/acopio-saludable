// Lee una lista de precios en PDF (Todo Granolas o La Granja del Centro) y saca código, nombre y
// precio unitario de cada renglón. Puro: recibe las filas de texto y devuelve productos.

export type Proveedor = "TG" | "LG";
export type RenglonLista = { codigo: string; nombre: string; precio: number };

export function detectarProveedor(texto: string): Proveedor | null {
  if (/PRECIOS MAYORISTAS REFERENCIAL|Granja del Centro/i.test(texto)) return "LG";
  if (/TODO GRANOLAS|LISTA DISTRIBUIDORES/i.test(texto)) return "TG";
  return null;
}

/** Fecha que figura en la lista, si está («Desde 19/10/2026», «19 OCT»). */
export function fechaDeLista(texto: string, nombreArchivo = ""): string | null {
  const m = texto.match(/Desde\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ?? nombreArchivo.match(/(\d{1,2})[ _-]?(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i);
  return m ? m[0].replace(/^Desde\s+/i, "") : null;
}

const RENGLON = /^\s*(\d{3}-\d{3}(?:-\d{1,3})?)\s+(.+?)\s+\$?\s*([\d.]+,\d{2}|[\d,]+\.\d{2})(?:\s+\$?\s*[\d.,]+)?\s*$/;

/** Un número con coma de miles y punto decimal (así imprimen las dos listas). */
export function leerPrecio(s: string): number {
  const t = s.replace(/\s/g, "");
  const n = /,\d{2}$/.test(t) ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function parsearLista(filas: string[]): RenglonLista[] {
  const salida: RenglonLista[] = [];
  const vistos = new Set<string>();
  for (const f of filas) {
    const m = f.match(RENGLON);
    if (!m) continue;
    const precio = leerPrecio(m[3]);
    if (!(precio > 0) || vistos.has(m[1])) continue;
    vistos.add(m[1]);
    salida.push({ codigo: m[1], nombre: m[2].replace(/\s+/g, " ").replace(/\s*\$\s*$/, "").trim(), precio });
  }
  return salida;
}
