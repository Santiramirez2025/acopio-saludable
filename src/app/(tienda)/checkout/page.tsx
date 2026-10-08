import type { Metadata } from "next";
import Link from "next/link";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

// El checkout (datos, envío, Mercado Pago y transferencia) se construye en la Fase 3.
export default function Checkout() {
  return (
    <div className="mx-auto max-w-xl">
      <Titulo sobre="Finalizar compra">Estamos terminando el checkout</Titulo>
      <p className="text-stone-600">Tu carrito queda guardado en este dispositivo. Muy pronto vas a poder pagar con Mercado Pago o transferencia desde acá.</p>
      <Link href="/carrito" className="btn mt-4">Volver al carrito</Link>
    </div>
  );
}
