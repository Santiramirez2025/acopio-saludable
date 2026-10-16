// Qué convierte en el chat, solo para el administrador.
//
// GET ?dias=7 → el embudo de las charlas de esos días (ofrecimos combo → armó pedido → tocó pagar →
// compró) y cada charla resumida, para leerlas y ajustar al vendedor con lo que funciona de verdad.
//
// «Compró» se cruza con los pedidos por los últimos 8 dígitos del teléfono: el que escribe por
// WhatsApp y paga en la web carga su teléfono en el checkout.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Fila = { telefono: string; nombre: string | null; anuncio: string | null; estado: string; prospecto: string | null; de: string; texto: string; fecha: Date };

const ETAPAS = [
  ["oferta", (t: string) => /\[Botones: Lo quiero|\[Lista:/.test(t)],
  ["pedido", (t: string) => /\[Botones: Mercado Pago/.test(t)],
  ["pagar", (t: string) => /\[Botón: Pagar mi pedido\]|\[Pedido por transferencia/.test(t)],
] as const;

export async function GET(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const dias = Math.min(60, Math.max(1, Number(new URL(req.url).searchParams.get("dias")) || 7));
  const desde = new Date(Date.now() - dias * 864e5);

  const filas = await prisma.$queryRaw<Fila[]>`
    SELECT c."telefono", c."nombre", c."anuncioTitulo" AS "anuncio", c."estado", c."prospecto", m."de", m."texto", m."fecha"
    FROM "WhatsappConversacion" c
    JOIN "WhatsappMensaje" m ON m."telefono" = c."telefono"
    WHERE c."ultimoMensaje" >= ${desde}
    ORDER BY c."telefono", m."fecha"
  `;
  const pedidos = await prisma.order.findMany({ where: { createdAt: { gte: desde } }, select: { telefono: true, total: true, estado: true, pagadoAt: true } });
  const ocho = (t: string) => t.replace(/\D/g, "").slice(-8);
  const compras = new Map(pedidos.map((p) => [ocho(p.telefono), { total: Number(p.total), pagado: Boolean(p.pagadoAt), estado: p.estado }]));

  const charlas = new Map<string, { telefono: string; nombre: string | null; anuncio: string | null; estado: string; prospecto: string | null; mensajes: { de: string; texto: string }[] }>();
  for (const f of filas) {
    const c = charlas.get(f.telefono) ?? { telefono: f.telefono, nombre: f.nombre, anuncio: f.anuncio, estado: f.estado, prospecto: f.prospecto, mensajes: [] };
    c.mensajes.push({ de: f.de, texto: f.texto });
    charlas.set(f.telefono, c);
  }

  const resultado = [...charlas.values()].map((c) => {
    const bot = c.mensajes.filter((m) => m.de !== "cliente").map((m) => m.texto);
    const etapa = [...ETAPAS].reverse().find(([, ok]) => bot.some(ok))?.[0] ?? (bot.length ? "respondida" : "sin respuesta");
    const compra = compras.get(ocho(c.telefono)) ?? null;
    return {
      quien: `${c.nombre ?? "sin nombre"} …${c.telefono.slice(-4)}`,
      anuncio: c.anuncio,
      prospecto: c.prospecto,
      enManosDePersona: c.estado === "persona",
      mensajesCliente: c.mensajes.filter((m) => m.de === "cliente").length,
      etapa: compra ? "compró" : etapa,
      compra,
      charla: c.mensajes.slice(-16).map((m) => `${m.de === "cliente" ? "C" : m.de === "persona" ? "Yo" : "V"}: ${m.texto.replace(/\s+/g, " ").slice(0, 220)}`),
    };
  });

  const cuenta = (e: string) => resultado.filter((r) => r.etapa === e).length;
  return NextResponse.json({
    dias,
    embudo: {
      charlas: resultado.length,
      conAnuncio: resultado.filter((r) => r.anuncio).length,
      soloUnMensaje: resultado.filter((r) => r.mensajesCliente <= 1).length,
      respondidas: cuenta("respondida"),
      oferta: cuenta("oferta"),
      pedidoArmado: cuenta("pedido"),
      fueAPagar: cuenta("pagar"),
      compraron: cuenta("compró"),
      derivadas: resultado.filter((r) => r.enManosDePersona).length,
    },
    charlas: resultado,
  });
}
