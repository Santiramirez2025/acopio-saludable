// Recompra: lo puro (sin base), para probarlo.

export type ItemRecompra = { codigo: string; producto: string; presentacion: string; cantidad: number; comboSlug: string | null };

const NOMBRE_COMBO: Record<string, string> = {
  "despensa-4-kilos": "la Despensa de 4 kilos",
  "despensa-chica": "la Despensa chica de 2 kilos",
  "alacena-de-frutos-secos": "la Alacena de frutos secos",
  "mixes-del-mes": "los Mixes del mes",
  "pan-dulce-casero": "el Kit Pan Dulce casero",
  "mesa-navidena": "la Mesa navideña",
  "regalo-navideno": "la Bolsa regalo navideña",
};

/** Lo que va en la plantilla: corto. Si fue un combo, el nombre del combo; si no, los 2 primeros productos. */
export function resumenPedido(items: ItemRecompra[]): string {
  const combos = [...new Set(items.map((i) => i.comboSlug).filter((s): s is string => Boolean(s)))];
  if (combos.length === 1 && items.every((i) => i.comboSlug)) return NOMBRE_COMBO[combos[0]] ?? "tu combo";
  const nombres = items.map((i) => i.producto.toLowerCase().replace(/\s+/g, " ").trim());
  if (nombres.length <= 2) return `tu pedido (${nombres.join(" y ")})`;
  return `tu pedido (${nombres.slice(0, 2).join(", ")} y más)`;
}

/** Lo que queda en la charla para que el vendedor arme lo mismo con los códigos exactos. */
export function textoRecompra(o: { numero: string; id: number; nombre: string; items: ItemRecompra[]; direccion: string; total: string }): string {
  const combos = [...new Set(o.items.map((i) => i.comboSlug).filter((s): s is string => Boolean(s)))];
  const sueltos = o.items.filter((i) => !i.comboSlug);
  const lineas = [
    ...combos.map((s) => `combo slug ${s} x 1`),
    ...sueltos.map((i) => `codigo ${i.codigo} · ${i.producto} ${i.presentacion} x ${i.cantidad}`),
  ];
  return (
    `[Recompra pedido ${o.numero} (id ${o.id})] Hola ${o.nombre}, soy Santiago, de Acopio Saludable. Hace unas semanas te llevamos ${resumenPedido(o.items)}. ¿Te armo lo mismo para este mes? ` +
    `[Botones: Sí, lo mismo · Quiero cambiar algo · Ahora no] ` +
    `[Para el vendedor: pedido anterior (total ${o.total}): ${lineas.join("; ")}. Dirección anterior: ${o.direccion}.]`
  );
}
