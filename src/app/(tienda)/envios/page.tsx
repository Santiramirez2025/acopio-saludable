import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { Prosa } from "@/components/Prosa";
import { DatosContacto } from "@/components/Contacto";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Envíos y entregas", description: "Zonas de entrega sin cargo en Villa Carlos Paz y sur de Punilla, envíos por correo al resto del país, plazos y costos.", alternates: { canonical: "/envios" } };

export default async function Pagina() {
  const cfg = await leerConfig();
  void cfg; void pesos; void Link; void DatosContacto;
  return (
    <div>
      <Titulo sobre="Envíos" bajada="Compramos la mercadería para cada pedido, por eso siempre hay un plazo de preparación antes de la entrega.">Envíos y entregas</Titulo>
      <Prosa>
        <h2>Entrega propia, sin cargo</h2>
        <p>Llevamos el pedido a tu casa o a tu negocio en Villa Carlos Paz, San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca. El plazo es de {cfg.plazoEntregaPropia} desde que se confirma el pago, y coordinamos el horario por WhatsApp. Los domingos no entregamos: lo que pidas el domingo se entrega a partir del lunes.</p>
        <h2>Resto del país, por correo</h2>
        <p>Despachamos en 24 a 48 hs hábiles y después corre el plazo del correo, que suele ser de 2 a 7 días hábiles según la zona. El costo se calcula en el carrito con tu código postal, antes de pagar, según el peso del pedido.</p>
        <h2>Día de corte</h2>
        <p>Los pedidos pagados antes de las {cfg.corteHora} h entran en la compra de ese día. Los que entran después pasan a la siguiente.</p>
        <h2>Productos congelados</h2>
        <p>Solo se entregan en la zona de entrega propia. No se envían por correo porque necesitan cadena de frío.</p>
        <h2>Compra mínima</h2>
        <p>{pesos(cfg.compraMinima)} por pedido, combinando los productos y combos que quieras.</p>
        <h2>Si no estás cuando llegamos</h2>
        <p>Te escribimos para coordinar una nueva entrega. En envíos por correo, el aviso de visita y el retiro en sucursal siguen las reglas de cada correo.</p>
      </Prosa>
    </div>
  );
}
