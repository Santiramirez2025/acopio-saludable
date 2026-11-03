import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { decidirAgente, hashEdge, leerClavesAgentes } from "@/lib/agente-permisos";

const panel = withAuth({ pages: { signIn: "/admin/login" } });

// /api/admin: la sesión y la clave las sigue validando cada ruta (esAdmin). Acá solo se aplica el permiso
// de las claves por agente y queda registro de qué agente hizo qué (sin query: puede traer teléfonos).
async function permisoAgente(req: NextRequest) {
  const clave = req.headers.get("x-agente-clave");
  const claves = clave ? leerClavesAgentes(process.env.AGENTES_CLAVES_JSON) : [];
  if (!clave || !claves.length) return NextResponse.next();
  const decision = decidirAgente(claves, await hashEdge(clave), req.method, req.nextUrl.pathname);
  if (!decision) return NextResponse.next();
  console.log(JSON.stringify({ ev: "api-agente", agente: decision.agente, metodo: req.method, ruta: req.nextUrl.pathname, permitido: decision.permitido }));
  if (decision.permitido) return NextResponse.next();
  return NextResponse.json({ error: `El agente ${decision.agente} no tiene permiso para ${req.method} en esta ruta. Pedíselo a Rodri (seguridad).` }, { status: 403 });
}

export default function middleware(req: NextRequest, ev: NextFetchEvent) {
  if (req.nextUrl.pathname.startsWith("/api/admin")) return permisoAgente(req);
  return panel(req as NextRequestWithAuth, ev);
}

// El panel entero pide sesión, menos el login y el manifest: el navegador pide el manifest
// sin credenciales para ofrecer la instalación, y si lo mandamos al login no instala nada.
export const config = { matcher: ["/admin", "/admin/((?!login|manifest.webmanifest).+)", "/api/admin/:path*"] };
