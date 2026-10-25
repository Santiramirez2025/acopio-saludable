// La TV pide un código para vincularse (público: el código solo sirve si Santiago lo aprueba desde el panel).
import { NextResponse } from "next/server";
import { crearCodigo } from "@/lib/tv";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(await crearCodigo());
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
