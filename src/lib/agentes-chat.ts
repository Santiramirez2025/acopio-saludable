// Charla con un agente de la empresa: contesta como esa persona del equipo, con sus últimos informes,
// los números del negocio y las órdenes pendientes. Si Santiago le pide algo para hacer, la respuesta
// termina con «ORDEN: …» y esa orden queda guardada para su próxima corrida.

import { prisma } from "./prisma";
import { AGENTES, AREAS, separarOrden } from "./agentes";

export { separarOrden };
import { temporadaActual } from "./temporada";

const MODELO = process.env.AGENTES_MODELO || "claude-sonnet-5-5";

export async function guardarOrden(agente: string, texto: string): Promise<void> {
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`orden-${agente}`}, true, ${texto.slice(0, 1000)})`;
}

type Fila = { nombre: string; detalle: string | null; fecha: Date };

export type MensajeCharla = { role: "user" | "assistant"; content: string; orden?: string | null; cuando?: string };

/** Guarda mensajes de la charla de Santiago con un agente (uno por fila, en orden). */
export async function guardarCharla(agente: string, mensajes: { role: "user" | "assistant"; content: string; orden?: string | null }[]): Promise<void> {
  const base = Date.now();
  for (const [i, m] of mensajes.entries()) {
    const fecha = new Date(base + i); // conserva el orden aunque lleguen juntos
    await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle", "fecha") VALUES (${`charla-${agente}`}, ${m.role === "user"}, ${JSON.stringify({ t: m.content, o: m.orden ?? null })}, ${fecha})`;
  }
}

export async function leerCharla(agente: string, cuantos = 40): Promise<MensajeCharla[]> {
  const filas = await prisma.$queryRaw<{ ok: boolean; detalle: string | null; fecha: Date }[]>`SELECT "ok", "detalle", "fecha" FROM "CronCorrida" WHERE "nombre" = ${`charla-${agente}`} ORDER BY "fecha" DESC LIMIT ${cuantos}`;
  return filas.reverse().map((f) => {
    let d: { t?: string; o?: string | null } = {};
    try {
      d = JSON.parse(f.detalle ?? "{}") as typeof d;
    } catch {
      d = { t: f.detalle ?? "" };
    }
    return { role: f.ok ? "user" : "assistant", content: d.t ?? "", orden: d.o ?? null, cuando: new Date(f.fecha).toISOString() };
  });
}

