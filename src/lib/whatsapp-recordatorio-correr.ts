import { enviarSaliente, cloudActivo } from "./whatsapp-cloud";
import { textoParaPanel } from "./whatsapp-interactivo";
import { prisma } from "./prisma";
import { AVISOS_WHATSAPP } from "./avisos";
import { enHorario, tocaRecordatorio, planRecordatorio, RECORDATORIO, type CarritoCotizado, type OfertaConcreta } from "./whatsapp-recordatorio";
import { cotizarCarrito } from "./tienda";
import { leerPedido } from "./pedido-enlace";

/** El combo que se propone a quien no armó nada (lo que más se vende para casa). */
export const OFERTA_RECORDATORIO = "alacena-de-frutos-secos";

/** Qué trae, en una línea corta; si queda larga, no va (el precio y la pregunta importan más). */
function resumir(partes: string[]): string | undefined {
  const r = partes.filter(Boolean).join(", ");
  return r && r.length <= 140 ? r : undefined;
}

/** Cotiza con el precio real de hoy; si algo falla, el recordatorio sale igual con el texto de siempre. */
async function cotizar(camino: string): Promise<CarritoCotizado | null> {
  try {
    const cot = await cotizarCarrito(leerPedido(camino.replace(/^\/carrito\?p=/, "")));
    if (!cot.subtotal) return null;
    const resumen = resumir(cot.lineas.map((l) => (l.cantidad > 1 ? `${l.cantidad} × ${l.nombre}` : l.nombre)));
    return { total: cot.subtotal, transferencia: cot.conTransferencia, resumen };
  } catch (e) {
    console.error("recordatorio: no se pudo cotizar", e);
    return null;
  }
}

async function ofertaConcreta(): Promise<OfertaConcreta | null> {
  try {
    const cot = await cotizarCarrito([{ tipo: "combo", id: OFERTA_RECORDATORIO, cantidad: 1 }]);
    const l = cot.lineas[0];
    if (!l || !cot.subtotal) return null;
    return { nombre: l.nombre, total: cot.subtotal, transferencia: cot.conTransferencia, resumen: resumir(l.contenido) };
  } catch (e) {
    console.error("recordatorio: no se pudo cotizar la oferta", e);
    return null;
  }
}

type Charla = Parameters<typeof planRecordatorio>[0];


/** Manda los recordatorios que tocan ahora. Sin horario o sin WhatsApp, no hace nada. */
export async function correrRecordatorios(ahora = new Date()): Promise<{ enHorario: boolean; enviados: number; fallidos: number }> {
  if (!enHorario(ahora) || !cloudActivo() || process.env.RECORDATORIOS_APAGADOS === "1") return { enHorario: enHorario(ahora), enviados: 0, fallidos: 0 };
  let enviados = 0;
  let fallidos = 0;
  const lista = await pendientes();
  const oferta = lista.some((p) => !p.pedido && !p.anuncioTitulo?.match(/^(.+?)\s+a\s+\$/)) ? await ofertaConcreta() : null;
  for (const p of lista) {
    const carrito = p.pedido?.startsWith("/carrito?p=") ? await cotizar(p.pedido) : null;
    const s = planRecordatorio(p, carrito, oferta);
    // Se reserva antes de mandar, con un id fijo por charla y último mensaje del cliente:
    // si dos corridas se pisan, solo una lo inserta y solo esa lo manda.
    if (!(await registrarRecordatorio(p.telefono, p.cliente, textoParaPanel(s)))) continue;
    if (await enviarSaliente(p.telefono, s)) enviados++;
    else fallidos++;
  }
  return { enHorario: true, enviados, fallidos };
}

export type Pendiente = Charla & { telefono: string; ultimoBot: string; ultimoCliente: string | null; cliente: Date };

