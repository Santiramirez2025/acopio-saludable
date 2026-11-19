// Créditos de las fotos de producto con licencia CC BY / BY-SA (las sube catalogo/fotos-reales).
import { list } from "@vercel/blob";

export type Credito = { producto: string; titulo: string; autor: string; licencia: string; fuente: string };

export async function leerCreditos(): Promise<Credito[]> {
  const url = await list({ prefix: "productos/creditos.json" }).then((l) => l.blobs[0]?.url).catch(() => undefined);
  if (!url) return [];
  return fetch(url, { next: { revalidate: 300 } }).then((r) => r.json() as Promise<Credito[]>).catch(() => []);
}
