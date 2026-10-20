// Proveedores: les escribimos desde el número del negocio para pedir precios.
//
// Igual que con los alojamientos, el primer mensaje tiene que ser una plantilla aprobada.
// La diferencia es lo que pasa cuando contestan: con un proveedor no habla el vendedor
// (le querría vender una Despensa), la charla queda en manos de Santiago y le llega el aviso.

import { prisma } from "./prisma";
import { graph } from "./whatsapp-prospectos";
import { registrarSalida } from "./whatsapp-memoria";

export const PLANTILLA_PROVEEDOR = "acopio_proveedor_v1";
export const MARCA_PROVEEDOR = "proveedor";

export const TEXTO_PROVEEDOR = (negocio: string) =>
  `Hola ${negocio}, ¿cómo están? Les escribe Santiago, de Acopio Saludable (Villa Carlos Paz, Córdoba). ` +
  "Somos una tienda online de alimentos naturales: vendemos por web y WhatsApp combos armados de frutos secos, semillas, granolas y productos sin TACC, " +
  "con reparto propio en Carlos Paz y envíos al resto del país. Estamos eligiendo proveedor fijo y nos gustaría empezar a trabajar con ustedes. " +
  "¿Nos pasan su mejor lista de precios mayorista, la compra mínima y las condiciones de envío a Carlos Paz? Compraríamos de forma regular. ¡Gracias!";

export async function crearPlantillaProveedor() {
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!waba) return { error: "Falta WHATSAPP_WABA_ID" };
  return graph(`${waba}/message_templates`, "POST", {
    name: PLANTILLA_PROVEEDOR,
    language: "es_AR",
    category: "MARKETING",
    components: [{ type: "BODY", text: TEXTO_PROVEEDOR("{{1}}"), example: { body_text: [["Todo Granolas"]] } }],
  });
}

export async function enviarProveedor(telefono: string, negocio: string) {
  const tel = telefono.replace(/\D/g, "");
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!/^549\d{10}$/.test(tel) || !id) return { telefono: tel, ok: false, motivo: "número o configuración inválidos" };
  const nombre = negocio.trim().slice(0, 60);
  const r = await graph(`${id}/messages`, "POST", {
    messaging_product: "whatsapp",
    to: tel,
    type: "template",
    template: { name: PLANTILLA_PROVEEDOR, language: { code: "es_AR" }, components: [{ type: "body", parameters: [{ type: "text", text: nombre }] }] },
  });
  if (!r.ok) return { telefono: tel, ok: false, motivo: JSON.stringify(r.cuerpo).slice(0, 300) };
  await prisma.$executeRaw`
    INSERT INTO "WhatsappConversacion" ("telefono", "nombre", "prospecto", "negocio", "contactado", "ultimoMensaje")
    VALUES (${tel}, ${nombre}, ${MARCA_PROVEEDOR}, ${nombre}, now(), now())
    ON CONFLICT ("telefono") DO UPDATE
      SET "prospecto" = ${MARCA_PROVEEDOR}, "negocio" = EXCLUDED."negocio", "contactado" = now(), "ultimoMensaje" = now()
  `;
  const idSalida = `tpl.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
  await prisma.$executeRaw`
    INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${idSalida}, ${tel}, 'persona', ${TEXTO_PROVEEDOR(nombre)})
  `;
  return { telefono: tel, ok: true };
}

// ---------- Pedido a un proveedor (fuera de la ventana de 24 h) ----------
// Para avisarle a La Granja (o a quien sea) qué retiramos y cuándo, aunque hace días que no nos escriben.

export const PLANTILLA_PEDIDO_PROVEEDOR = "acopio_pedido_proveedor_v1";

export const TEXTO_PEDIDO_PROVEEDOR = (nombre: string, dia: string, pedido: string) =>
  `Hola ${nombre}, buen día. Soy Santiago, de Acopio Saludable (Villa Carlos Paz). Les paso el pedido para retirar el ${dia}, así lo tienen preparado: ${pedido}. ¿Me confirman por acá si está todo y si algo falta o cambió de precio? ¡Muchas gracias!`;

export async function crearPlantillaPedidoProveedor() {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) return { error: "faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID" };
  const res = await fetch(`https://graph.facebook.com/v21.0/${waba}/message_templates`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: PLANTILLA_PEDIDO_PROVEEDOR,
      language: "es_AR",
      category: "UTILITY",
      components: [{ type: "BODY", text: TEXTO_PEDIDO_PROVEEDOR("{{1}}", "{{2}}", "{{3}}"), example: { body_text: [["Agustín", "miércoles 21/10 a la mañana", "981-007 Nuez mariposa extra light x 4 kg · 981-013 Castaña de cajú SK3 x 3 kg"]] } }],
    }),
  });
  return res.json();
}

/** Parámetros de plantilla: sin saltos de línea ni tabs (Meta los rechaza). */
const limpio = (s: string) => s.replace(/\s+/g, " ").trim();

export async function enviarPedidoProveedor(telefono: string, nombre: string, dia: string, pedido: string) {
  const tel = telefono.replace(/\D/g, "");
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!tel || !token || !id) return { ok: false, error: "faltan datos" };
  const p = (text: string) => ({ type: "text", text: limpio(text) });
  const res = await fetch(`https://graph.facebook.com/v21.0/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: tel, type: "template", template: { name: PLANTILLA_PEDIDO_PROVEEDOR, language: { code: "es_AR" }, components: [{ type: "body", parameters: [p(nombre), p(dia), p(pedido)] }] } }),
  }).catch(() => null);
  const cuerpo = res ? await res.text() : "sin respuesta";
  if (res?.ok) await registrarSalida(tel, "persona", TEXTO_PEDIDO_PROVEEDOR(limpio(nombre), limpio(dia), limpio(pedido))).catch(() => undefined);
  return { ok: Boolean(res?.ok), status: res?.status ?? 0, detalle: cuerpo.slice(0, 400) };
}
