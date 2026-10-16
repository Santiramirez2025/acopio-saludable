// Proveedores: les escribimos desde el número del negocio para pedir precios.
//
// Igual que con los alojamientos, el primer mensaje tiene que ser una plantilla aprobada.
// La diferencia es lo que pasa cuando contestan: con un proveedor no habla el vendedor
// (le querría vender una Despensa), la charla queda en manos de Santiago y le llega el aviso.

import { prisma } from "./prisma";
import { graph } from "./whatsapp-prospectos";

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
