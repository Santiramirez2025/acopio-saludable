import { enviarSaliente, cloudActivo } from "./whatsapp-cloud";
import { textoParaPanel } from "./whatsapp-interactivo";
import { prisma } from "./prisma";
import { cerroLaCharla, enHorario, planRecordatorio, RECORDATORIO } from "./whatsapp-recordatorio";

type Charla = Parameters<typeof planRecordatorio>[0];


/** Manda los recordatorios que tocan ahora. Sin horario o sin WhatsApp, no hace nada. */
export async function correrRecordatorios(ahora = new Date()): Promise<{ enHorario: boolean; enviados: number; fallidos: number }> {
  if (!enHorario(ahora) || !cloudActivo() || process.env.RECORDATORIOS_APAGADOS === "1") return { enHorario: enHorario(ahora), enviados: 0, fallidos: 0 };
  let enviados = 0;
  let fallidos = 0;
  for (const p of await pendientes()) {
    const s = planRecordatorio(p);
    // Se reserva antes de mandar, con un id fijo por charla y último mensaje del cliente:
    // si dos corridas se pisan, solo una lo inserta y solo esa lo manda.
    if (!(await registrarRecordatorio(p.telefono, p.cliente, textoParaPanel(s)))) continue;
    if (await enviarSaliente(p.telefono, s)) enviados++;
    else fallidos++;
  }
  return { enHorario: true, enviados, fallidos };
}

export type Pendiente = Charla & { telefono: string; ultimoBot: string; cliente: Date };

/** Charlas que esperan el recordatorio ahora. */
export async function pendientes(): Promise<Pendiente[]> {
  const filas = await prisma.$queryRaw<Pendiente[]>`
    WITH ult AS (
      SELECT c."telefono", c."nombre", c."anuncioTitulo", c."pedido",
        (SELECT max(m."fecha") FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente') AS cliente,
        (SELECT m."de" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" ORDER BY m."fecha" DESC LIMIT 1) AS ultimo_de,
        (SELECT m."fecha" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" ORDER BY m."fecha" DESC LIMIT 1) AS ultimo_fecha,
        (SELECT m."texto" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" ORDER BY m."fecha" DESC LIMIT 1) AS ultimo_texto
      FROM "WhatsappConversacion" c
      WHERE c."estado" = 'bot' AND c."baja" = false AND c."prospecto" IS NULL
        AND (c."pedido" IS NULL OR c."pedido" NOT LIKE 'orden:%')
        AND c."ultimoMensaje" > now() - interval '1 day'
    )
    SELECT u."telefono", u."nombre", u."anuncioTitulo", u."pedido", u.ultimo_texto AS "ultimoBot", u.cliente AS "cliente"
    FROM ult u
    WHERE u.ultimo_de = 'bot'
      AND u.cliente > now() - (${RECORDATORIO.ventanaHoras} * interval '1 hour')
      AND u.ultimo_fecha < now() - (${RECORDATORIO.horasSinRespuesta} * interval '1 hour')
      AND NOT EXISTS (
        SELECT 1 FROM "WhatsappMensaje" r
        WHERE r."telefono" = u."telefono" AND r."id" LIKE 'rec.%' AND r."fecha" > u.cliente
      )
    ORDER BY u.cliente DESC
    LIMIT ${RECORDATORIO.porCorrida}
  `;
  return filas.filter((f) => !cerroLaCharla(f.ultimoBot ?? ""));
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
