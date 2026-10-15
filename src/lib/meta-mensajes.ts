// Messenger e Instagram Direct: el mismo vendedor que atiende WhatsApp, en la página de Facebook
// y en el Instagram de Acopio.
//
// Los dos van por la plataforma de Messenger y se mandan con el token de la página. Ese token
// no se pega a mano: se pide a Meta con el token del usuario del sistema (META_TOKEN) y se
// guarda en memoria. Así, si Meta lo rota, alcanza con que se reinicie la función.
//
// Las charlas se guardan en las mismas tablas que WhatsApp. La clave es "fb.<id>" o "ig.<id>":
// el id que da Meta en estos canales no es un teléfono y no se puede confundir con uno.

const GRAPH = "https://graph.facebook.com/v21.0";

export type CanalChat = "whatsapp" | "messenger" | "instagram";

export function canalDe(clave: string): CanalChat {
  if (clave.startsWith("fb.")) return "messenger";
  if (clave.startsWith("ig.")) return "instagram";
  return "whatsapp";
}

/** Una clave válida de charla: teléfono, o fb./ig. seguido del id de Meta. */
export function claveValida(clave: string): string | null {
  const c = decodeURIComponent(clave).trim();
  return /^(fb\.|ig\.)?\d{5,30}$/.test(c) ? c : null;
}

export const NOMBRE_CANAL: Record<CanalChat, string> = { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram" };

export function metaActivo(): boolean {
  return Boolean(process.env.META_TOKEN);
}

type Pagina = { id: string; token: string; instagram: string | null };
let pagina: Pagina | null = null;

/**
 * La página de Acopio y su token. Se elige por META_PAGE_ID si está; si no, la única página
 * a la que tiene acceso el token. Se busca una vez por instancia.
 */
export async function paginaMeta(): Promise<Pagina | null> {
  if (pagina) return pagina;
  const token = process.env.META_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&limit=50`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    const j = (await res.json()) as { data?: { id: string; name: string; access_token: string; instagram_business_account?: { id: string } }[]; error?: unknown };
    if (!res.ok || !j.data?.length) {
      console.error("meta: no se pudo leer la página", res.status, JSON.stringify(j).slice(0, 300));
      return null;
    }
    const elegida = j.data.find((p) => p.id === process.env.META_PAGE_ID) ?? (j.data.length === 1 ? j.data[0] : j.data.find((p) => /acopio/i.test(p.name)));
    if (!elegida) {
      console.error("meta: el token ve varias páginas y ninguna es la de Acopio; definí META_PAGE_ID");
      return null;
    }
    pagina = { id: elegida.id, token: elegida.access_token, instagram: elegida.instagram_business_account?.id ?? null };
    return pagina;
  } catch (e) {
    console.error("meta: falló leer la página", e);
    return null;
  }
}

async function llamar(camino: string, cuerpo: unknown, etiqueta: string): Promise<boolean> {
  const p = await paginaMeta();
  if (!p) return false;
  try {
    const res = await fetch(`${GRAPH}/${camino}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${p.token}` },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`meta: ${etiqueta} rechazado`, res.status, (await res.text()).slice(0, 400));
      return false;
    }
    return true;
  } catch (e) {
    console.error(`meta: ${etiqueta} falló`, e);
    return false;
  }
}

/** Corta un texto largo en pedazos que entren, sin partir palabras ni links. */
export function partir(texto: string, tope: number): string[] {
  const partes: string[] = [];
  let resto = texto.trim();
  while (resto.length > tope) {
    let corte = resto.lastIndexOf("\n\n", tope);
    if (corte < tope * 0.4) corte = resto.lastIndexOf("\n", tope);
    if (corte < tope * 0.4) corte = resto.lastIndexOf(" ", tope);
    if (corte <= 0) corte = tope;
    partes.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }
  if (resto) partes.push(resto);
  return partes;
}

/** Manda un texto por Messenger o Instagram. Instagram acepta menos caracteres por mensaje. */
export async function enviarMeta(clave: string, texto: string): Promise<boolean> {
  const canal = canalDe(clave);
  if (canal === "whatsapp") return false;
  const p = await paginaMeta();
  if (!p) return false;
  const id = clave.slice(3);
  for (const parte of partir(texto, canal === "instagram" ? 990 : 1990)) {
    const ok = await llamar(`${p.id}/messages`, { recipient: { id }, messaging_type: "RESPONSE", message: { text: parte } }, `envío ${canal}`);
    if (!ok) return false;
  }
  return true;
}

/** El "visto". En Instagram no siempre está habilitado: si falla, no importa. */
export async function marcarVistoMeta(clave: string): Promise<void> {
  const p = await paginaMeta();
  if (!p || canalDe(clave) === "whatsapp") return;
  await llamar(`${p.id}/messages`, { recipient: { id: clave.slice(3) }, sender_action: "mark_seen" }, "visto");
}

/** Nombre de quien escribe. Messenger da nombre y apellido; Instagram, nombre o usuario. */
export async function nombreMeta(clave: string): Promise<string | null> {
  const p = await paginaMeta();
  if (!p) return null;
  const canal = canalDe(clave);
  const campos = canal === "instagram" ? "name,username" : "first_name,last_name";
  try {
    const res = await fetch(`${GRAPH}/${clave.slice(3)}?fields=${campos}`, { headers: { authorization: `Bearer ${p.token}` }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { first_name?: string; last_name?: string; name?: string; username?: string };
    const n = canal === "instagram" ? j.name || (j.username ? `@${j.username}` : "") : [j.first_name, j.last_name].filter(Boolean).join(" ");
    return n || null;
  } catch {
    return null;
  }
}

/**
 * Conecta la página y el Instagram a la app: suscribe la app a los webhooks de "page" e
 * "instagram" con nuestra URL, y suscribe la página a la app. Idempotente.
 */
export async function conectarMeta(urlWebhook: string): Promise<Record<string, unknown>> {
  const appId = process.env.WHATSAPP_APP_ID;
  const secreto = process.env.WHATSAPP_APP_SECRET;
  const verificar = process.env.WHATSAPP_VERIFY_TOKEN;
  const p = await paginaMeta();
  const salida: Record<string, unknown> = { pagina: p ? { id: p.id, instagram: p.instagram } : null };
  if (!appId || !secreto || !verificar) return { ...salida, error: "Faltan WHATSAPP_APP_ID, WHATSAPP_APP_SECRET o WHATSAPP_VERIFY_TOKEN" };
  if (!p) return { ...salida, error: "No se pudo leer la página con META_TOKEN" };

  const appToken = `${appId}|${secreto}`;
  const suscribir = async (object: string, fields: string) => {
    const q = new URLSearchParams({ object, callback_url: urlWebhook, verify_token: verificar, fields, include_values: "true", access_token: appToken });
    const res = await fetch(`${GRAPH}/${appId}/subscriptions`, { method: "POST", body: q, signal: AbortSignal.timeout(20_000) });
    return { estado: res.status, cuerpo: await res.text() };
  };
  salida.app_page = await suscribir("page", "messages,messaging_postbacks,messaging_referrals");
  salida.app_instagram = await suscribir("instagram", "messages,messaging_postbacks,messaging_referral");

  const q = new URLSearchParams({ subscribed_fields: "messages,messaging_postbacks,messaging_referrals", access_token: p.token });
  const res = await fetch(`${GRAPH}/${p.id}/subscribed_apps`, { method: "POST", body: q, signal: AbortSignal.timeout(20_000) });
  salida.pagina_suscripta = { estado: res.status, cuerpo: await res.text() };
  return salida;
}
