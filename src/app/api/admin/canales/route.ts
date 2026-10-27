// Precios por canal para los agentes (Diego · Mercado Libre, Cami · Marketplaces): el mismo CSV que
// /admin/canales.csv, pero fuera del middleware de sesión, así entra con la clave de agentes.
import { esAdmin } from "@/lib/admin-acceso";
import { csvCanales, respuestaCsvCanales } from "@/lib/canales-csv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await esAdmin())) return new Response("No autorizado", { status: 401 });
  return respuestaCsvCanales(await csvCanales());
}
