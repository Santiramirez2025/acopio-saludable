import { NextResponse } from "next/server";
import { cotizarCarrito } from "@/lib/tienda";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  return NextResponse.json(await cotizarCarrito((cuerpo as { lineas?: unknown })?.lineas));
}
