// Mercado Libre: la cuenta de vendedor conectada por OAuth (app «Panel Acopio Carlos Paz 5152»).
//
// Para qué: en ML posiciona quien contesta rápido y bien, vende y no tiene reclamos. Las preguntas
// las contesta el mismo criterio del vendedor de WhatsApp en menos de un minuto, a cualquier hora,
// y cada mañana llega un parte con visitas, preguntas, ventas y reputación para decidir.
//
// Se conecta una sola vez desde /api/ml/autorizar (hace falta una app creada en
// developers.mercadolibre.com.ar con ML_CLIENT_ID y ML_CLIENT_SECRET). El token vive en la base y se renueva solo.

import { prisma } from "./prisma";
import { urlSitio } from "./sitio";
import { avisarSantiago } from "./avisos";
import { textoRespuestaMl, precioMinimoMl, SKU_ML, filaPrecioMl, type FilaPrecioMl } from "./mercadolibre-reglas";

const API = "https://api.mercadolibre.com";
const MODELO = process.env.VENDEDOR_MODELO || "claude-haiku-5-5";

type Token = { access_token: string; refresh_token: string; user_id: number; vence: Date };

export const redirigirA = () => `${urlSitio()}/api/ml/callback`;

export function urlAutorizar(): string | null {
  const id = process.env.ML_CLIENT_ID?.trim();
  if (!id) return null;
  return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${encodeURIComponent(id)}&redirect_uri=${encodeURIComponent(redirigirA())}`;
}

async function guardar(j: { access_token: string; refresh_token: string; user_id: number; expires_in: number }): Promise<Token> {
  const vence = new Date(Date.now() + (j.expires_in - 300) * 1000);
  await prisma.$executeRaw`
    INSERT INTO "MlToken" ("id", "accessToken", "refreshToken", "userId", "vence") VALUES (1, ${j.access_token}, ${j.refresh_token}, ${j.user_id}, ${vence})
    ON CONFLICT ("id") DO UPDATE SET "accessToken" = EXCLUDED."accessToken", "refreshToken" = EXCLUDED."refreshToken", "userId" = EXCLUDED."userId", "vence" = EXCLUDED."vence"`;
  return { access_token: j.access_token, refresh_token: j.refresh_token, user_id: j.user_id, vence };
}

async function pedirToken(body: Record<string, string>): Promise<Token> {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ client_id: (process.env.ML_CLIENT_ID ?? "").trim(), client_secret: (process.env.ML_CLIENT_SECRET ?? "").trim(), ...body }),
  });
  if (!res.ok) throw new Error(`ML oauth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return guardar(await res.json());
}

export const canjearCodigo = (code: string) => pedirToken({ grant_type: "authorization_code", code, redirect_uri: redirigirA() });

