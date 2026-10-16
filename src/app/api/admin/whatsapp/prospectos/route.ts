// Prospección por WhatsApp, solo para el administrador.
//
// GET                              → estado de las plantillas en Meta (pendiente, aprobada, rechazada).
// POST { accion: "plantillas" }    → da de alta las plantillas para que Meta las revise.
// POST { accion: "borrar", nombres } → borra plantillas de alojamientos por nombre.
// POST { accion: "enviar", lista } → manda la plantilla a cada número de la lista, de a uno.
//
// El envío se saltea a quien ya se le escribió y a quien pidió no recibir más. Con
// { forzar: true } se puede repetir a propósito (por ejemplo, la prueba a tu propio número).

import { NextResponse } from "next/server";
import { crearPlantillaAviso } from "@/lib/avisos";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { borrarPlantilla, crearPlantillas, enviarProspecto, estadoPlantillas, type ResultadoEnvio } from "@/lib/whatsapp-prospectos";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TOPE = 60; // por llamada: entra en el tiempo de una función y se ve el resultado tanda por tanda

export async function GET() {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await estadoPlantillas());
}

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let cuerpo: { accion?: unknown; lista?: unknown; forzar?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (cuerpo.accion === "plantillas") return NextResponse.json(await crearPlantillas());
  if (cuerpo.accion === "plantilla-aviso") return NextResponse.json(await crearPlantillaAviso());

  if (cuerpo.accion === "borrar") {
    const nombres = Array.isArray((cuerpo as { nombres?: unknown }).nombres) ? ((cuerpo as { nombres: unknown[] }).nombres).slice(0, 10).map(String) : [];
    const salida: Record<string, unknown> = {};
    for (const n of nombres) salida[n] = await borrarPlantilla(n);
    return NextResponse.json(salida);
  }

  if (cuerpo.accion === "enviar") {
    const lista = Array.isArray(cuerpo.lista) ? cuerpo.lista.slice(0, TOPE) : [];
    if (!lista.length) return NextResponse.json({ error: "La lista está vacía" }, { status: 400 });
    const resultados: ResultadoEnvio[] = [];
    for (const it of lista) {
      const o = (it ?? {}) as Record<string, unknown>;
      resultados.push(await enviarProspecto(String(o.telefono ?? ""), String(o.negocio ?? ""), String(o.rubro ?? ""), cuerpo.forzar === true));
      await new Promise((r) => setTimeout(r, 400)); // sin ráfagas: Meta mira el ritmo
    }
    return NextResponse.json({
      enviados: resultados.filter((r) => r.ok).length,
      salteados: resultados.filter((r) => !r.ok).length,
      resultados,
    });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
