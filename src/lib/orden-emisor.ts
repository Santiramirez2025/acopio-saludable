// Quién mandó una orden entre agentes. Solo es «de Santiago» si el servidor lo comprobó al guardarla: con su
// sesión en el panel o desde su WhatsApp. La clave de agentes, la TV o una orden vieja sin marca no lo prueban,
// y esas se rotulan «ORDEN INTERNA»; quién la pidió queda en el texto («De Leo…»). Puro, sin base de datos.

export type EmisorOrden = "santiago" | null;

const MARCA = "[[emisor:santiago]]";
// Cualquier marca que venga escrita dentro del texto se borra: nadie se la pone escribiéndola en una orden.
const CUALQUIER_MARCA = /\[\[\s*emisor\s*:[^\]]*\]\]/gi;

/** El texto a guardar: limpio de marcas ajenas y, solo si el servidor verificó a Santiago, con la suya. */
export function textoConEmisor(texto: string, emisor: EmisorOrden, largo = 1000): string {
  const limpio = texto.replace(CUALQUIER_MARCA, "").trim().slice(0, largo);
  return emisor === "santiago" ? `${MARCA} ${limpio}` : limpio;
}

/** Separa lo guardado en emisor y texto, para mostrarlo sin la marca. */
export function leerOrden(detalle: string | null | undefined): { emisor: EmisorOrden; texto: string } {
  const d = detalle ?? "";
  if (d.startsWith(MARCA)) return { emisor: "santiago", texto: d.slice(MARCA.length).trim() };
  return { emisor: null, texto: d };
}

export function rotuloOrden(emisor: EmisorOrden): string {
  return emisor === "santiago" ? "ORDEN DE SANTIAGO" : "ORDEN INTERNA";
}