export async function conectado(): Promise<boolean> {
  const r = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "MlToken"`.catch(() => [{ n: 0 }]);
  return (r[0]?.n ?? 0) > 0;
}

async function token(): Promise<Token> {
  const r = await prisma.$queryRaw<{ accessToken: string; refreshToken: string; userId: bigint; vence: Date }[]>`SELECT * FROM "MlToken" WHERE "id" = 1`;
  const t = r[0];
  if (!t) throw new Error("Mercado Libre no está conectado: entrá a /api/ml/autorizar");
  if (new Date(t.vence).getTime() > Date.now()) return { access_token: t.accessToken, refresh_token: t.refreshToken, user_id: Number(t.userId), vence: t.vence };
  // El refresh token de ML es de un solo uso: se guarda el nuevo apenas llega.
  return pedirToken({ grant_type: "refresh_token", refresh_token: t.refreshToken });
}

export async function ml<T = unknown>(ruta: string, init: RequestInit = {}): Promise<T> {
  const t = await token();
  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: { authorization: `Bearer ${t.access_token}`, "content-type": "application/json", accept: "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`ML ${ruta} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

export const miUsuario = async () => (await token()).user_id;

type Pregunta = { id: number; text: string; status: string; item_id: string; from?: { id: number }; date_created: string };
type Item = { id: string; title: string; price: number; available_quantity: number; permalink: string; status: string };

async function descripcion(itemId: string): Promise<string> {
  const d = await ml<{ plain_text?: string }>(`/items/${itemId}/description`).catch(() => ({ plain_text: "" }));
  return (d.plain_text ?? "").slice(0, 1500);
}

/** Redacta la respuesta con el mismo criterio del vendedor, respetando las reglas de ML (sin datos de contacto ni links). */
async function redactar(p: Pregunta, item: Item, otras: Item[]): Promise<string | null> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 300,
      system:
        "Contestás preguntas de compradores en Mercado Libre para Acopio Saludable (frutos secos y mixes armados en el día en Villa Carlos Paz, Córdoba; envío gratis a todo el país por Mercado Envíos). " +
        "Rioplatense, de vos, cálido y profesional, máximo 60 palabras. Empezá con «¡Hola!» y terminá invitando a comprar («Podés comprarlo ahora y te llega por Mercado Envíos») o con «Saludos, Acopio Saludable». " +
        "Respondé SOLO con lo que dice la publicación: si no está, decí que no lo tenés confirmado. Nunca inventes stock, fechas de entrega exactas, vencimientos ni atributos (sin TACC, sin azúcar) que no figuren. " +
        "PROHIBIDO por Mercado Libre: teléfonos, WhatsApp, mails, redes, links, la web propia, ofrecer vender por fuera o descuentos por fuera. Si pide algo de otra publicación nuestra, nombrala por su título. " +
        "Nunca uses la palabra «perfecto».",
      messages: [
        {
          role: "user",
          content: `Publicación: ${item.title} · $${item.price} · stock ${item.available_quantity}\nDescripción:\n${await descripcion(item.id)}\n\nOtras publicaciones nuestras: ${otras.map((o) => `${o.title} ($${o.price})`).join(" · ")}\n\nPregunta: ${p.text}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json()) as { content?: { text?: string }[] };
  return textoRespuestaMl((j.content ?? []).map((b) => b.text ?? "").join(""));
}

async function misItems(): Promise<Item[]> {
  const uid = await miUsuario();
  const ids = (await ml<{ results: string[] }>(`/users/${uid}/items/search?status=active&limit=50`)).results;
  if (!ids.length) return [];
  const r = await ml<{ code: number; body: Item }[]>(`/items?ids=${ids.join(",")}&attributes=id,title,price,available_quantity,permalink,status`);
  return r.filter((x) => x.code === 200).map((x) => x.body);
}

/** Contesta una pregunta. Si no puede (sin IA o la respuesta no pasa las reglas), avisa a Santiago con el link. */
export async function responderPregunta(id: number | string): Promise<"respondida" | "ya" | "aviso"> {
  const p = await ml<Pregunta>(`/questions/${id}`);
  if (p.status !== "UNANSWERED") return "ya";
  const items = await misItems().catch(() => [] as Item[]);
  const item = items.find((i) => i.id === p.item_id) ?? (await ml<Item>(`/items/${p.item_id}`));
  const texto = await redactar(p, item, items.filter((i) => i.id !== item.id));
  if (!texto) {
    await avisarSantiago("Pregunta en Mercado Libre", `❓ Pregunta en ML sin responder (${item.title}): «${p.text}». Contestala en vendedores.mercadolibre.com.ar/preguntas`);
    return "aviso";
  }
  await ml(`/answers`, { method: "POST", body: JSON.stringify({ question_id: p.id, text: texto }) });
  await avisarSantiago("Pregunta respondida en ML", `💬 ML · ${item.title}\nPreguntaron: «${p.text}»\nRespondimos: «${texto}»`);
  return "respondida";
}

/** Barrido: contesta todo lo pendiente (por si se perdió una notificación). */
export async function responderPendientes(): Promise<{ respondidas: number; avisos: number }> {
  const uid = await miUsuario();
  const r = await ml<{ questions: Pregunta[] }>(`/questions/search?seller_id=${uid}&status=UNANSWERED&api_version=4`);
  let respondidas = 0;
  let avisos = 0;
  for (const p of r.questions ?? []) {
    const e = await responderPregunta(p.id).catch(() => "aviso" as const);
    if (e === "respondida") respondidas++;
    if (e === "aviso") avisos++;
  }
  return { respondidas, avisos };
}

/** Venta nueva: aviso a Santiago con lo que hay que preparar. */
export async function avisarVenta(recurso: string): Promise<void> {
  const o = await ml<{ id: number; status: string; total_amount: number; order_items: { item: { title: string }; quantity: number }[]; buyer?: { nickname?: string } }>(recurso);
  if (o.status !== "paid") return;
  const ya = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "CronCorrida" WHERE "nombre" = 'ml-venta' AND "detalle" = ${String(o.id)}`;
  if ((ya[0]?.n ?? 0) > 0) return;
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES ('ml-venta', true, ${String(o.id)})`;
  const que = o.order_items.map((i) => `${i.quantity} × ${i.item.title}`).join("\n");
  await avisarSantiago("Venta en Mercado Libre", `🟡 ¡Venta en Mercado Libre! $${o.total_amount}\n${que}\nPreparalo hoy y despachalo con la etiqueta de Mercado Envíos (vendedores.mercadolibre.com.ar/ventas).`);
}


/** Costo de hoy de lo que trae cada publicación (según su SKU), con los costos que actualiza la lista de La Granja. */
async function costoDeSku(sku: string): Promise<number | null> {
  const d = SKU_ML[sku];
  if (!d) return null;
  if (d.combo) {
    const c = await prisma.combo.findUnique({ where: { slug: d.combo }, include: { items: { include: { product: { select: { costo: true } } } } } }).catch(() => null);
    if (!c?.items.length) return null;
    return c.items.reduce((s, i) => s + Number(i.product.costo) * i.cantidad, 0);
  }
  const p = await prisma.product.findUnique({ where: { codigo: d.codigo! }, select: { costo: true } });
  return p ? Number(p.costo) * (d.cantidad ?? 1) : null;
}

/** Sube el precio en ML cuando el costo subió y la ganancia quedó debajo de la mínima. Nunca baja precios. */
export async function ajustarPreciosMl(): Promise<string[]> {
  const uid = await miUsuario();
  const ids = (await ml<{ results: string[] }>(`/users/${uid}/items/search?status=active&limit=50`)).results;
  if (!ids.length) return [];
  const r = await ml<{ code: number; body: { id: string; title: string; price: number; seller_custom_field?: string | null; attributes?: { id: string; value_name?: string | null }[] } }[]>(`/items?ids=${ids.join(",")}&attributes=id,title,price,seller_custom_field,attributes`);
  const cambios: string[] = [];
  for (const { body: it } of r.filter((x) => x.code === 200)) {
    const sku = it.seller_custom_field || it.attributes?.find((a) => a.id === "SELLER_SKU")?.value_name || "";
    const costo = await costoDeSku(sku);
    if (costo === null) continue;
    const minimo = precioMinimoMl(costo);
    if (minimo <= it.price) continue;
    try {
      await ml(`/items/${it.id}`, { method: "PUT", body: JSON.stringify({ price: minimo }) });
      cambios.push(`${it.title.slice(0, 40)}: $${it.price} → $${minimo}`);
    } catch (e) {
      cambios.push(`${it.title.slice(0, 40)}: no pude subirlo a $${minimo} (${String(e).slice(0, 60)})`);
    }
  }
  if (cambios.length) await avisarSantiago("Precios de Mercado Libre", `💲 Subieron costos en La Granja y ajusté ML:\n${cambios.join("\n")}`);
  return cambios;
}

/** Parte diario: visitas de ayer por publicación, preguntas, ventas y reputación. */
export async function parteDiario({ avisar = false }: { avisar?: boolean } = {}): Promise<string> {
  const uid = await miUsuario();
  const items = await misItems();
  const ayer = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const visitas = await Promise.all(
    items.map(async (i) => {
      const v = await ml<{ total_visits?: number }>(`/items/${i.id}/visits/time_window?last=7&unit=day`).catch(() => ({ total_visits: 0 }));
      return { titulo: i.title, visitas: v.total_visits ?? 0, stock: i.available_quantity };
    }),
  );
  const u = await ml<{ seller_reputation?: { level_id?: string | null; transactions?: { completed?: number } } }>(`/users/${uid}`);
  const ventas = await ml<{ paging?: { total?: number } }>(`/orders/search?seller=${uid}&order.status=paid&order.date_created.from=${ayer}T00:00:00.000-03:00`).catch(() => ({ paging: { total: 0 } }));
  const pendientes = await responderPendientes().catch(() => ({ respondidas: 0, avisos: 0 }));
  const subidos = await ajustarPreciosMl().catch(() => [] as string[]);
  const total = visitas.reduce((s, v) => s + v.visitas, 0);
  const lineas = [
    `📊 Mercado Libre · últimos 7 días: ${total} visitas · ventas desde ayer: ${ventas.paging?.total ?? 0} · reputación: ${u.seller_reputation?.level_id ?? "sin calcular"} (${u.seller_reputation?.transactions?.completed ?? 0} ventas)`,
    ...visitas.sort((a, b) => b.visitas - a.visitas || a.titulo.localeCompare(b.titulo)).map((v) => `• ${v.titulo.slice(0, 45)}: ${v.visitas} visitas${v.stock <= 1 ? " · ⚠️ sin stock" : ""}`),
    subidos.length ? `Precios ajustados por suba de costos: ${subidos.length}.` : "Precios: sin cambios de costo.",
    pendientes.respondidas || pendientes.avisos ? `Preguntas: ${pendientes.respondidas} respondidas ahora, ${pendientes.avisos} para vos.` : "Preguntas: todas respondidas.",
  ];
  const texto = lineas.join("\n");
  // Solo el programador del día le manda el parte a Santiago, y una vez por día. Cuando un agente lo
  // consulta (Diego lo pedía varias veces seguidas), se le devuelve el texto sin mandarle nada a él.
  if (avisar) {
    const { prisma } = await import("./prisma");
    const ya = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "CronCorrida" WHERE "nombre" = 'aviso-parte-ml' AND "fecha" > now() - interval '20 hours'`.catch(() => [{ n: 0 }]);
    if (!(ya[0]?.n ?? 0)) {
      await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES ('aviso-parte-ml', true, 'enviado')`.catch(() => undefined);
      await avisarSantiago("Parte de Mercado Libre", texto);
    }
  }
  return texto;
}

/**
 * Cambia el precio de una publicación (para el Encargado de Mercado Libre). Nunca por debajo del piso
 * de ganancia (precioMinimoMl del costo actual) y siempre redondeado a $500.
 */
export async function cambiarPrecioMl(itemId: string, precio: number): Promise<{ antes: number; despues: number; piso: number | null }> {
  const id = itemId.toUpperCase().startsWith("MLA") ? itemId.toUpperCase() : `MLA${itemId}`;
  const it = await ml<{ id: string; price: number; seller_custom_field?: string | null; attributes?: { id: string; value_name?: string | null }[] }>(`/items/${id}?attributes=id,price,seller_custom_field,attributes`);
  const sku = it.seller_custom_field || it.attributes?.find((a) => a.id === "SELLER_SKU")?.value_name || "";
  const costo = await costoDeSku(sku);
  const piso = costo === null ? null : precioMinimoMl(costo);
  const nuevo = Math.round(precio / 500) * 500;
  if (piso !== null && nuevo < piso) throw new Error(`$${nuevo} queda por debajo del piso de ganancia ($${piso})`);
  if (piso === null && nuevo < it.price) throw new Error("No conozco el costo de esa publicación: solo se puede subir el precio");
  await ml(`/items/${id}`, { method: "PUT", body: JSON.stringify({ price: nuevo }) });
  return { antes: it.price, despues: nuevo, piso };
}

/**
 * Solo lectura: por cada publicación activa, precio de lista, precio final (con la promoción que esté
 * corriendo), si hay promoción y el piso de ganancia. Para que el Encargado de ML controle pisos sin Chrome.
 * No cambia nada en Mercado Libre.
 */
export async function preciosMl(): Promise<FilaPrecioMl[]> {
  const uid = await miUsuario();
  const ids = (await ml<{ results: string[] }>(`/users/${uid}/items/search?status=active&limit=50`)).results;
  if (!ids.length) return [];
  type It = { id: string; title: string; price: number; original_price?: number | null; listing_type_id?: string | null; seller_custom_field?: string | null; attributes?: { id: string; value_name?: string | null }[] };
  const r = await ml<{ code: number; body: It }[]>(`/items?ids=${ids.join(",")}&attributes=id,title,price,original_price,listing_type_id,seller_custom_field,attributes`);
  const filas = await Promise.all(
    r.filter((x) => x.code === 200).map(async ({ body: it }) => {
      const sku = it.seller_custom_field || it.attributes?.find((a) => a.id === "SELLER_SKU")?.value_name || "";
      const venta = await ml<{ amount?: number | null; regular_amount?: number | null; metadata?: { promotion_type?: string | null } | null }>(`/items/${it.id}/sale_price?context=channel_marketplace`).catch(() => null);
      const costo = await costoDeSku(sku).catch(() => null);
      return filaPrecioMl(it, sku, venta, costo === null ? null : precioMinimoMl(costo));
    }),
  );
  return filas.sort((a, b) => Number(b.bajoPiso) - Number(a.bajoPiso) || a.titulo.localeCompare(b.titulo));
}
