// Pizarra de armado de pedidos (para ver en la TV mientras se preparan).
import { pizarraArmado } from "@/lib/armado";
import { PizarraArmado } from "../pizarra-armado";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pizarra de armado · Acopio" };

export default async function Armado() {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <PizarraArmado p={await pizarraArmado()} puedeMarcar volver="/admin/empresa/3d" />
    </div>
  );
}
