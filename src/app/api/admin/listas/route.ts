// Subir una lista de precios en PDF (Todo Granolas o La Granja) desde el panel, o forzar la de La Granja.
// POST multipart con `archivo`, o JSON { accion: "granja" }.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { actualizarDesdeLaGranja, aplicarListaPdf, avisarResultadoLista } from "@/lib/listas-aplicar";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tipo = req.headers.get("content-type") ?? "";
  if (tipo.includes("multipart/form-data")) {
    const fd = await req.formData();
    const archivo = fd.get("archivo");
    if (!(archivo instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    const r = await aplicarListaPdf(new Uint8Array(await archivo.arrayBuffer()), archivo.name, "panel");
    return NextResponse.json(r, { status: "error" in r ? 400 : 200 });
  }
  const r = await actualizarDesdeLaGranja();
  await avisarResultadoLista(r);
  return NextResponse.json(r, { status: "error" in r ? 400 : 200 });
}
