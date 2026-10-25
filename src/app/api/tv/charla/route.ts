// La TV pregunta si Santiago está hablando con alguien del equipo, para mostrarlo en grande.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { esTv, ultimaCharla } from "@/lib/tv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getServerSession(authOptions)) && !(await esTv())) return NextResponse.json({ error: "No vinculada" }, { status: 401 });
  return NextResponse.json({ charla: await ultimaCharla() });
}
