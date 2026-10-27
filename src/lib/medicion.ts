/** Avisa un evento a Meta y a Analytics, si están cargados. Nunca rompe la compra. */
type W = Window & { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
const META: Record<string, string> = { contacto: "Contact", ver_producto: "ViewContent", agregar: "AddToCart", iniciar_compra: "InitiateCheckout", compra: "Purchase", lead_sistema: "Lead" };
const GA: Record<string, string> = { contacto: "generate_lead", ver_producto: "view_item", agregar: "add_to_cart", iniciar_compra: "begin_checkout", compra: "purchase", lead_sistema: "generate_lead" };

export function medir(evento: keyof typeof META, datos: { ids?: string[]; valor?: number; pedido?: string } = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  try {
    w.fbq?.("track", META[evento], { content_ids: datos.ids, content_type: "product", value: datos.valor, currency: "ARS" }, datos.pedido ? { eventID: datos.pedido } : undefined);
    w.gtag?.("event", GA[evento], { value: datos.valor, currency: "ARS", transaction_id: datos.pedido, items: datos.ids?.map((id) => ({ item_id: id })) });
  } catch {}
}
