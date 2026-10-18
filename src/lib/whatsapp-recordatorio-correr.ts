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
    // Se registra antes de mandar: si Meta tarda y la corrida se repite, no sale dos veces.
    await registrarRecordatorio(p.telefono, textoParaPanel(s));
    if (await enviarSaliente(p.telefono, s)) enviados++;
    else fallidos++;
  }
  return { enHorario: true, enviados, fallidos };
}

export type Pendiente = Charla & { telefono: string; ultimoBot: string };

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
    SELECT u."telefono", u."nombre", u."anuncioTitulo", u."pedido", u.ultimo_texto AS "ultimoBot"
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

/** Se guarda con id «rec.…»: así se sabe que ya se le recordó desde su último mensaje. */
export async function registrarRecordatorio(telefono: string, texto: string): Promise<void> {
  const id = `rec.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
  await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${id}, ${telefono}, 'bot', ${texto})`;
  await prisma.$executeRaw`UPDATE "WhatsappConversacion" SET "ultimoMensaje" = now() WHERE "telefono" = ${telefono}`;
}
