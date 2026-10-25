// Prueba de la vista de fotos: GET ?id=<media id de Meta> → lo que el vendedor entendería de la foto.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { describirFotoConMotivo } from "@/lib/ver-foto";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return NextResponse.json(await describirFotoConMotivo(id));
}
