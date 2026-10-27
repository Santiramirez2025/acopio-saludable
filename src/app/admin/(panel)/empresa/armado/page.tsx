// Pizarra de armado de pedidos (para ver en la TV mientras se preparan).
import { pizarraArmado } from "@/lib/armado";
import { PizarraArmado } from "../pizarra-armado";
import { cargarOficina } from "../datos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pizarra de armado · Acopio" };

export default async function Armado() {
  const [p, oficina] = await Promise.all([pizarraArmado(), cargarOficina().catch(() => null)]);
  const gonza = oficina?.agentes.find((a) => a.id === "logistica");
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <PizarraArmado p={p} puedeMarcar volver="/admin/empresa/3d" gonza={gonza} />
    </div>
  );
}
