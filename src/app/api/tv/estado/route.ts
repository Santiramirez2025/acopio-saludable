// La TV pregunta si Santiago ya aprobó su código. Cuando sí, queda vinculada 30 días (cookie).
import { NextResponse } from "next/server";
import { canjearCodigo, COOKIE_TV, opcionesCookieTv } from "@/lib/tv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const codigo = (u.searchParams.get("codigo") ?? "").replace(/\D/g, "");
  const secreto = u.searchParams.get("secreto") ?? "";
  if (codigo.length !== 6 || secreto.length < 10) return NextResponse.json({ estado: "vencido" }, { status: 400 });
  const r = await canjearCodigo(codigo, secreto);
  const res = NextResponse.json({ estado: r.estado });
  if (r.token) res.cookies.set(COOKIE_TV, r.token, opcionesCookieTv);
  return res;
}
