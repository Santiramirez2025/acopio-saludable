// El asistente de Santiago por WhatsApp: cuando ÉL le escribe (o le manda un audio o una foto) al número de
// Acopio, no le contesta el vendedor: le contesta su asistente, que consulta y hace cosas del negocio.
//   «marcá entregado lo de Mabel» · «¿cuánto me falta cobrar?» · «¿qué dijo Valentina?» · foto de la boleta de La Granja.
// Cambiar el estado de un pedido o registrar un pago lo hace directo (él lo pidió); escribirle a un cliente,
// solo después de mostrarle el texto y que diga que sí. Nunca le avisa nada al cliente salvo que él lo pida.
import type { EstadoPedido } from "@prisma/client";
import { prisma } from "./prisma";
import { enviarTexto } from "./whatsapp-cloud";
import { registrarSalida } from "./whatsapp-memoria";
import { pesos } from "./precios";
import { numeroPedido } from "./pedido-calculos";
import { AGENTES, IDS_AGENTES } from "./agentes";
import { telefonoWa } from "./telefono";

const GRAPH = "https://graph.facebook.com/v21.0";
const MODELO = () => process.env.ASISTENTE_MODELO || "claude-sonnet-5-5";

type Bloque = { type: string; [k: string]: unknown };
type Mensaje = { role: "user" | "assistant"; content: string | Bloque[] };

const ESTADOS = ["PAGADO", "EN_COMPRA", "PREPARADO", "ENVIADO", "ENTREGADO", "CANCELADO"] as const;

const HERRAMIENTAS = [
  { name: "ver_pizarra", description: "Pedidos para armar y entregar hoy: qué lleva cada uno, dirección, cuánto cobrar y si ya pagó.", input_schema: { type: "object", properties: {} } },
  { name: "ver_pedidos", description: "Pedidos abiertos y de los últimos 7 días (código, cliente, estado, total, si está pago).", input_schema: { type: "object", properties: {} } },
  {
    name: "cambiar_estado_pedido",
    description: "Cambia el estado de un pedido. Por defecto NO le avisa nada al cliente (avisar_cliente=false). ENTREGADO de un pedido al recibir registra el cobro.",
    input_schema: { type: "object", properties: { pedido: { type: "string", description: "Código (AS-00027), número o nombre del cliente" }, estado: { type: "string", enum: ESTADOS }, avisar_cliente: { type: "boolean" } }, required: ["pedido", "estado"] },
  },
  { name: "marcar_pagado", description: "Registra que un pedido ya está pago (transferencia que entró, efectivo). No le avisa al cliente.", input_schema: { type: "object", properties: { pedido: { type: "string" }, nota: { type: "string" } }, required: ["pedido"] } },
  { name: "ver_charla", description: "Los últimos mensajes de la charla de WhatsApp con un cliente.", input_schema: { type: "object", properties: { cliente: { type: "string", description: "Nombre o teléfono" } }, required: ["cliente"] } },
  {
    name: "escribir_cliente",
    description: "Le manda un WhatsApp a un cliente. SOLO con confirmado=true, después de mostrarle a Santiago el texto exacto y que diga que sí.",
    input_schema: { type: "object", properties: { cliente: { type: "string" }, texto: { type: "string" }, confirmado: { type: "boolean" } }, required: ["cliente", "texto", "confirmado"] },
  },
  { name: "dar_orden", description: "Le deja una orden a un agente de la empresa para su próxima corrida.", input_schema: { type: "object", properties: { agente: { type: "string", enum: IDS_AGENTES }, texto: { type: "string" } }, required: ["agente", "texto"] } },
  { name: "mandar_reparto", description: "Le manda a Santiago el reparto de hoy: un WhatsApp por parada con mapa, qué lleva y cuánto cobrar.", input_schema: { type: "object", properties: {} } },
  {
    name: "cargar_boleta",
    description: "Carga una boleta o ticket de compra a La Granja del Centro (leído de la foto): registra la compra y actualiza el costo de nuestros productos si cambió.",
    input_schema: {
      type: "object",
      properties: {
        fecha: { type: "string" },
        total: { type: "number" },
        items: { type: "array", items: { type: "object", properties: { codigo: { type: "string", description: "Código del proveedor si figura (ej. 981-016)" }, descripcion: { type: "string" }, cantidad: { type: "number" }, precio_unitario: { type: "number" } }, required: ["descripcion", "precio_unitario"] } },
      },
      required: ["items"],
    },
  },
];

const sinAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** «AS-00027», «27», «Mabel», «lo de mabel» → el pedido más probable (abiertos primero). */
/** Pedido por código, número o nombre. Si hay más de uno que encaja, devuelve la lista para preguntar. */
async function buscarPedido(q: string): Promise<Awaited<ReturnType<typeof prisma.order.findUnique>> | { varios: string }> {
  const num = q.match(/(?:as-?0*|pedido\s*#?|#)(\d{1,5})\b/i)?.[1] ?? q.match(/^\s*(\d{1,5})\s*$/)?.[1];
  if (num) return prisma.order.findUnique({ where: { id: Number(num) } });
  const os = await prisma.order.findMany({ where: { OR: [{ estado: { notIn: ["ENTREGADO", "CANCELADO"] } }, { updatedAt: { gte: new Date(Date.now() - 10 * 86_400_000) } }] }, orderBy: { id: "desc" }, take: 80 });
  // Palabras enteras y todas: «Ana» no es «Mariana»; «Flor» no es «Florencia».
  const palabras = sinAcento(q).replace(/\b(lo|el|la|de|del|pedido|que|a|al|los|las)\b/g, " ").split(/\s+/).filter((w) => w.length > 1);
  if (!palabras.length) return null;
  const encaja = (nombre: string) => {
    const ws = sinAcento(nombre).split(/[^a-z0-9ñ]+/);
    return palabras.every((w) => ws.includes(w));
  };
  const abiertos = os.filter((o) => !["ENTREGADO", "CANCELADO"].includes(o.estado));
  for (const lista of [abiertos, os]) {
    const hay = lista.filter((x) => encaja(x.nombre));
    if (hay.length === 1) return hay[0];
    if (hay.length > 1) return { varios: hay.slice(0, 6).map((o) => `${numeroPedido(o.id)} ${o.nombre} (${o.estado}, ${pesos(Number(o.total))})`).join("; ") };
  }
  return null;
}

const ambiguo = (o: unknown): o is { varios: string } => Boolean(o && typeof o === "object" && "varios" in o);

async function telefonoDeCliente(q: string): Promise<{ tel: string; nombre: string } | { varios: string } | null> {
  const directo = telefonoWa(q);
  if (directo && q.replace(/\D/g, "").length >= 10) return { tel: directo, nombre: q };
  const o = await buscarPedido(q);
  if (ambiguo(o)) return o;
  const wa = o ? telefonoWa(o.telefono) : null;
  if (o && wa) return { tel: wa, nombre: o.nombre };
  const c = await prisma.$queryRaw<{ telefono: string; nombre: string | null }[]>`SELECT "telefono", "nombre" FROM "WhatsappConversacion" WHERE "nombre" ILIKE ${`%${q.trim()}%`} ORDER BY "ultimoMensaje" DESC LIMIT 5`.catch(() => []);
  const enteras = c.filter((x) => sinAcento(q).split(/\s+/).every((w) => sinAcento(x.nombre ?? "").split(/[^a-z0-9ñ]+/).includes(w)));
  if (enteras.length > 1) return { varios: enteras.map((x) => `${x.nombre} (+${x.telefono})`).join("; ") };
  const uno = enteras[0];
  return uno ? { tel: uno.telefono, nombre: uno.nombre ?? q } : null;
}

async function ejecutar(nombre: string, a: Record<string, unknown>): Promise<string> {
  switch (nombre) {
    case "ver_pizarra": {
      const { pizarraArmado } = await import("./armado");
      const p = await pizarraArmado();
      const fila = (x: (typeof p.paraArmar)[number]) => `${x.codigo} ${x.cliente} · ${x.direccion || "sin dirección"} · ${x.cobrar} · lleva: ${x.items.map((i) => `${i.cantidad}× ${i.producto} ${i.presentacion}`).join(", ")}`;
      return JSON.stringify({ paraArmarOEntregar: p.paraArmar.map(fila), listos: p.listos.map(fila), enCamino: p.enCamino.map(fila), esperandoPago: p.esperandoPago.map(fila) });
    }
    case "ver_pedidos": {
      const os = await prisma.order.findMany({ where: { OR: [{ estado: { notIn: ["ENTREGADO", "CANCELADO"] } }, { updatedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } }] }, orderBy: { id: "asc" }, take: 60 });
      return os.map((o) => `${numeroPedido(o.id)} ${o.nombre} · ${o.estado} · ${pesos(Number(o.total))} · ${o.pagadoAt ? "pagado" : `sin cobrar (${o.medioPago})`} · ${o.ciudad}`).join("\n") || "No hay pedidos.";
    }
    case "cambiar_estado_pedido": {
      const o = await buscarPedido(String(a.pedido ?? ""));
      if (ambiguo(o)) return `Hay más de uno: ${o.varios}. Preguntale cuál.`;
      if (!o) return `No encontré el pedido «${String(a.pedido)}».`;
      const estado = String(a.estado) as EstadoPedido;
      if (!(ESTADOS as readonly string[]).includes(estado)) return "Estado inválido.";
      const { aplicarEstadoPedido } = await import("./pedido-estado");
      await aplicarEstadoPedido(o.id, estado, { nota: "Desde el WhatsApp de Santiago", silencioso: a.avisar_cliente !== true });
      return `Listo: ${numeroPedido(o.id)} (${o.nombre}) pasó a ${estado}${a.avisar_cliente === true ? " y se le avisó" : ", sin avisarle al cliente"}.`;
    }
    case "marcar_pagado": {
      const o = await buscarPedido(String(a.pedido ?? ""));
      if (ambiguo(o)) return `Hay más de uno: ${o.varios}. Preguntale cuál.`;
      if (!o) return `No encontré el pedido «${String(a.pedido)}».`;
      if (o.pagadoAt) return `${numeroPedido(o.id)} ya figuraba pagado.`;
      const { aplicarEstadoPedido } = await import("./pedido-estado");
      await aplicarEstadoPedido(o.id, "PAGADO", { nota: String(a.nota ?? "Pago confirmado por Santiago por WhatsApp"), silencioso: true });
      return `Listo: ${numeroPedido(o.id)} (${o.nombre}) quedó pagado (${pesos(Number(o.total))}). No se le avisó al cliente.`;
    }
    case "ver_charla": {
      const c = await telefonoDeCliente(String(a.cliente ?? ""));
      if (ambiguo(c)) return `Hay más de uno: ${c.varios}. Preguntale cuál.`;
      if (!c) return "No encontré esa charla.";
      const ms = await prisma.$queryRaw<{ de: string; texto: string; fecha: Date }[]>`SELECT "de", "texto", "fecha" FROM "WhatsappMensaje" WHERE "telefono" = ${c.tel} ORDER BY "fecha" DESC LIMIT 14`;
      return `${c.nombre} (+${c.tel}):\n` + ms.reverse().map((m) => `${m.de === "cliente" ? "Cliente" : m.de === "bot" ? "Bot" : "Vos"}: ${m.texto.slice(0, 300)}`).join("\n");
    }
    case "escribir_cliente": {
      if (a.confirmado !== true) return "Primero mostrale a Santiago el texto exacto y preguntale si lo mandás.";
      const c = await telefonoDeCliente(String(a.cliente ?? ""));
      if (ambiguo(c)) return `Hay más de uno: ${c.varios}. Preguntale a quién.`;
      if (!c) return "No encontré a ese cliente.";
      const ok = await enviarTexto(c.tel, String(a.texto ?? ""));
      if (ok) await registrarSalida(c.tel, "persona", String(a.texto)).catch(() => undefined);
      return ok ? `Mandado a ${c.nombre}.` : `No salió: la charla con ${c.nombre} está cerrada (más de 24 h sin que escriba).`;
    }
    case "dar_orden": {
      const agente = String(a.agente ?? "");
      if (!IDS_AGENTES.includes(agente)) return "Agente desconocido.";
      const { guardarOrden } = await import("./agentes-chat");
      await guardarOrden(agente, `${String(a.texto ?? "").slice(0, 800)} (Santiago por WhatsApp)`);
      return `Orden guardada para ${AGENTES.find((x) => x.id === agente)?.persona ?? agente}.`;
    }
    case "mandar_reparto": {
      const { mandarReparto } = await import("./reparto");
      const r = await mandarReparto();
      return `Te mandé ${r.paradas} paradas.`;
    }
    case "cargar_boleta": {
      const { cargarBoleta } = await import("./boleta");
      return cargarBoleta(a as Parameters<typeof cargarBoleta>[0]);
    }
  }
  return `No conozco ${nombre}.`;
}

/** Baja una foto de WhatsApp como bloque de imagen para el modelo. */
async function imagenDe(mediaId: string): Promise<Bloque | null> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token || !/^\d{5,30}$/.test(mediaId)) return null;
  const auth = { authorization: `Bearer ${token}` };
  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: auth, signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!meta?.ok) return null;
  const { url, mime_type } = (await meta.json()) as { url?: string; mime_type?: string };
  if (!url) return null;
  const f = await fetch(url, { headers: auth, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!f?.ok) return null;
  const bytes = await f.arrayBuffer();
  if (bytes.byteLength > 4_500_000) return null;
  const tipo = (mime_type ?? "image/jpeg").split(";")[0];
  const data = Buffer.from(bytes).toString("base64");
  if (tipo === "application/pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  return { type: "image", source: { type: "base64", media_type: /png|webp|gif/.test(tipo) ? tipo : "image/jpeg", data } };
}

function sistema(): string {
  const hoy = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", weekday: "long", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  return [
    `Sos el asistente de Santiago, dueño de Acopio Saludable (dietética online de Villa Carlos Paz). Te escribe ÉL, por WhatsApp, muchas veces mientras reparte. Hoy es ${hoy}.`,
    "Contestá corto, claro, en voseo rioplatense, sin markdown (WhatsApp: a lo sumo *negrita* y listas con «•»). Sin «perfecto». Precios redondeados.",
    "Usá las herramientas para saber y para hacer. Si te pide marcar entregado, pagado, etc., hacelo directo y confirmá en una línea. No le avises nada al cliente salvo que él lo pida.",
    "Para escribirle a un cliente: primero mostrale el texto exacto y preguntá «¿lo mando?»; recién con su sí, escribir_cliente con confirmado=true.",
    "Si manda una foto de una boleta o ticket de La Granja del Centro, leé cada renglón (código si figura, descripción, cantidad, precio unitario) y llamá a cargar_boleta; después resumile qué cambió.",
    "Si manda otra foto o un audio, entendé qué necesita y ayudalo. Si algo no se puede, decilo en una frase.",
  ].join("\n");
}

