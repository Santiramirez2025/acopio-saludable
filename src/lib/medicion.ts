/** Avisa un evento a Meta y a Analytics, si están cargados. Nunca rompe la compra. */
type W = Window & { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
const META: Record<string, string> = { contacto: "Contact", ver_producto: "ViewContent", agregar: "AddToCart", iniciar_compra: "InitiateCheckout", compra: "Purchase", lead_sistema: "Lead" };
const GA: Record<string, string> = { contacto: "generate_lead", ver_producto: "view_item", agregar: "add_to_cart", iniciar_compra: "begin_checkout", compra: "purchase", lead_sistema: "generate_lead" };

/** Sesión anónima de esta pestaña (sin datos personales): sirve para contar visitas únicas y carritos abandonados. */
function sesion(): string {
  try {
    let s = sessionStorage.getItem("acopio-sesion");
    if (!s) {
      s = Math.random().toString(36).slice(2, 12);
      sessionStorage.setItem("acopio-sesion", s);
    }
    return s;
  } catch {
    return "sin-sesion";
  }
}

/** Origen de la visita: la campaña (utm_source/utm_campaign) si vino con link medido, si no el sitio que la mandó. Se guarda en la pestaña para que no se pierda al navegar. */
function origen(): string | null {
  try {
    const q = new URLSearchParams(location.search);
    const fuente = q.get("utm_source");
    if (fuente) {
      const o = `utm:${fuente}${q.get("utm_campaign") ? `/${q.get("utm_campaign")}` : ""}`.toLowerCase().slice(0, 60);
      sessionStorage.setItem("acopio-origen", o);
      return o;
    }
    const guardado = sessionStorage.getItem("acopio-origen");
    if (guardado) return guardado;
  } catch {}
  return document.referrer ? new URL(document.referrer).hostname.slice(0, 60) : null;
}

/** Registro propio en el panel (visitas, carritos, clics a WhatsApp): no depende de Meta ni de Analytics. */
export function registrar(evento: string, datos: { valor?: number } = {}) {
  if (typeof window === "undefined" || location.pathname.startsWith("/admin")) return;
  try {
    const cuerpo = JSON.stringify({ e: evento, r: location.pathname.slice(0, 120), v: datos.valor ?? null, s: sesion(), o: origen() });
    if (!navigator.sendBeacon?.("/api/medicion", new Blob([cuerpo], { type: "application/json" }))) fetch("/api/medicion", { method: "POST", body: cuerpo, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {}
}

export function medir(evento: keyof typeof META, datos: { ids?: string[]; valor?: number; pedido?: string } = {}) {
  if (typeof window === "undefined") return;
  registrar(evento, { valor: datos.valor });
  const w = window as W;
  try {
    w.fbq?.("track", META[evento], { content_ids: datos.ids, content_type: "product", value: datos.valor, currency: "ARS" }, datos.pedido ? { eventID: datos.pedido } : undefined);
    w.gtag?.("event", GA[evento], { value: datos.valor, currency: "ARS", transaction_id: datos.pedido, items: datos.ids?.map((id) => ({ item_id: id })) });
  } catch {}
}
