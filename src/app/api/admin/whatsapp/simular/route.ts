// Simulador del vendedor de WhatsApp, solo para el administrador.
//
// POST { pasos: [{ texto, toque? }], anuncio?: { titulo, texto }, nombre? }
//
// Corre la charla paso a paso con el mismo código que atiende a los clientes (pensar()), pero
// sin mandar nada ni guardar nada: devuelve lo que vería la persona, con los botones y la lista.
// Sirve para probar cambios en el vendedor antes de que les lleguen a los clientes reales.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pensar, planCobroLink } from "@/lib/atencion";
import { leerToque, textoParaPanel } from "@/lib/whatsapp-interactivo";
import { contextoProspecto } from "@/lib/whatsapp-plantillas";
import type { Turno } from "@/lib/vendedor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Paso = { texto?: unknown; toque?: unknown };

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let cuerpo: { pasos?: unknown; anuncio?: { titulo?: string; texto?: string } | null; nombre?: string; prospecto?: { rubro?: string; negocio?: string } | null };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const pasos = (Array.isArray(cuerpo.pasos) ? cuerpo.pasos : []).slice(0, 8) as Paso[];
  if (!pasos.length) return NextResponse.json({ error: "Faltan pasos" }, { status: 400 });

  const historial: Turno[] = [];
  let pedido: string | null = null;
  const salida = [];
  for (const [i, p] of pasos.entries()) {
    const texto = String(p.texto ?? "").slice(0, 400);
    const toque = leerToque(typeof p.toque === "string" ? p.toque : null);
    const inicio = Date.now();
    if (toque?.tipo === "pagar") {
      const salientes = await planCobroLink(toque.camino);
      salida.push({ entrada: texto || p.toque, cierre: "pagar", salientes, vio: salientes.map(textoParaPanel) });
      break;
    }
    if (toque?.tipo === "transferencia") {
      salida.push({ entrada: texto || p.toque, cierre: "transferencia", camino: toque.camino, vio: ["[Total con descuento + datos para transferir; la charla pasa a una persona]"] });
      break;
    }
    const r = await pensar({
      canal: "whatsapp",
      texto,
      toque,
      historial: [...historial],
      anuncio: i === 0 && cuerpo.anuncio ? { titulo: cuerpo.anuncio.titulo ?? null, texto: cuerpo.anuncio.texto ?? null } : null,
      nombre: cuerpo.nombre ?? null,
      negocio: cuerpo.prospecto?.rubro ? contextoProspecto(cuerpo.prospecto.rubro, cuerpo.prospecto.negocio ?? null) : "",
      pedidoGuardado: pedido,
    });
    if (r.guardarPedido) pedido = r.guardarPedido;
    const vio = r.salientes.map(textoParaPanel);
    salida.push({ entrada: texto, toque: p.toque ?? null, conIA: r.conIA, ms: Date.now() - inicio, salientes: r.salientes, vio });
    historial.push({ de: "yo", texto }, { de: "acopio", texto: vio.join("\n") });
  }
  return NextResponse.json(salida);
}
