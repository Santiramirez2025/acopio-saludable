import type { ComboTienda, ProductoTienda } from "./tienda";
import type { Sugerido } from "@/components/SugeridosCarrito";

/** Orden fijo del experimento B (Martín, 21/11): primero los dos mixes de la casa, después el Trío. */
export const SUGERIDOS_CARRITO = [
  { tipo: "producto", id: "TG-MIXCG" },
  { tipo: "producto", id: "TG-MIXC" },
  { tipo: "combo", id: "trio-de-frutos-secos" },
] as const;

/** Arma los sugeridos con el precio vigente; lo que no está publicado o disponible no aparece. */
export function armarSugeridos(productos: ProductoTienda[], combos: ComboTienda[]): Sugerido[] {
  const out: Sugerido[] = [];
  for (const s of SUGERIDOS_CARRITO) {
    if (s.tipo === "producto") {
      const p = productos.find((x) => x.codigo === s.id);
      if (p && p.precio > 0) out.push({ tipo: "producto", id: p.codigo, nombre: p.producto, detalle: p.presentacion, precio: p.precio, fotoUrl: p.fotoUrl, href: `/producto/${p.codigo}` });
    } else {
      const c = combos.find((x) => x.slug === s.id);
      if (c && c.disponible && c.precio > 0) out.push({ tipo: "combo", id: c.slug, nombre: c.nombre, detalle: "combo", precio: c.precio, fotoUrl: c.fotoUrl, href: `/combos/${c.slug}` });
    }
  }
  return out;
}
