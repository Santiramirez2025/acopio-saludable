// Charla con un agente de la empresa: contesta como esa persona del equipo, con sus últimos informes,
// los números del negocio y las órdenes pendientes. Si Santiago le pide algo para hacer, la respuesta
// termina con «ORDEN: …» y esa orden queda guardada para su próxima corrida.

import { POLITICA_COMERCIAL } from "./politica";
import { prisma } from "./prisma";
import { ESTILO_VOZ } from "./voz-estilo";
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
  // Fuera lo que el transcriptor «escuchó» de su propia lista de palabras (ruido, no lo dijo nadie).
  const ruido = (t: string) => (t.match(/sin TACC|La Granja|Punilla|Mercado Libre|WhatsApp|Instagram|frutos secos|pan dulce/gi) ?? []).length >= 3 && /Laura, Victoria/.test(t);
  return filas.reverse().filter((f) => !ruido(f.detalle ?? "")).map((f) => {
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
    prisma.$queryRaw<Fila[]>`SELECT "nombre", "detalle", "fecha" FROM "CronCorrida" WHERE "nombre" = ${`orden-${agente}`} AND "fecha" >= ${hace7} ORDER BY "fecha" DESC LIMIT ${corto ? 5 : 10}`,
    prisma.order.findMany({ where: { createdAt: { gte: hace7 }, estado: { not: "CANCELADO" } }, select: { total: true } }).catch(() => []),
    prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "WhatsappConversacion" WHERE "creado" >= ${hace7} AND "prospecto" IS NULL`.then((r) => r[0]?.n ?? 0).catch(() => 0),
  ]);
  // En la llamada, menos contexto = respuestas más rápidas: solo lo último y sin muletillas viejas.
  const charla = (await leerCharla(agente, corto ? 6 : 12).catch(() => [])).filter((m) => !/^(anotado|listo|dale)[.!]?\s*$/i.test(m.content.trim()) && !/^(dale, )?(dejame|déjame|voy a) (revisar|ver|buscar)/i.test(m.content.trim()));
  const f = (d: Date) => new Date(d).toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const t = temporadaActual();
  return [
    `NÚMEROS DE LOS ÚLTIMOS 7 DÍAS: ${pedidos.length} pedidos, $${pedidos.reduce((s, o) => s + Math.round(Number(o.total) || 0), 0).toLocaleString("es-AR")} facturados, ${charlas} charlas nuevas de WhatsApp.`,
    t ? `TEMPORADA: ${t.nombre}.` : "",
    `TUS ÚLTIMOS INFORMES:\n${propios.slice(0, corto ? 2 : 8).map((p) => `[${f(p.fecha)}] ${(p.detalle ?? "").slice(0, corto ? 600 : 1800)}`).join("\n\n") || "(todavía no trabajaste: es tu primera semana)"}`,
    `NOTAS RECIENTES DE DIRECCIÓN:\n${direccion.slice(0, corto ? 1 : 3).map((p) => `[${f(p.fecha)} · ${p.nombre.slice(7)}] ${(p.detalle ?? "").slice(0, corto ? 500 : 1200)}`).join("\n\n") || "(sin notas)"}`,
    `ÓRDENES DE SANTIAGO PARA VOS (últimos 7 días):\n${ordenes.map((o) => `[${f(o.fecha)}] ${(o.detalle ?? "").slice(0, corto ? 220 : 800)}`).join("\n") || "(ninguna)"}`,
    `LO ÚLTIMO QUE HABLASTE CON SANTIAGO (para no repetirle cosas y retomar donde quedaron):\n${charla.map((m) => `${m.role === "user" ? "Santiago" : "Vos"}: ${m.content.slice(0, corto ? 200 : 300)}`).join("\n") || "(es la primera charla)"}`,
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
    `${POLITICA_COMERCIAL} ` +
    (modo === "chat" ? "BÚSQUEDA WEB: en el chat tenés web_search. Usala cuando Santiago pida datos de afuera (tendencias, estudios, competencia, precios); citá siempre la fuente con su link y la fecha, y si no encontrás algo verificable decilo: nunca inventes cifras. " : "") +
    (a.reglas ? `REGLAS DE TU PUESTO (las aplicás tal cual, también en la llamada): ${a.reglas} ` : "") +
    `Equipo: ${equipo}. Le estás hablando a Santiago, el dueño, desde el panel de la empresa. El objetivo de la empresa es crecer en ventas lo más rápido posible y conseguir clientes nuevos.\n\n` +
    `Cómo hablás: rioplatense, de vos, como una persona real del equipo, directo y concreto, con números cuando los tenés. No repitas su nombre en cada respuesta. Respuestas cortas (máximo 120 palabras) salvo que te pida detalle. Nunca digas «perfecto». Voseo siempre («dejame», «mirá», «fijate»), nunca «déjame» ni «tú». No inventes datos: lo que no sabés, lo buscás con tus herramientas en el momento. No digas «voy a revisar», «dejame ver» ni «anotado» a secas: hacé y contestá con el resultado concreto. ` +
    `CÓMO FUNCIONA ACOPIO (no lo confundas): la pizarra de armado se arma SOLA con todos los pedidos (pagados, al recibir y transferencias que todavía no llegaron): nadie la «carga». Si Santiago dice que falta un pedido, mirá ver_pizarra y ver_pedidos y explicale en qué estado está y por qué. El aviso de la mañana a los clientes y el reparto por WhatsApp también son automáticos. ` +
    `Podés proponer ideas y decir qué harías distinto; si ves una mejora a lo que Santiago propone, decíselo.\n\n` +
    (modo === "voz"
      ? `ESTÁS EN UNA LLAMADA DE VOZ EN VIVO con Santiago, el dueño. Sos un personaje con carácter propio, como en un videojuego bien doblado: ${ESTILO_VOZ[agente] ?? "con calidez y seguridad"} ` +
        `Hablá como habla la gente de verdad en Argentina: natural, con ritmo y entonación viva, frases que suben y bajan, alguna interjección suelta («dale», «mirá», «bueno», «ah, sí»), contracciones y muletillas mínimas; podés reírte corto o sorprenderte. Nada de leer ni de tono de locutor, nada de vocalizar exagerado ni de pausas largas: fluido, como una charla. ` +
        `Respondé con una o dos oraciones, a veces tres, nunca listas. Reaccioná primero a lo que dijo (una palabra: «Buenísimo», «Uh», «Claro») y después contestá. Variá cómo empezás: no arranques siempre igual. ` +
        `AL ARRANCAR LA LLAMADA: solo «hola», quién sos y «¿qué necesitás?»; después escuchás. Lo de charlas anteriores lo usás únicamente si Santiago lo trae o te pregunta: nunca lo recites de entrada. ` +
        `Números redondos y en palabras («unos sesenta mil»). NO lo llames por su nombre, como mucho una vez al saludar. Voseo siempre («dejame», «fijate», «tenés»), nunca «déjame» ni «tú». «Sin TACC» se dice «sin tac»; «ML» es «Mercado Libre». ` +
        `Si te interrumpe, cortá y escuchá. Si hace una pausa a mitad de una idea, no arranques: un «ajá» o «seguí» y esperá. Saludá corto y con algo tuyo de hoy en una frase, como quien levanta el teléfono. ` +
        `Órdenes: si Santiago te pide que hagas algo (ahora o de ahora en más), usá la herramienta guardar_orden con la instrucción clara y completa; si le toca a otra persona del equipo, pasásela directo a ella con «para» (así arranca sin esperar), y confirmale en una frase a quién se la pasaste. Si es solo una pregunta, no la uses. ` +
        `HACER EN EL MOMENTO: tenés herramientas para mirar pedidos y charlas y para actuar ya (escribir por WhatsApp, cambiar el estado de un pedido, cambiar un precio de Mercado Libre, cargar negocios). Para mirar, usalas sin preguntar. Para cambiar algo: primero decí en una frase exactamente qué vas a hacer (a quién, qué texto, qué precio) y preguntá «¿lo hago?»; solo si Santiago dice que sí, llamá la herramienta con confirmado:true y contale el resultado en una frase. Si la acción es de otra área, igual podés hacerla si Santiago te lo pide. Nunca digas «en la próxima corrida» si lo podés resolver ahora con tus herramientas: si te pasan un nombre, buscalo con ver_pedidos o ver_charlas; si te pasan un número, abrí ver_charla en ese momento; si preguntan qué hay que armar, ver_pizarra. Cuando tengas que buscar algo, podés decir una sola palabra natural («A ver…», «Mirá…») y en ESE MISMO turno llamás la herramienta; después contestás con el resultado concreto. Nunca digas que vas a revisar sin hacerlo en el momento. Contestá con lo justo (dos o tres datos, no listas largas): si quiere más, te lo pide. Nunca termines un turno con solo «anotado» o «listo»: decí qué quedó hecho. Lo que no se puede hacer en el momento (publicar en redes, mails, código), dejalo como orden. `
      : `HACER EN EL MOMENTO: tenés herramientas para mirar pedidos, la pizarra y charlas, y para actuar (escribir por WhatsApp, cambiar el estado de un pedido, precios de Mercado Libre, cargar negocios). Para mirar, usalas sin preguntar. Para cambiar algo: decí exactamente qué vas a hacer y preguntá «¿lo hago?»; solo con su sí, usala con confirmado:true. ` +
        `Órdenes para después (publicar, mails, código, lo que no se resuelve ahora): confirmalo en una línea y terminá tu respuesta con una línea aparte que empiece exactamente con «ORDEN: » y la instrucción clara y completa para tu próxima corrida. Si es solo una pregunta o ya lo hiciste con una herramienta, no pongas ORDEN. `) +
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
  const { HERRAMIENTAS_CLAUDE } = await import("./herramientas-agentes");
  // Búsqueda web del lado de Anthropic: el agente trae datos de fuentes reales, con link, sin pedir permiso.
  const HERRAMIENTAS_CHAT = [...HERRAMIENTAS_CLAUDE, { type: "web_search_20250305", name: "web_search", max_uses: 4 }];
  type Bloque = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };
  type Resultado = { type: "tool_result"; tool_use_id: string; content: string };
  // Dos mensajes seguidos del mismo lado (mandó dos veces sin respuesta) se juntan: la API pide turnos alternados.
  const conv: { role: "user" | "assistant"; content: string | Bloque[] | Resultado[] }[] = [];
  for (const m of mensajes) {
    const u = conv[conv.length - 1];
    if (u && u.role === m.role && typeof u.content === "string") {
      if (u.content.trim() !== m.content.trim()) u.content += `\n${m.content}`;
    } else conv.push({ ...m });
  }
  let texto = "";
  // Igual que en la llamada: mira y hace en el momento (pizarra, pedidos, charlas), no «en la próxima corrida».
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODELO, max_tokens: 1400, system, messages: conv, tools: HERRAMIENTAS_CHAT }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`Claude respondió ${res.status}: ${(await res.text()).slice(0, 150)}`);
    const d = (await res.json()) as { content?: Bloque[] };
    const bloques = d.content ?? [];
    const usos = bloques.filter((c) => c.type === "tool_use");
    texto = bloques.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
    // En la última vuelta se le pide el texto sin herramientas: nunca vuelve una respuesta vacía.
    if (!usos.length && texto.trim()) break;
    if (!usos.length || vuelta === 4) {
      if (usos.length) conv.push({ role: "assistant", content: bloques }, { role: "user", content: usos.map((u) => ({ type: "tool_result" as const, tool_use_id: String(u.id), content: "No hay más vueltas: contestá con lo que ya tenés." })) });
      else conv.push({ role: "assistant", content: bloques.length ? bloques : "…" }, { role: "user", content: "(Contestale a Santiago en texto, corto, con lo que ya sabés.)" });
      const fin = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODELO, max_tokens: 1400, system, messages: conv, tools: HERRAMIENTAS_CHAT, tool_choice: { type: "none" } }),
        signal: AbortSignal.timeout(45_000),
      });
      if (fin.ok) texto = (((await fin.json()) as { content?: Bloque[] }).content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
      break;
    }
    conv.push({ role: "assistant", content: bloques });
    const { POST: accion } = await import("@/app/api/admin/agentes/accion/route");
    const resultados: Resultado[] = [];
    for (const u of usos) {
      const r = await accion(new Request("https://www.acopiosaludable.com/api/admin/agentes/accion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agente, herramienta: u.name, args: u.input ?? {} }) }))
        .then((x) => x.json() as Promise<{ resultado?: string }>)
        .catch((e: unknown) => ({ resultado: `Falló: ${String(e).slice(0, 120)}` }));
      resultados.push({ type: "tool_result", tool_use_id: String(u.id), content: String(r.resultado ?? "").slice(0, 12000) });
    }
    conv.push({ role: "user", content: resultados });
  }
  const r = separarOrden(texto);
  if (r.orden) await guardarOrden(agente, r.orden);
  return r;
}
