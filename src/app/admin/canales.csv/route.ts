// Precios por canal en CSV para el administrador (descarga desde el panel). Los agentes usan /api/admin/canales.
import { esAdmin } from "@/lib/admin-acceso";
import { csvCanales, respuestaCsvCanales } from "@/lib/canales-csv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await esAdmin())) return new Response("No autorizado", { status: 401 });
  return respuestaCsvCanales(await csvCanales());
}
