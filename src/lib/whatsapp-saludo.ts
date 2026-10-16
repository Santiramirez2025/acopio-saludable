// El mensaje que llega escrito cuando alguien toca «WhatsApp» en la web.
//
// «Hola! Tengo una consulta sobre Acopio Saludable» no le dice nada al vendedor: arranca con
// «¿en qué te ayudo?» y la charla pierde un paso. Si en cambio llega con lo que estaba mirando,
// el vendedor arranca vendiendo: da el precio y ofrece separarlo.

export const SALUDO_GENERAL = "Hola! Quiero hacer un pedido 🛒";

/** Arma el mensaje según la página y el título que la persona tenía delante. */
export function mensajeSegun(ruta: string, titulo: string | null | undefined): string {
  const t = (titulo ?? "").replace(/\s+/g, " ").trim().slice(0, 90);
  if (ruta.startsWith("/producto/") && t) return `Hola! Quiero ${t}. ¿Me ayudás con el pedido?`;
  if (ruta.startsWith("/combos/") && t) return `Hola! Me interesa el ${/^combo/i.test(t) ? t : `combo ${t}`}. ¿Me lo separás?`;
  if (ruta.startsWith("/nichos/") && t) return `Hola! Tengo un negocio y me interesa el pedido para ${t.replace(/^pedido (sugerido )?para /i, "")}.`;
  if (ruta.startsWith("/carrito") || ruta.startsWith("/checkout")) return "Hola! Tengo el pedido armado en la web, ¿me ayudás a cerrarlo?";
  if (ruta.startsWith("/combos")) return "Hola! Quiero ver qué combo me conviene 🛒";
  if (ruta.startsWith("/ofertas")) return "Hola! Quiero aprovechar las ofertas 🛒";
  return SALUDO_GENERAL;
}

/** Cambia el texto de un link de wa.me sin tocar el número. Con %20 y no «+»: WhatsApp no siempre lee el «+» como espacio. */
export function conMensaje(href: string, mensaje: string): string {
  const base = href.split("?")[0];
  return `${base}?text=${encodeURIComponent(mensaje)}`;
}
