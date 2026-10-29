// Prospección del Equipo de Agentes: Marcos busca empresas que califican (en sus corridas programadas, con
// búsqueda web), las propone acá con un mail personalizado y el sistema lo manda 1 a 1, en horario de
// oficina, con tope diario, un solo seguimiento y baja en un clic. Todo queda en la bitácora (CronCorrida
// «prospecto-sistema-<clave>») y Santiago ve la lista del día en el informe de Marcos.
//
// Por qué por mail y no por WhatsApp: escribirle en frío por WhatsApp desde el número de Acopio va contra
// las reglas de Meta y puede hacer que bloqueen el número del bot. El mail 1 a 1, con quién somos y la
// baja, es el canal correcto para B2B.
import { createHmac } from "node:crypto";
import { prisma } from "./prisma";
import { leerConfig } from "./config";
import { urlSitio } from "./sitio";
import {
  DIAS_SEGUIMIENTO, MAILS_POR_DIA, PRECIO_IMPLEMENTACION, VIDEO_RECORRIDO, WA_TEXTO_SISTEMA,
  diasHabiles, dominioDe, emailValido, enVentanaDeEnvio, excluido,
} from "./oferta-sistema";

const LIBRES = /^(gmail|hotmail|outlook|yahoo|live|icloud)\./i;

export type Prospecto = {
  empresa: string;
  email: string;
  web?: string;
  contacto?: string;
  cargo?: string;
  rubro?: string;
  ciudad?: string;
  /** Por qué califica: la señal concreta (anuncios activos, vende por WhatsApp, sucursales, búsquedas de vendedores…). */
  senal: string;
  asunto: string;
  /** Primer mail, texto plano (sin firma ni pie: los pone el sistema). */
  cuerpo: string;
  /** Seguimiento, texto plano, para mandar si no contestó en 4 días hábiles. */
  seguimiento?: string;
  /** Scoring 0–100 de Marcos 2.0: encaje 30 + problema 25 + señales 20 + acceso al decisor 15 + capacidad económica 10. */
  puntaje?: number;
  /** Desglose y evidencia del puntaje (verificable; lo desconocido se dice desconocido). */
  porQue?: string;
  /** Ángulo del mail: A pérdida de oportunidades · B seguimiento · C tiempo operativo · D vender más sin más carga · E experiencia del cliente. */
  angulo?: string;
};

/** Etapas después del contacto: las marca Marcos (o Santiago) con lo que pasó de verdad. */
export const ETAPAS = ["respondio", "calificado", "reunion_agendada", "reunion_realizada", "propuesta", "ganado", "perdido", "baja", "rebotado"] as const;
export type Etapa = (typeof ETAPAS)[number];

type Registro = Prospecto & {
  estado: "pendiente" | "enviado" | "seguido" | Etapa;
  creado: string;
  enviado?: string;
  seguido?: string;
  nota?: string;
};

function claveDe(email: string): string {
  const d = dominioDe(email);
  return LIBRES.test(d) ? email.toLowerCase() : d;
}

function firmaBaja(clave: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "acopio").update(`baja:${clave}`).digest("base64url").slice(0, 16);
}

export function linkBaja(email: string): string {
  const c = claveDe(email);
  return `${urlSitio()}/api/baja-sistema?c=${encodeURIComponent(c)}&f=${firmaBaja(c)}`;
}

export function bajaValida(clave: string, firma: string): boolean {
  return Boolean(clave) && firma === firmaBaja(clave);
}

async function leer(clave: string): Promise<Registro | null> {
  const f = await prisma.$queryRaw<{ detalle: string | null }[]>`
    SELECT "detalle" FROM "CronCorrida" WHERE "nombre" = ${`prospecto-sistema-${clave}`} ORDER BY "fecha" DESC LIMIT 1`;
  try {
    return f[0]?.detalle ? (JSON.parse(f[0].detalle) as Registro) : null;
  } catch {
    return null;
  }
}

