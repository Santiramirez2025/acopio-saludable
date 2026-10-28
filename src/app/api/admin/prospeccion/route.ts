// Prospección del Equipo de Agentes (ver lib/prospeccion-sistema.ts). Solo administrador / clave de agente.
//   GET                                         → resumen y la lista (últimos 80, del más nuevo al más viejo)
//   POST { accion: "proponer", prospectos: [] } → valida, guarda y manda si es horario y hay cupo
//   POST { accion: "enviar" }                   → manda pendientes y seguimientos que tocan
//   POST { accion: "marcar", clave, estado, nota? } → respondio | rebotado | baja
//   POST { accion: "seguir_whatsapp" }          → un seguimiento a los leads de WhatsApp que dejaron de contestar
//   POST { accion: "leccion", texto }           → Marcos guarda lo que aprendió (entra en su prompt)
import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin-acceso";
import { enviarPendientes, enviarSeguimientos, marcar, pipeline, proponer, resumen, type Prospecto } from "@/lib/prospeccion-sistema";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const lista = (await pipeline()).sort((a, b) => b.creado.localeCompare(a.creado)).slice(0, 80);
  return NextResponse.json({ resumen: await resumen(), lista: lista.map(({ cuerpo, seguimiento, ...r }) => ({ ...r, cuerpo: cuerpo.slice(0, 300), conSeguimiento: Boolean(seguimiento) })) });
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { accion?: string; prospectos?: Prospecto[]; prospecto?: Prospecto; clave?: string; estado?: string; nota?: string };
  if (b.accion === "proponer") {
    const lista = (b.prospectos ?? (b.prospecto ? [b.prospecto] : [])).slice(0, 20);
    const resultados = [];
    for (const p of lista) resultados.push({ empresa: p?.empresa, email: p?.email, ...(await proponer(p).catch((e) => ({ ok: false, motivo: String(e) }))) });
    return NextResponse.json({ resultados });
  }
  if (b.accion === "enviar") {
    const [pendientes, seguimientos] = [await enviarPendientes(), await enviarSeguimientos()];
    return NextResponse.json({ pendientes, seguimientos });
  }
  if (b.accion === "marcar" && b.clave && (b.estado === "respondio" || b.estado === "rebotado" || b.estado === "baja")) {
    return NextResponse.json({ ok: await marcar(b.clave, b.estado, b.nota) });
  }
  if (b.accion === "prueba") {
    const { probarEnvio } = await import("@/lib/prospeccion-sistema");
    return NextResponse.json(await probarEnvio());
  }
  if (b.accion === "seguir_whatsapp") {
    const { seguirLeadsSistema } = await import("@/lib/vendedor-sistema");
    const { responderTexto } = await import("@/lib/atencion");
    return NextResponse.json({ seguimientos: await seguirLeadsSistema(responderTexto) });
  }
  if (b.accion === "leccion" && typeof (b as { texto?: unknown }).texto === "string") {
    const { guardarLeccionMarcos } = await import("@/lib/vendedor-sistema");
    await guardarLeccionMarcos((b as { texto: string }).texto);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "accion = proponer | enviar | marcar | seguir_whatsapp | leccion" }, { status: 400 });
}