async function llamarModelo(mensajes: Mensaje[]): Promise<{ content: Bloque[]; stop_reason?: string } | null> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return null;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODELO(), max_tokens: 1200, system: sistema(), tools: HERRAMIENTAS, messages: mensajes }),
    signal: AbortSignal.timeout(50_000),
  }).catch(() => null);
  if (!r?.ok) {
    console.error("asistente: modelo falló", r?.status, r ? (await r.text()).slice(0, 300) : "");
    return null;
  }
  return (await r.json()) as { content: Bloque[]; stop_reason?: string };
}

/** Atiende un mensaje de Santiago. `texto` ya trae la transcripción si fue un audio. */
export async function atenderSantiago(clave: string, texto: string, mediaId: string | null): Promise<void> {
  // Contexto: las últimas idas y vueltas con su asistente (sin el mensaje actual, que ya se guardó).
  const previos = await prisma.$queryRaw<{ de: string; texto: string }[]>`SELECT "de", "texto" FROM "WhatsappMensaje" WHERE "telefono" = ${clave} AND "fecha" > now() - interval '6 hours' ORDER BY "fecha" DESC LIMIT 11`;
  const historia: Mensaje[] = [];
  for (const m of previos.slice(1).reverse()) {
    const role = m.de === "cliente" ? "user" : "assistant";
    const t = m.texto.slice(0, 1500);
    if (historia.length && historia[historia.length - 1].role === role) historia[historia.length - 1].content += `\n${t}`;
    else historia.push({ role, content: t });
  }
  while (historia.length && historia[0].role !== "user") historia.shift();
  if (historia.length && historia[historia.length - 1].role === "user") historia.pop();

  const contenido: Bloque[] = [];
  const img = mediaId ? await imagenDe(mediaId) : null;
  if (img) contenido.push(img);
  contenido.push({ type: "text", text: texto || (img ? "(mandó esto)" : "(mensaje vacío)") });
  const mensajes: Mensaje[] = [...historia, { role: "user", content: contenido }];

  let respuesta = "";
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const r = await llamarModelo(mensajes);
    if (!r) {
      respuesta = "No pude pensar la respuesta ahora (falló el modelo). Probá de nuevo en un ratito.";
      break;
    }
    mensajes.push({ role: "assistant", content: r.content });
    const usos = r.content.filter((b) => b.type === "tool_use") as { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }[];
    if (!usos.length) {
      respuesta = r.content.filter((b) => b.type === "text").map((b) => String(b.text ?? "")).join("\n").trim();
      break;
    }
    const resultados: Bloque[] = [];
    for (const u of usos) {
      const salida = await ejecutar(u.name, u.input ?? {}).catch((e: unknown) => `Falló: ${String(e instanceof Error ? e.message : e).slice(0, 200)}`);
      console.log("asistente: herramienta", u.name, salida.slice(0, 120));
      resultados.push({ type: "tool_result", tool_use_id: u.id, content: salida.slice(0, 12000) });
    }
    mensajes.push({ role: "user", content: resultados });
  }
  if (!respuesta) respuesta = "Listo.";
  if (await enviarTexto(clave, respuesta.slice(0, 3800))) await registrarSalida(clave, "bot", respuesta.slice(0, 3800)).catch(() => undefined);
}
