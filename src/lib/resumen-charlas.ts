// Resumen de cada charla en una línea (para Laura y para la pizarra de mensajes): en qué está el cliente,
// qué tan cerca de comprar y cuál es el próximo paso. Se guarda por charla y se rehace solo si entró algo nuevo.

export type ResumenCharla = { clave: string; nombre: string | null; calor: "caliente" | "tibio" | "frio" | "cliente"; texto: string; ultimo: string };

export function leerResumen(t: string): { calor: ResumenCharla["calor"]; texto: string } | null {
  const aCalor = (v: string) => (["caliente", "tibio", "frio", "cliente"] as const).find((c) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(c)) ?? "tibio";
  try {
    const j = JSON.parse(t.match(/\{[\s\S]*\}/)?.[0] ?? "") as { calor?: string; resumen?: string };
    if (j.resumen) return { calor: aCalor(String(j.calor ?? "")), texto: String(j.resumen).slice(0, 260) };
  } catch {
    /* sigue abajo */
  }
  // «tibio | Quiere un mix…»
  const barra = t.trim().match(/^\W*(caliente|tibio|fr[ií]o|cliente)\W*\|\s*([\s\S]+)$/i);
  if (barra) return { calor: aCalor(barra[1]), texto: barra[2].replace(/\s+/g, " ").trim().slice(0, 260) };
  // Sin formato (comillas sueltas, «calor: x, resumen: …»): se rescata lo que se pueda.
  const calor = t.match(/"?calor"?\s*:\s*"?([a-zA-Zíó]+)/)?.[1];
  const resumen = t.match(/"?resumen"?\s*:\s*"?([\s\S]*?)"?\s*\}?\s*$/)?.[1] ?? t.replace(/[{}"`]/g, "").replace(/json/i, "").trim();
  return resumen && resumen.length > 8 ? { calor: aCalor(calor ?? t), texto: resumen.replace(/\s+/g, " ").slice(0, 260) } : null;
}

/** Por qué falló el último resumen (para verlo desde el panel). */
export let ultimoFallo = "";
export let ultimaCuenta = 0;

async function resumirConModelo(nombre: string | null, mensajes: { de: string; texto: string }[]): Promise<{ calor: ResumenCharla["calor"]; texto: string } | null> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return null;
  const charla = mensajes.map((m) => `${m.de === "cliente" ? "Cliente" : "Acopio"}: ${m.texto.slice(0, 280)}`).join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.VENDEDOR_MODELO || "claude-haiku-5-5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content:
            `Charla de WhatsApp de Acopio Saludable con ${nombre ?? "un cliente"}:\n${charla}\n\n` +
            "Respondé UNA sola línea con este formato exacto: CALOR | resumen\n" +
            "CALOR es una de: caliente (por comprar), tibio (interesado, sin decidir), frio (se enfrió o no contesta), cliente (ya compró).\n" +
            "resumen: qué quiere, en qué quedó y el próximo paso concreto, en español rioplatense, sin saludos.",
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch((e: unknown) => {
    ultimoFallo = String(e).slice(0, 160);
    return null;
  });
  if (!res?.ok) {
    if (res) ultimoFallo = `${res.status} ${(await res.text()).slice(0, 160)}`;
    return null;
  }
  const crudo = ((await res.json()) as { content?: { text?: string }[] }).content?.map((b) => b.text ?? "").join(" ") ?? "";
  const r = leerResumen(crudo);
  if (!r) ultimoFallo = `sin resumen: ${crudo.slice(0, 160)}`;
  return r;
}

/** Resúmenes de las charlas con movimiento en las últimas `horas`. Rehace como mucho `nuevos` por llamada. */
export async function resumenesCharlas(horas = 48, max = 30, nuevos = 10): Promise<ResumenCharla[]> {
  const { prisma } = await import("./prisma");
  const charlas = await prisma.$queryRaw<{ telefono: string; nombre: string | null; ultimo: string | null }[]>`
    SELECT c."telefono", c."nombre", (SELECT m."id" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" ORDER BY m."fecha" DESC LIMIT 1) AS "ultimo"
    FROM "WhatsappConversacion" c WHERE c."ultimoMensaje" > now() - (${horas} * interval '1 hour') AND NOT c."baja" ORDER BY c."ultimoMensaje" DESC LIMIT ${max}`;
  ultimaCuenta = charlas.length;
  const nombres = charlas.map((c) => `resumen2-${c.telefono}`);
  const guardados = nombres.length
    ? await prisma.$queryRaw<{ nombre: string; detalle: string | null }[]>`SELECT DISTINCT ON ("nombre") "nombre", "detalle" FROM "CronCorrida" WHERE "nombre" = ANY(${nombres}) ORDER BY "nombre", "fecha" DESC`
    : [];
  const cache = new Map(guardados.map((g) => [g.nombre, (() => { try { return JSON.parse(g.detalle ?? "") as ResumenCharla; } catch { return null; } })()]));
  const out: ResumenCharla[] = [];
  let hechos = 0;
  for (const c of charlas) {
    const previo = cache.get(`resumen2-${c.telefono}`);
    if (previo && previo.ultimo === c.ultimo) {
      out.push(previo);
      continue;
    }
    if (hechos >= nuevos) {
      if (previo) out.push(previo);
      continue;
    }
    hechos++;
    const ms = await prisma.$queryRaw<{ de: string; texto: string }[]>`SELECT "de", "texto" FROM "WhatsappMensaje" WHERE "telefono" = ${c.telefono} ORDER BY "fecha" DESC LIMIT 16`;
    const r = await resumirConModelo(c.nombre, ms.reverse());
    if (!r) continue;
    const nuevo: ResumenCharla = { clave: c.telefono, nombre: c.nombre, calor: r.calor, texto: r.texto, ultimo: c.ultimo ?? "" };
    await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`resumen2-${c.telefono}`}, true, ${JSON.stringify(nuevo)})`.catch(() => undefined);
    out.push(nuevo);
  }
  return out;
}