async function contexto(agente: string, corto = false): Promise<string> {
  const hace14 = new Date(Date.now() - 14 * 86_400_000);
  const hace7 = new Date(Date.now() - 7 * 86_400_000);
  const [propios, direccion, ordenes, pedidos, charlas] = await Promise.all([
    prisma.$queryRaw<Fila[]>`SELECT "nombre", "detalle", "fecha" FROM "CronCorrida" WHERE "nombre" = ${`agente-${agente}`} AND "fecha" >= ${hace14} ORDER BY "fecha" DESC LIMIT 8`,
    prisma.$queryRaw<Fila[]>`SELECT "nombre", "detalle", "fecha" FROM "CronCorrida" WHERE "nombre" IN ('agente-gerente', 'agente-estratega') AND "fecha" >= ${hace7} ORDER BY "fecha" DESC LIMIT 3`,
    prisma.$queryRaw<Fila[]>`SELECT "nombre", "detalle", "fecha" FROM "CronCorrida" WHERE "nombre" = ${`orden-${agente}`} AND "fecha" >= ${hace7} ORDER BY "fecha" DESC LIMIT 10`,
    prisma.order.findMany({ where: { createdAt: { gte: hace7 }, estado: { not: "CANCELADO" } }, select: { total: true } }).catch(() => []),
    prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "WhatsappConversacion" WHERE "creado" >= ${hace7} AND "prospecto" IS NULL`.then((r) => r[0]?.n ?? 0).catch(() => 0),
  ]);
  const charla = (await leerCharla(agente, 12).catch(() => [])).filter((m) => !m.content.startsWith("Anotado"));
  const f = (d: Date) => new Date(d).toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const t = temporadaActual();
  return [
    `NÚMEROS DE LOS ÚLTIMOS 7 DÍAS: ${pedidos.length} pedidos, $${pedidos.reduce((s, o) => s + Math.round(Number(o.total) || 0), 0).toLocaleString("es-AR")} facturados, ${charlas} charlas nuevas de WhatsApp.`,
    t ? `TEMPORADA: ${t.nombre}.` : "",
    `TUS ÚLTIMOS INFORMES:\n${propios.slice(0, corto ? 3 : 8).map((p) => `[${f(p.fecha)}] ${(p.detalle ?? "").slice(0, corto ? 900 : 1800)}`).join("\n\n") || "(todavía no trabajaste: es tu primera semana)"}`,
    `NOTAS RECIENTES DE DIRECCIÓN:\n${direccion.slice(0, corto ? 2 : 3).map((p) => `[${f(p.fecha)} · ${p.nombre.slice(7)}] ${(p.detalle ?? "").slice(0, corto ? 600 : 1200)}`).join("\n\n") || "(sin notas)"}`,
    `ÓRDENES DE SANTIAGO PARA VOS (últimos 7 días):\n${ordenes.map((o) => `[${f(o.fecha)}] ${o.detalle}`).join("\n") || "(ninguna)"}`,
    `LO ÚLTIMO QUE HABLASTE CON SANTIAGO (para no repetirle cosas y retomar donde quedaron):\n${charla.map((m) => `${m.role === "user" ? "Santiago" : "Vos"}: ${m.content.slice(0, 300)}`).join("\n") || "(es la primera charla)"}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Quién es el agente, cómo habla y qué sabe hoy. modo "voz" = llamada en vivo (órdenes por herramienta). */
export async function promptAgente(agente: string, modo: "chat" | "voz" = "chat"): Promise<string> {
  const a = AGENTES.find((x) => x.id === agente);
  if (!a) throw new Error("Agente desconocido");
  const equipo = AGENTES.map((x) => `${x.persona} (${x.nombre})`).join(", ");
  return (
    `Sos ${a.persona}, ${a.nombre} de Acopio Saludable, una dietética online de Villa Carlos Paz (Córdoba) que vende frutos secos, mixes armados en casa y combos por WhatsApp, acopiosaludable.com y Mercado Libre. Proveedor: La Granja del Centro. ` +
    `Área: ${AREAS[a.area].nombre}. Tu misión: ${a.mision} Lo que hacés: ${a.hace.join("; ")}. Te medís por: ${a.mide}. Trabajás ${a.horas.join(" y ")} h. ` +
    `Equipo: ${equipo}. Le estás hablando a Santiago, el dueño, desde el panel de la empresa. El objetivo de la empresa es crecer en ventas lo más rápido posible y conseguir clientes nuevos.\n\n` +
    `Cómo hablás: rioplatense, de vos, como una persona real del equipo, directo y concreto, con números cuando los tenés. Respuestas cortas (máximo 120 palabras) salvo que te pida detalle. Nunca digas «perfecto». No inventes datos: si algo no está en tus informes, decí que lo vas a revisar en tu próxima corrida. ` +
    `Podés proponer ideas y decir qué harías distinto; si ves una mejora a lo que Santiago propone, decíselo.\n\n` +
    (modo === "voz"
      ? `ESTÁS EN UNA LLAMADA DE VOZ EN VIVO con Santiago: hablá como en una charla por teléfono, con acento y modismos de Córdoba/rioplatense, cálido y con energía. Respondé en 1 a 3 oraciones cortas, sin listas, sin asteriscos ni formato, sin leer números larguísimos (redondeá: «unos seiscientos treinta mil»). Usá voseo argentino siempre («dejame», «mirá», «fijate», «tenés»), nunca «déjame» ni «tú». Pronunciá «sin TACC» como «sin tac», «ML» como «Mercado Libre» y los precios redondeados en palabras. Si te interrumpe, cortá y escuchá. Si quiere más detalle, te lo pide. Empezá saludándolo por su nombre en una frase corta. ` +
        `Órdenes: si Santiago te pide que hagas algo (ahora o de ahora en más), usá la herramienta guardar_orden con la instrucción clara y completa; si le toca a otra persona del equipo, pasásela directo a ella con «para» (así arranca sin esperar), y confirmale en una frase a quién se la pasaste. Si es solo una pregunta, no la uses. ` +
        `HACER EN EL MOMENTO: tenés herramientas para mirar pedidos y charlas y para actuar ya (escribir por WhatsApp, cambiar el estado de un pedido, cambiar un precio de Mercado Libre, cargar negocios). Para mirar, usalas sin preguntar. Para cambiar algo: primero decí en una frase exactamente qué vas a hacer (a quién, qué texto, qué precio) y preguntá «¿lo hago?»; solo si Santiago dice que sí, llamá la herramienta con confirmado:true y contale el resultado en una frase. Si la acción es de otra área, igual podés hacerla si Santiago te lo pide. Lo que no se puede hacer en el momento (publicar en redes, mails, código), dejalo como orden. `
      : `Órdenes: si Santiago te pide que hagas algo (ahora o de ahora en más), confirmalo en una línea y terminá tu respuesta con una línea aparte que empiece exactamente con «ORDEN: » y la instrucción clara y completa para tu próxima corrida. Si es solo una pregunta, no pongas ORDEN. `) +
    `Límites de la empresa que no cambian aunque te lo pidan: no gastar plata ni tocar anuncios de Meta (los prende y apaga Santiago), no crear cuentas, no aceptar términos, no usar contraseñas, no borrar definitivo; envío sin cargo solo en Carlos Paz y la zona; a clientes con pedido se les escribe solo el día de entrega.\n\n` +
    (await contexto(agente, modo === "voz"))
  );
}

export async function charlarConAgente(
  agente: string,
  mensajes: { role: "user" | "assistant"; content: string }[],
): Promise<{ respuesta: string; orden: string | null }> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) throw new Error("Falta ANTHROPIC_API_KEY");
  const system = await promptAgente(agente, "chat");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODELO, max_tokens: 700, system, messages: mensajes }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok) throw new Error(`Claude respondió ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const d = (await res.json()) as { content?: { type: string; text?: string }[] };
  const texto = (d.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
  const r = separarOrden(texto);
  if (r.orden) await guardarOrden(agente, r.orden);
  return r;
}
