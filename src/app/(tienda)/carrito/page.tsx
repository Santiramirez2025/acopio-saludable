import type { Metadata } from "next";
import { Titulo } from "@/components/Tienda";
import { VistaCarrito } from "@/components/VistaCarrito";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default function CarritoPagina() {
  return (
    <div>
      <Titulo sobre="Tu pedido">Carrito</Titulo>
      <VistaCarrito />
    </div>
  );
}
