// Promos de la semana del proveedor (23/11, Santiago: «copiamos a ellos, que ya lo tienen estudiado, y lo
// hacemos semanalmente»). Su web marca «promo semanal» en el nombre; acá se cruzan con lo que nosotros
// publicamos. Se lee una vez cada 12 horas y, si su web no responde, la portada sigue sin la banda.
import { unstable_cache } from "next/cache";
import { claveGranja, leerCajas } from "./granja-web";
import { PRODUCTOS_PROVEEDORES } from "./catalogo-proveedores";
import { PRODUCTOS_ENCARGO } from "./catalogo-encargo";

export type PromoProveedor = { codigo: string; costoPromo: number };

/** Clave del proveedor («981-030») de un código de su web, con o sin sufijos («0-983-550-*», «9-981-012-10»). */
export function claveBase(codigoWeb: string): string | null {
  return claveGranja(codigoWeb) ?? codigoWeb.trim().match(/^\d-(\d{3}-\d{3})\b/)?.[1] ?? null;
}

/** Cruza las cajas «promo semanal» con nuestros códigos. Pura, para probarla. */
export function cruzarPromos(cajas: { codigo: string; nombre: string; precio: number; disponible: boolean }[], nuestros: { codigo: string; codigoProveedor?: string | null }[]): PromoProveedor[] {
  const porClave = new Map<string, number>();
  for (const c of cajas) {
    if (!c.disponible || !/promo\s*semana/i.test(c.nombre) || /2\s*x\s*1/i.test(c.nombre)) continue;
    const k = claveBase(c.codigo);
    if (k && !porClave.has(k)) porClave.set(k, c.precio);
  }
  const r: PromoProveedor[] = [];
  for (const p of nuestros) {
    const k = (p.codigoProveedor ?? "").replace(/^\d-(?=\d{3}-\d{3}$)/, "");
    const costo = porClave.get(k);
    if (costo) r.push({ codigo: p.codigo, costoPromo: costo });
  }
  return r;
}

async function leer(): Promise<PromoProveedor[]> {
  const fd = new FormData();
  fd.set("buscar", "promo semanal");
  const html = await fetch("https://lagranjadelcentro.com.ar/productos.php", { method: "POST", body: fd, signal: AbortSignal.timeout(12_000) })
    .then((r) => r.text())
    .catch(() => "");
  if (!html) return [];
  return cruzarPromos(leerCajas(html), [...PRODUCTOS_PROVEEDORES, ...PRODUCTOS_ENCARGO]);
}

export const promosDeLaSemana = unstable_cache(leer, ["promos-semana-proveedor"], { revalidate: 12 * 3600 });
