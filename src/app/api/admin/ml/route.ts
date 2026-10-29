// Prueba y estado de Mercado Libre desde el panel. Solo administrador.
// GET: si está conectado, corre el parte (visitas, ventas, reputación, preguntas) y lo devuelve, con los precios
// de cada publicación (lista, final con promoción, piso). GET ?solo=precios: solo los precios, sin correr el parte.
// POST { accion: "precio", item: "MLA…", precio } → cambia el precio (nunca bajo el piso de ganancia).
// POST { accion: "titulo", item, titulo } · { accion: "descripcion", item, texto } · { accion: "pausar" | "activar", item }
// POST { accion: "promociones", item } · { accion: "quitar_promo", item, tipo, promocion? } · { accion: "categoria", titulo }
// POST { accion: "publicar", titulo, categoria, precio, sku, fotos: [url], stock?, descripcion?, atributos?, tipo? }
// Todo por API, sin Chrome: es lo que usa Diego (Mercado Libre) en sus corridas.
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cambiarDescripcionMl, cambiarPrecioMl, cambiarTituloMl, categoriaMl, conectado, estadoPublicacionMl, parteDiario, preciosMl, promocionesMl, publicarMl, quitarPromocionMl } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = (process.env.ML_CLIENT_ID ?? "").trim();
  const secreto = (process.env.ML_CLIENT_SECRET ?? "").trim();
  const credenciales = { clientId: id ? `${id.slice(0, 4)}…${id.slice(-4)}` : null, largoSecreto: secreto.length, huellaSecreto: secreto ? createHash("sha256").update(secreto).digest("hex").slice(0, 8) : null, entorno: process.env.VERCEL_ENV ?? null, desplegado: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null };
  // Prueba directa de las credenciales (client_credentials): dice si ML acepta el par id/clave.
  const prueba = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secreto }),
  }).then(async (r) => (r.ok ? "aceptadas" : `rechazadas (${r.status}: ${(await r.text()).slice(0, 120)})`)).catch((e) => `sin respuesta: ${e}`);
  if (!(await conectado())) return NextResponse.json({ conectado: false, credenciales, prueba });
  try {
    if (new URL(req.url).searchParams.get("solo") === "precios") return NextResponse.json({ conectado: true, precios: await preciosMl() });
    const [parte, precios] = await Promise.all([parteDiario(), preciosMl().catch((e) => String(e))]);
    return NextResponse.json({ conectado: true, parte, precios });
  } catch (e) {
    return NextResponse.json({ conectado: true, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const t = (k: string) => (typeof b[k] === "string" ? String(b[k]) : "");
  const item = t("item");
  try {
    switch (b.accion) {
      case "precio":
        if (!item || !Number(b.precio)) break;
        return NextResponse.json({ ok: true, ...(await cambiarPrecioMl(item, Number(b.precio))) });
      case "titulo":
        if (!item || !t("titulo")) break;
        return NextResponse.json({ ok: true, ...(await cambiarTituloMl(item, t("titulo"))) });
      case "descripcion":
        if (!item || !t("texto")) break;
        return NextResponse.json(await cambiarDescripcionMl(item, t("texto")));
      case "pausar":
      case "activar":
        if (!item) break;
        return NextResponse.json({ ok: true, ...(await estadoPublicacionMl(item, b.accion === "pausar" ? "paused" : "active")) });
      case "promociones":
        if (!item) break;
        return NextResponse.json({ ok: true, promociones: await promocionesMl(item) });
      case "quitar_promo":
        if (!item || !t("tipo")) break;
        return NextResponse.json(await quitarPromocionMl(item, t("tipo"), t("promocion") || undefined));
      case "categoria":
        if (!t("titulo")) break;
        return NextResponse.json({ ok: true, sugerencias: await categoriaMl(t("titulo")) });
      case "publicar":
        return NextResponse.json({
          ok: true,
          ...(await publicarMl({
            titulo: t("titulo"), categoria: t("categoria"), precio: Number(b.precio), sku: t("sku"),
            fotos: Array.isArray(b.fotos) ? (b.fotos as unknown[]).map(String) : [], stock: Number(b.stock) || undefined,
            descripcion: t("descripcion") || undefined, atributos: Array.isArray(b.atributos) ? (b.atributos as { id: string; value_name: string }[]) : undefined,
            tipo: b.tipo === "gold_pro" ? "gold_pro" : "gold_special",
          })),
        });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 400 });
  }
  return NextResponse.json({ error: "accion = precio | titulo | descripcion | pausar | activar | promociones | quitar_promo | categoria | publicar (con sus datos)" }, { status: 400 });
}
