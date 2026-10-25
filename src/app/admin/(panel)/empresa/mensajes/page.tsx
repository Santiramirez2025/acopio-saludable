// Pizarra de mensajes en el panel: todo lo que entra, y desde cada tarjeta se contesta o se toma la charla.
import { pizarraMensajes } from "@/lib/pizarra-mensajes";
import { PizarraMensajes } from "../pizarra-mensajes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mensajes en vivo · Acopio" };

export default async function Mensajes() {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <PizarraMensajes p={await pizarraMensajes()} volver="/admin/empresa" />
    </div>
  );
}
