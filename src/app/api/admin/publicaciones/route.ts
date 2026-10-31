// Programador propio de Instagram y Facebook (sin el tope de Metricool). Solo administrador y agentes.
// GET ?desde=ISO&hasta=ISO → lista (por defecto de hace 2 días a dentro de 30).
// POST { accion: "programar", red, video?, imagen?, texto, fecha, quien? }
//      red: instagram_reel | instagram_historia | instagram_post | facebook_reel | facebook_post
//      fecha ISO con zona (2026-11-02T18:00:00-03:00). Pasada la hora, sale en la próxima corrida (cada 15 min).
// POST { accion: "programar", redes: [...], ... } → una por red, mismo contenido.
// POST { accion: "cancelar", id } · POST { accion: "reprogramar", id, fecha, texto? } · POST { accion: "ya" } → corre la cola ahora.

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { cancelar, correrProgramadas, listar, programar, reprogramar, validar } from "@/lib/programador";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const u = new URL(req.url);
  const desde = new Date(u.searchParams.get("desde") ?? Date.now() - 2 * 864e5);
  const hasta = new Date(u.searchParams.get("hasta") ?? Date.now() + 30 * 864e5);
  return NextResponse.json({ publicaciones: await listar(desde, hasta) });
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { accion?: string; id?: number; red?: string; redes?: string[]; video?: string; imagen?: string; texto?: string; fecha?: string; quien?: string };
  if (b.accion === "cancelar") return NextResponse.json({ ok: await cancelar(Number(b.id)) });
  if (b.accion === "reprogramar") return NextResponse.json({ ok: b.fecha ? await reprogramar(Number(b.id), b.fecha, b.texto) : false });
  if (b.accion === "ya") return NextResponse.json(await correrProgramadas());
  if (b.accion !== "programar") return NextResponse.json({ error: "accion: programar | cancelar | reprogramar | ya" }, { status: 400 });
  const redes = b.redes?.length ? b.redes : [b.red ?? ""];
  for (const red of redes) {
    const error = validar({ ...b, red });
    if (error) return NextResponse.json({ error: `${red}: ${error}` }, { status: 400 });
  }
  const ids: number[] = [];
  for (const red of redes) ids.push(await programar({ red, video: b.video, imagen: b.imagen, texto: b.texto, fecha: b.fecha as string, quien: b.quien }));
  return NextResponse.json({ ok: true, ids });
}
