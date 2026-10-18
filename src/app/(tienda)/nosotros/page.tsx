import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { Prosa } from "@/components/Prosa";
import { DatosContacto } from "@/components/Contacto";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description: "Acopio Saludable es una distribuidora de alimentos saludables de Villa Carlos Paz, Córdoba: frutos secos, granolas, semillas y combos para hogares y negocios, con envíos a todo el país.",
  alternates: { canonical: "/nosotros" },
};

export default async function Nosotros() {
  const cfg = await leerConfig();
  return (
    <div>
      <Titulo sobre="Quiénes somos" bajada="Una distribuidora de alimentos saludables de Villa Carlos Paz, Córdoba, para hogares y negocios.">Acopio Saludable</Titulo>
      <Prosa>
        <p>
          Acopio Saludable vende frutos secos, granolas, semillas, cereales, productos sin TACC y combos para la compra del mes. Compramos por volumen a productores y marcas que elegimos, fraccionamos y rotulamos cada pedido con fecha, y lo enviamos a domicilio.
        </p>
        <h2>Cómo trabajamos</h2>
        <ul>
          <li>Tienda online, sin local de atención al público. Pedís en la web o por WhatsApp.</li>
          <li>Entrega propia sin cargo en Villa Carlos Paz y alrededores, y envíos por Correo Argentino a todo el país.</li>
          <li>Compra mínima de {pesos(cfg.compraMinima)}. Pagás con Mercado Pago o por transferencia.</li>
          <li>Precios a la vista en cada producto, con el precio por kilo y el precio por transferencia.</li>
        </ul>
        <h2>Para negocios</h2>
        <p>
          Abastecemos a alojamientos, gimnasios, cafeterías y kioscos con pedidos por volumen. Podés calcular el desayuno de tu alojamiento en el <Link href="/cotizador-hoteles">cotizador para hoteles</Link> o armar un pedido por rubro en <Link href="/nichos">Por negocio</Link>.
        </p>
        <h2>Datos del comercio</h2>
        <p>
          Acopio Saludable es un emprendimiento de Santiago Agustín Ramírez · CUIT 20-37092832-1 · Responsable monotributo · Villa Carlos Paz, Córdoba, Argentina.
        </p>
        <p>
          Políticas: <Link href="/envios">Envíos</Link> · <Link href="/cambios-y-devoluciones">Cambios y devoluciones</Link> · <Link href="/terminos">Términos y condiciones</Link> · <Link href="/privacidad">Privacidad</Link>.
        </p>
        <h2>Contacto</h2>
        <DatosContacto />
      </Prosa>
    </div>
  );
}
