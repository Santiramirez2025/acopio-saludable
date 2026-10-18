import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { numeroPedido } from "@/lib/pedidos";
import { urlSitio } from "@/lib/sitio";

/** Sticker para imprimir (6 x 6 cm): el negocio lo escanea y repite el pedido en un clic. */
export default async function QrReposicion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pedido = /^\d+$/.test(id) ? await prisma.order.findUnique({ where: { id: Number(id) }, select: { id: true, token: true, nombre: true } }) : null;
  if (!pedido) notFound();
  const url = `${urlSitio()}/reponer/${pedido.token}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#10251C", light: "#FFFFFF" } });
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600 print:hidden">Sticker de reposición del pedido {numeroPedido(pedido.id)} ({pedido.nombre}). Imprimilo con Ctrl+P (o Cmd+P) y pegalo en la caja o en la alacena del negocio.</p>
      <div style={{ width: "6cm", height: "6cm" }} className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white p-3 text-center text-[#10251C]">
        <div className="text-[9pt] font-bold leading-tight">¿Se terminó? Reponé en un clic</div>
        <div style={{ width: "3.6cm", height: "3.6cm" }} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="text-[7pt] leading-tight">Escaneá y te cargamos el mismo pedido con los precios de hoy · Acopio Saludable</div>
      </div>
    </div>
  );
}