async function guardar(clave: string, r: Registro): Promise<void> {
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`prospecto-sistema-${clave}`}, ${r.estado !== "baja" && r.estado !== "rebotado"}, ${JSON.stringify(r)})`;
}

/** Todos los prospectos, el último estado de cada uno. */
export async function pipeline(): Promise<(Registro & { clave: string })[]> {
  const filas = await prisma.$queryRaw<{ nombre: string; detalle: string | null }[]>`
    SELECT DISTINCT ON ("nombre") "nombre", "detalle" FROM "CronCorrida"
    WHERE "nombre" LIKE 'prospecto-sistema-%' ORDER BY "nombre", "fecha" DESC`;
  return filas.flatMap((f) => {
    try {
      return [{ ...(JSON.parse(f.detalle ?? "{}") as Registro), clave: f.nombre.slice("prospecto-sistema-".length) }];
    } catch {
      return [];
    }
  });
}

async function mandadosHoy(): Promise<number> {
  const desde = new Date(Date.now() - 24 * 3_600_000).toISOString();
  return (await pipeline()).filter((p) => (p.enviado && p.enviado > desde) || (p.seguido && p.seguido > desde)).length;
}

function html(texto: string, email: string): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const wa = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || "5493541519630"}?text=${encodeURIComponent(WA_TEXTO_SISTEMA)}`;
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;max-width:560px">
${esc(texto).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`).join("\n")}
<p style="margin:0 0 14px">El recorrido por la oficina (4 min): <a href="${VIDEO_RECORRIDO}">${VIDEO_RECORRIDO}</a><br>Precio y detalle: <a href="${urlSitio()}/agentes">${urlSitio().replace(/^https?:\/\//, "")}/agentes</a><br>Por WhatsApp: <a href="${wa}">escribime acá</a></p>
<p style="margin:0 0 4px">Marcos</p>
<p style="margin:0;color:#6b7280;font-size:13px">Agente de IA de ventas · Equipo de Agentes de Acopio Saludable (Villa Carlos Paz, Córdoba)<br>Sí, este mail lo escribió un agente. Si te interesa, la llamada la hace Santiago Ramírez, que armó el sistema.</p>
<p style="margin:18px 0 0;color:#9ca3af;font-size:12px">Te escribimos porque tu empresa aparece públicamente como un negocio que vende por WhatsApp y redes. Si no querés recibir más mails nuestros, <a href="${linkBaja(email)}" style="color:#9ca3af">date de baja acá</a> y no te escribimos nunca más.</p>
</div>`;
}

let ultimoError = "";

