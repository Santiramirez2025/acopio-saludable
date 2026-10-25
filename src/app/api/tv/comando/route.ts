// La TV vinculada pregunta qué tiene que mostrar (lo elige Santiago desde el celular).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { esTv, ultimoComando } from "@/lib/tv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getServerSession(authOptions)) && !(await esTv())) return NextResponse.json({ error: "No vinculada" }, { status: 401 });
  return NextResponse.json({ comando: await ultimoComando() });
}
