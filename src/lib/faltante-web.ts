// Lo que falta hoy (stock-dia.ts, la misma lista que usa el bot) tampoco se muestra en la vidriera orgánica:
// las páginas de entrada desde Google (/frutos-secos-carlos-paz, /regalos-navidenos-cordoba, la dietética local)
// y el feed de Google Shopping. 27/11: sin dátiles, y esas páginas ofrecían «Dátiles $14.000», la Despensa y el
// Pan dulce con dátiles como disponibles. Cuando se vacía SIN_STOCK_HOY, todo vuelve solo. Puro: se prueba sin base.
import { SIN_STOCK_HOY } from "./stock-dia";

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** El nombre de este producto incluye algo que hoy falta («Dátiles con carozo x 1 kg» → true). */
export function nombreFaltaHoy(nombre: string, faltantes: { etiqueta: string }[] = SIN_STOCK_HOY): boolean {
  const n = norm(nombre);
  return faltantes.some((f) => new RegExp(`\\b${norm(f.etiqueta)}\\b`).test(n));
}

/** El combo trae algún producto que hoy falta. */
export function comboConFaltante(c: { items: { producto: { producto: string } }[] }, faltantes: { etiqueta: string }[] = SIN_STOCK_HOY): boolean {
  return c.items.some((i) => nombreFaltaHoy(i.producto.producto, faltantes));
}