async function mandar(r: Registro, texto: string, asunto: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM_PROSPECCION || process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) return false;
  const cfg = await leerConfig();
  const res = await fetch(`${(process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, "")}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: from.includes("<") ? from.replace(/^[^<]*</, "Marcos · Equipo de Agentes <") : `Marcos · Equipo de Agentes <${from}>`,
      to: [r.email],
      subject: asunto,
      html: html(texto, r.email),
      ...(cfg.emailContacto ? { reply_to: cfg.emailContacto } : {}),
      headers: { "List-Unsubscribe": `<${linkBaja(r.email)}>` },
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) {
    ultimoError = `${res?.status ?? "sin respuesta"} ${res ? (await res.text().catch(() => "")).slice(0, 300) : ""}`.trim();
    console.error("prospección: mail rechazado", ultimoError);
  }
  return Boolean(res?.ok);
}

export type ResultadoPropuesta = { ok: boolean; motivo?: string; estado?: Registro["estado"] };

/** Marcos propone una empresa: se valida y, si es horario y hay cupo, se manda ya. Si no, queda pendiente. */
export async function proponer(p: Prospecto): Promise<ResultadoPropuesta> {
  const email = String(p.email ?? "").trim().toLowerCase();
  if (!p.empresa || !emailValido(email)) return { ok: false, motivo: "falta empresa o el email no sirve" };
  if (!p.asunto?.trim() || !p.cuerpo?.trim() || !p.senal?.trim()) return { ok: false, motivo: "falta asunto, cuerpo o la señal de por qué califica" };
  if (p.cuerpo.length > 1400) return { ok: false, motivo: "el mail es largo: máximo 120 palabras" };
  const puntaje = Number(p.puntaje);
  if (!Number.isFinite(puntaje)) return { ok: false, motivo: "falta el puntaje 0–100 (encaje 30, problema 25, señales 20, decisor 15, capacidad 10) con su porQue" };
  if (puntaje < 60) return { ok: false, motivo: `puntaje ${puntaje}: baja prioridad, no se contacta (seguí investigando o descartala)` };
  const clave = claveDe(email);
  if (excluido(p.empresa, dominioDe(email))) return { ok: false, motivo: "excluida (familia, cliente o demo de Santiago): no se contacta" };
  if (await leer(clave)) return { ok: false, motivo: "ya está en la lista: no se le escribe de nuevo" };
  const r: Registro = { ...p, email, estado: "pendiente", creado: new Date().toISOString() };
  await guardar(clave, r);
  const enviados = await enviarPendientes();
  return { ok: true, estado: enviados.includes(clave) ? "enviado" : "pendiente" };
}

/** Manda los pendientes (los más viejos primero) si es horario de oficina y queda cupo del día. */
export async function enviarPendientes(): Promise<string[]> {
  if (!enVentanaDeEnvio()) return [];
  let cupo = MAILS_POR_DIA - (await mandadosHoy());
  const mandados: string[] = [];
  // Primero los de prioridad alta (puntaje 80+), después por antigüedad.
  const pendientes = (await pipeline()).filter((p) => p.estado === "pendiente").sort((a, b) => Number(b.puntaje ?? 0) - Number(a.puntaje ?? 0) || a.creado.localeCompare(b.creado));
  for (const p of pendientes) {
    if (cupo <= 0) break;
    if (await mandar(p, p.cuerpo, p.asunto)) {
      const { clave, ...r } = p;
      await guardar(clave, { ...r, estado: "enviado", enviado: new Date().toISOString() });
      mandados.push(clave);
      cupo--;
    }
  }
  return mandados;
}

/** El único seguimiento: a los 4 días hábiles, si no contestó ni se dio de baja. */
export async function enviarSeguimientos(): Promise<string[]> {
  if (!enVentanaDeEnvio()) return [];
  let cupo = MAILS_POR_DIA - (await mandadosHoy());
  const hechos: string[] = [];
  for (const p of await pipeline()) {
    if (cupo <= 0) break;
    if (p.estado !== "enviado" || !p.enviado || !p.seguimiento) continue;
    if (diasHabiles(new Date(p.enviado), new Date()) < DIAS_SEGUIMIENTO) continue;
    if (await mandar(p, p.seguimiento, `Re: ${p.asunto}`)) {
      const { clave, ...r } = p;
      await guardar(clave, { ...r, estado: "seguido", seguido: new Date().toISOString() });
      hechos.push(clave);
      cupo--;
    }
  }
  return hechos;
}

/** Cambia el estado a mano (respondió, rebotó) o por la baja. */
export async function marcar(clave: string, estado: Etapa, nota?: string): Promise<boolean> {
  const r = await leer(clave);
  if (!r) {
    if (estado === "baja") await guardar(clave, { empresa: clave, email: clave.includes("@") ? clave : `baja@${clave}`, senal: "-", asunto: "-", cuerpo: "-", estado, creado: new Date().toISOString() });
    return estado === "baja";
  }
  // Historial de etapas con fecha: una reunión «realizada» no se confunde con una reservada.
  const historial = [...((r as Registro & { etapas?: { etapa: string; fecha: string; nota?: string }[] }).etapas ?? []), { etapa: estado, fecha: new Date().toISOString(), ...(nota ? { nota } : {}) }];
  await guardar(clave, { ...r, estado, nota: nota ?? r.nota, etapas: historial } as Registro);
  return true;
}

/** Resumen para el informe: cuántos hay en cada estado y el precio que se está comunicando. */
export async function resumen(): Promise<Record<string, number | string>> {
  const todos = await pipeline();
  const cuenta: Record<string, number | string> = { total: todos.length, precio: PRECIO_IMPLEMENTACION, tope_diario: MAILS_POR_DIA, enviados_ultimas_24h: await mandadosHoy() };
  for (const p of todos) cuenta[p.estado] = Number(cuenta[p.estado] ?? 0) + 1;
  return cuenta;
}

/** Prueba del envío: un mail de muestra al mail de contacto de Santiago, sin guardar nada en la lista. */
export async function probarEnvio(): Promise<{ ok: boolean; para: string | null; remitente: string | null; error?: string }> {
  const cfg = await leerConfig();
  const para = cfg.emailContacto ?? null;
  const remitente = process.env.EMAIL_FROM_PROSPECCION || process.env.EMAIL_FROM || null;
  if (!para) return { ok: false, para, remitente };
  const r: Registro = { empresa: "Prueba", email: para, senal: "prueba", asunto: "Prueba: así le llega el mail de Marcos a una empresa", cuerpo: "Vi que tienen 3 sucursales y que están buscando vendedor para WhatsApp.\n\nA Acopio Saludable la manejan 23 agentes de IA: el de WhatsApp vende y cobra solo las 24 horas.\n\nLo implementamos a medida desde $4.900.000 + IVA, para empresas que ya facturan más de $10 M por mes.\n\n¿Te muestro en 20 minutos cómo quedaría en tu empresa?", estado: "pendiente", creado: new Date().toISOString() };
  const ok = await mandar(r, r.cuerpo, r.asunto);
  return { ok, para, remitente, ...(ok ? {} : { error: ultimoError || "falta RESEND_API_KEY o remitente" }) };
}
