import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { Prosa } from "@/components/Prosa";
import { DatosContacto } from "@/components/Contacto";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Términos y condiciones", description: "Condiciones de compra en Acopio Saludable: precios, medios de pago, compra mínima, entregas y responsabilidad.", alternates: { canonical: "/terminos" } };

export default async function Pagina() {
  const cfg = await leerConfig();
  void cfg; void pesos; void Link; void DatosContacto;
  return (
    <div>
      <Titulo sobre="Legales">Términos y condiciones</Titulo>
      <Prosa>
        <p>Estas condiciones rigen las compras hechas en acopiosaludable.com. Al confirmar un pedido las aceptás.</p>
        <h2>Quiénes somos</h2>
        <p>Acopio Saludable es una tienda online de productos alimenticios con base en Villa Carlos Paz, Córdoba, Argentina. No tiene local de atención al público.</p>
        <h2>Precios</h2>
        <p>Están en pesos argentinos e incluyen impuestos. Pueden cambiar sin aviso, pero el precio de tu pedido queda fijo en el momento en que lo confirmás.</p>
        <h2>Compra mínima y medios de pago</h2>
        <p>La compra mínima es de {pesos(cfg.compraMinima)}. Se puede pagar por transferencia bancaria, con {cfg.descuentoTransferenciaPct}% de descuento, o con tarjeta y dinero en cuenta a través de Mercado Pago.</p>
        <h2>Disponibilidad</h2>
        <p>Compramos la mercadería al proveedor después de cada pedido. Si un producto no está disponible, te avisamos y elegís entre un reemplazo o el reintegro.</p>
        <h2>Entregas, cambios y devoluciones</h2>
        <p>Se rigen por lo publicado en <Link href="/envios">Envíos</Link> y en <Link href="/cambios-y-devoluciones">Cambios y devoluciones</Link>.</p>
        <h2>Información de los productos</h2>
        <p>Las fotos son ilustrativas. La información válida sobre ingredientes, alérgenos y aptitud sin TACC es la del rótulo del envase: revisala siempre antes de consumir. Los suplementos dietarios no reemplazan una dieta variada; consultá a tu médico.</p>
        <h2>Precio sugerido de reventa</h2>
        <p>Es una referencia. Cada comercio fija sus propios precios.</p>
        <h2>Ley aplicable</h2>
        <p>Rigen las leyes de la República Argentina, incluida la Ley 24.240 de Defensa del Consumidor.</p>
        <h2>Contacto</h2>
        <DatosContacto />
      </Prosa>
    </div>
  );
}
