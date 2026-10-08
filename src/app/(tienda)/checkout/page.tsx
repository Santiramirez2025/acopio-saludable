import type { Metadata } from "next";
import { leerConfig } from "@/lib/config";
import { mpConfigurado } from "@/lib/mercadopago";
import { PROVINCIAS } from "@/lib/envios/geo";
import { Titulo } from "@/components/Tienda";
import { Checkout } from "@/components/Checkout";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function CheckoutPagina() {
  const cfg = await leerConfig();
  return (
    <div>
      <Titulo sobre="Finalizar compra">Datos, envío y pago</Titulo>
      <Checkout provincias={PROVINCIAS.map((p) => p.nombre)} mpDisponible={mpConfigurado()} descuentoTransferenciaPct={cfg.descuentoTransferenciaPct} />
    </div>
  );
}
