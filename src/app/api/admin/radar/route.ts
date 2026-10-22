// Cuentas del radar de Instagram, solo para el administrador.
// GET → las cuentas y los últimos avisos.
// POST { accion: "agregar", cuentas: [{ username, rubro }] } → valida cada una con la API y la suma.
// POST { accion: "quitar", usernames } · POST { accion: "probar" } → una pasada ahora.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { correrRadar, escribirComentarioConMotivo, leerCuenta } from "@/lib/radar-correr";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const cuentas = await prisma.$queryRaw`SELECT * FROM "RadarCuenta" ORDER BY "seguidores" DESC NULLS LAST`;
  const avisos = await prisma.$queryRaw`SELECT * FROM "RadarAviso" ORDER BY "fecha" DESC LIMIT 30`;
  return NextResponse.json({ cuentas, avisos });
}

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { accion?: string; cuentas?: { username?: string; rubro?: string }[]; usernames?: string[]; username?: string };
  if (b.accion === "probar") return NextResponse.json(await correrRadar(true));
  // Diagnóstico: escribe el comentario para el último post de una cuenta, sin avisar ni guardar.
  if (b.accion === "comentario") {
    const u = String((b as { username?: string }).username ?? "").replace(/^@/, "");
    const r = await leerCuenta(u, 1);
    if (!r.ok || !r.pubs[0]) return NextResponse.json({ error: r.ok ? "sin posts" : r.error });
    return NextResponse.json({ post: r.pubs[0].caption.slice(0, 200), ...(await escribirComentarioConMotivo(r.pubs[0])) });
  }
  if (b.accion === "quitar") {
    for (const u of (b.usernames ?? []).slice(0, 50)) await prisma.$executeRaw`DELETE FROM "RadarCuenta" WHERE "username" = ${u}`;
    return NextResponse.json({ ok: true });
  }
  if (b.accion === "agregar") {
    const salida: Record<string, unknown> = {};
    for (const c of (b.cuentas ?? []).slice(0, 40)) {
      const u = String(c.username ?? "").replace(/^@/, "").trim().toLowerCase();
      if (!/^[a-z0-9._]{2,30}$/.test(u)) { salida[u] = "nombre inválido"; continue; }
      const r = await leerCuenta(u, 1);
      if (!r.ok) { salida[u] = r.error; continue; }
      await prisma.$executeRaw`INSERT INTO "RadarCuenta" ("username", "rubro", "seguidores") VALUES (${u}, ${c.rubro ?? null}, ${r.seguidores}) ON CONFLICT ("username") DO UPDATE SET "seguidores" = ${r.seguidores}, "activo" = true`;
      salida[u] = { seguidores: r.seguidores, ultimo: r.pubs[0]?.timestamp ?? null };
    }
    return NextResponse.json(salida);
  }
  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
