// Baja de la prospección por mail del Equipo de Agentes: un clic y no se le escribe nunca más.
import { bajaValida, marcar } from "@/lib/prospeccion-sistema";

export const dynamic = "force-dynamic";

function pagina(texto: string): Response {
  return new Response(
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baja</title><body style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;padding:0 16px;color:#1f2937"><h1 style="font-size:22px">Acopio Saludable</h1><p>${texto}</p></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function baja(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const c = u.searchParams.get("c") ?? "";
  const f = u.searchParams.get("f") ?? "";
  if (!bajaValida(c, f)) return pagina("El link de baja no es válido. Respondé el mail con «baja» y te sacamos a mano.");
  await marcar(c, "baja");
  return pagina("Listo, te dimos de baja. No te vamos a escribir más.");
}

export const GET = baja;
// One-click unsubscribe (RFC 8058): los clientes de mail hacen POST al mismo link.
export const POST = baja;
