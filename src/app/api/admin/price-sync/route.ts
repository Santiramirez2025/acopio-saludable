import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { registrarSync, textoResumen, tokenSyncValido } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// El marcador corre dentro de compras.distrimay.com: solo ese origen puede llamar desde un navegador.
const CORS = {
  "Access-Control-Allow-Origin": "https://compras.distrimay.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const json = (cuerpo: unknown, status = 200) => NextResponse.json(cuerpo, { status, headers: CORS });
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  // Entra con el token del marcador o con la sesión del panel.
  if (!(await tokenSyncValido(bearer)) && !(await getServerSession(authOptions))) return json({ error: "No autorizado. Generá un marcador nuevo en Panel → Actualizaciones." }, 401);
  const texto = await req.text();
  if (texto.length > 5 * 1024 * 1024) return json({ error: "La actualización es demasiado grande" }, 413);
  let cuerpo: { origen?: unknown; modo?: unknown; completo?: unknown; items?: unknown };
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  try {
    const r = await registrarSync({ origen: cuerpo.origen === "marcador" ? "marcador" : "json", modo: cuerpo.modo, completo: cuerpo.completo, items: cuerpo.items });
    revalidatePath("/", "layout");
    return json({ id: r.id, resumen: textoResumen(r), detalle: r });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "No se pudo procesar" }, 400);
  }
}