/** Charlas que esperan el recordatorio ahora. */
export async function pendientes(): Promise<Pendiente[]> {
  const filas = await prisma.$queryRaw<Pendiente[]>`
    WITH ult AS (
      SELECT c."telefono", c."nombre", c."anuncioTitulo", c."pedido",
        (SELECT max(m."fecha") FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente') AS cliente,
        (SELECT m."de" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" ORDER BY m."fecha" DESC LIMIT 1) AS ultimo_de,
        (SELECT m."fecha" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" ORDER BY m."fecha" DESC LIMIT 1) AS ultimo_fecha,
        (SELECT m."texto" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" ORDER BY m."fecha" DESC LIMIT 1) AS ultimo_texto,
        (SELECT m."texto" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente' ORDER BY m."fecha" DESC LIMIT 1) AS ultimo_cliente
      FROM "WhatsappConversacion" c
      WHERE c."estado" = 'bot' AND c."baja" = false AND c."prospecto" IS NULL
        AND (c."pedido" IS NULL OR c."pedido" NOT LIKE 'orden:%')
        AND c."telefono" <> ${AVISOS_WHATSAPP}
        -- Ya compró (por la web o con el link de pago) después de su último mensaje: no se le pregunta «¿lo cerramos?».
        AND NOT EXISTS (
          SELECT 1 FROM "Order" o
          WHERE right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10) = right(c."telefono", 10)
            AND o."estado" <> 'CANCELADO' AND o."createdAt" > now() - interval '3 days'
        )
        AND c."ultimoMensaje" > now() - interval '1 day'
    )
    SELECT u."telefono", u."nombre", u."anuncioTitulo", u."pedido", u.ultimo_texto AS "ultimoBot", u.ultimo_cliente AS "ultimoCliente", u.cliente AS "cliente"
    FROM ult u
    WHERE u.ultimo_de = 'bot'
      AND u.cliente > now() - (${RECORDATORIO.ventanaHoras} * interval '1 hour')
      AND u.ultimo_fecha < now() - (${RECORDATORIO.horasSinRespuesta} * interval '1 hour')
      AND NOT EXISTS (
        SELECT 1 FROM "WhatsappMensaje" r
        WHERE r."telefono" = u."telefono" AND r."id" LIKE 'rec.%' AND r."fecha" > now() - interval '7 days'
      )
      -- Un agente o Santiago le escribió en las últimas 24 h: la charla es de ellos, no se le suma un automático.
      AND NOT EXISTS (
        SELECT 1 FROM "WhatsappMensaje" h
        WHERE h."telefono" = u."telefono" AND h."de" = 'persona' AND h."fecha" > now() - interval '24 hours'
      )
      -- Máximo un automático sin respuesta por charla (a Azu le llegaban bienvenida + duda + reactivación seguidos).
      AND NOT EXISTS (
        SELECT 1 FROM "WhatsappMensaje" a
        WHERE a."telefono" = u."telefono" AND a."fecha" > u.cliente
          AND (a."id" LIKE 'react.%' OR a."id" LIKE 'seg.%' OR a."id" LIKE 'recompra.%')
      )
    ORDER BY u.cliente DESC
    LIMIT ${RECORDATORIO.porCorrida}
  `;
  // Solo con carrito guardado; si su último mensaje fue «Más adelante», «Lo pienso» u «ok», no se insiste.
  return filas.filter((f) => tocaRecordatorio(f));
}

/** Se guarda con id «rec.<teléfono>.<último mensaje del cliente>»: uno solo por charla y respuesta. */
export async function registrarRecordatorio(telefono: string, cliente: Date, texto: string): Promise<boolean> {
  const id = `rec.${telefono}.${new Date(cliente).getTime()}`;
  const n = await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${id}, ${telefono}, 'bot', ${texto}) ON CONFLICT ("id") DO NOTHING`;
  if (!n) return false;
  await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "ultimoMensaje" = now() WHERE "telefono" = ${telefono}`;
  return true;
}

// Además del programador, cada aviso de WhatsApp (mensajes, entregas, leídos) lo dispara,
// como mucho cada 10 minutos por instancia. Así no depende de que el programador ande.
let ultimaCorrida = 0;
export async function correrRecordatoriosSiToca(): Promise<void> {
  if (Date.now() - ultimaCorrida < 10 * 60_000) return;
  ultimaCorrida = Date.now();
  try {
    const r = await correrRecordatorios();
    if (r.enviados || r.fallidos) console.log("whatsapp: recordatorios", r);
  } catch (e) {
    console.error("whatsapp: recordatorios fallaron", e);
  }
}
