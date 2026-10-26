// Lo que un agente HACE en el momento durante la llamada con Santiago (no espera a su próxima corrida).
// Lo usa la llamada en vivo: el agente propone, Santiago dice «sí» y recién ahí se ejecuta.
// Solo con la sesión de Santiago (desde la TV vinculada no se pueden hacer cambios).
//   POST { agente, herramienta, args } → { ok, resultado }
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin-acceso";
import { AGENTES, IDS_AGENTES } from "@/lib/agentes";
import { prisma } from "@/lib/prisma";
import { GET as datosGet, POST as datosPost } from "../datos/route";
import { POST as responderPost } from "../../whatsapp/responder/route";
import { POST as prospectosPost } from "../../whatsapp/prospectos/route";
import { POST as mlPost } from "../../ml/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Herramientas que cambian algo: necesitan confirmado:true (Santiago dijo que sí). */
const CAMBIAN = new Set(["escribir_whatsapp", "cambiar_estado_pedido", "cambiar_precio_ml", "cargar_negocios"]);

const json = (url: string, cuerpo: unknown) => new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
const corto = (x: unknown, max = 6000) => {
  const s = typeof x === "string" ? x : JSON.stringify(x);
  return s.length > max ? `${s.slice(0, max)}…(recortado)` : s;
};

/** «+54 9 3517 07-2560», «3517072560», «0351 15…» → «5493517072560» (como lo guarda WhatsApp). */
function telefonoAr(t: string): string {
  let d = t.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `549${d}`;
  if (d.startsWith("54") && !d.startsWith("549") && d.length === 12) d = `549${d.slice(2)}`;
  return d;
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ ok: false, resultado: "Desde la TV no puedo hacer cambios: hacelo desde la compu o el celular." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { agente?: string; herramienta?: string; args?: Record<string, unknown> };
  const agente = String(b.agente ?? "");
  const h = String(b.herramienta ?? "");
  const a = (b.args ?? {}) as Record<string, unknown>;
  if (!IDS_AGENTES.includes(agente)) return NextResponse.json({ ok: false, resultado: "Agente desconocido" }, { status: 400 });
  if (CAMBIAN.has(h) && a.confirmado !== true) {
    return NextResponse.json({ ok: false, resultado: "Todavía no: primero decile a Santiago exactamente qué vas a hacer y esperá que diga que sí; después llamá con confirmado:true." });
  }
  const base = new URL(req.url).origin;
  let r: Response;
  try {
    switch (h) {
      case "ver_pizarra": {
        const { pizarraArmado } = await import("@/lib/armado");
        const pz = await pizarraArmado();
        return NextResponse.json({ ok: true, resultado: corto({ paraArmar: pz.paraArmar.map((x) => ({ pedido: x.codigo, cliente: x.cliente, zona: x.zona, cobrar: x.cobrar, notas: x.notas, lleva: x.items.map((i) => `${i.cantidad} × ${i.producto} ${i.presentacion}`) })), totales: pz.totales, listos: pz.listos.map((x) => `${x.codigo} ${x.cliente}`), enCamino: pz.enCamino.map((x) => `${x.codigo} ${x.cliente}`), esperandoPago: pz.esperandoPago.map((x) => `${x.codigo} ${x.cliente} ${x.cobrar}`) }, 12000) });
      }
      case "ver_pedidos":
        r = await datosGet(new Request(`${base}/api/admin/agentes/datos?que=pedidos`));
        break;
      case "ver_charlas":
        r = await datosGet(new Request(`${base}/api/admin/agentes/datos?que=charlas&horas=${Math.min(168, Number(a.horas) || 24)}`));
        break;
      case "ver_charla": {
        // Acepta el teléfono o el nombre («Sonia»): si hay más de una persona con ese nombre, devuelve las opciones.
        const q = String(a.telefono ?? a.cliente ?? "").trim();
        let tel = q.replace(/\D/g, "").length >= 8 ? telefonoAr(q) : "";
        if (!tel) {
          const sin = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          const ws = sin(q).split(/\s+/).filter((w) => w.length > 1);
          const convs = await prisma.$queryRaw<{ telefono: string; nombre: string | null; ultimoMensaje: Date }[]>`SELECT "telefono", "nombre", "ultimoMensaje" FROM "WhatsappConversacion" WHERE "ultimoMensaje" > now() - interval '30 days' ORDER BY "ultimoMensaje" DESC LIMIT 300`;
          const pedidos = await prisma.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, select: { nombre: true, telefono: true }, take: 100 });
          const enc = (n: string | null) => ws.length > 0 && ws.every((w) => sin(n ?? "").split(/[^a-z0-9ñ]+/).includes(w));
          const cands = new Map<string, string>();
          for (const c of convs) if (enc(c.nombre)) cands.set(c.telefono, c.nombre ?? c.telefono);
          for (const o of pedidos) if (enc(o.nombre)) cands.set(telefonoAr(o.telefono), o.nombre);
          if (cands.size === 0) return NextResponse.json({ ok: false, resultado: `No encontré a nadie llamado «${q}» en los últimos 30 días. Pedile el teléfono.` });
          if (cands.size > 1) return NextResponse.json({ ok: true, resultado: `Hay varias personas con ese nombre: ${[...cands].map(([t, n]) => `${n} (${t})`).join("; ")}. Preguntale cuál o abrí cada una con su teléfono.` });
          tel = [...cands.keys()][0];
        }
        r = await datosGet(new Request(`${base}/api/admin/agentes/datos?que=charla&telefono=${encodeURIComponent(tel)}`));
        break;
      }
      case "escribir_whatsapp":
        r = await responderPost(json(`${base}/api/admin/whatsapp/responder`, { telefono: telefonoAr(String(a.telefono ?? "")), texto: String(a.texto ?? ""), accion: "agente" }));
        break;
      case "cambiar_estado_pedido":
        r = await datosPost(json(`${base}/api/admin/agentes/datos`, { accion: "estado", id: Number(a.id), estado: String(a.estado ?? ""), nota: a.nota ? String(a.nota) : undefined }));
        break;
      case "cambiar_precio_ml":
        r = await mlPost(json(`${base}/api/admin/ml`, { accion: "precio", item: String(a.item ?? ""), precio: Number(a.precio) }));
        break;
      case "cargar_negocios":
        r = await prospectosPost(json(`${base}/api/admin/whatsapp/prospectos`, { accion: "semilla", lista: Array.isArray(a.lista) ? a.lista.slice(0, 30) : [] }));
        break;
      default:
        return NextResponse.json({ ok: false, resultado: `No conozco la herramienta ${h}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, resultado: `Falló: ${String(e instanceof Error ? e.message : e).slice(0, 200)}` });
  }
  const texto = await r.text();
  let datos: unknown = texto;
  try {
    datos = JSON.parse(texto);
  } catch {
    /* texto plano */
  }
  // Lo que se cambió queda en la bitácora del agente.
  if (CAMBIAN.has(h)) {
    const quien = AGENTES.find((x) => x.id === agente)?.persona ?? agente;
    const detalle = `${r.ok ? "✅" : "⚠️"} En la llamada con Santiago, ${quien} hizo: ${h} ${corto({ ...a, confirmado: undefined }, 600)} → ${r.ok ? "listo" : corto(datos, 300)}`;
    await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${`agente-${agente}`}, ${r.ok}, ${detalle})`.catch(() => undefined);
  }
  return NextResponse.json({ ok: r.ok, resultado: corto(datos) }, { status: 200 });
}
