import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { Prosa } from "@/components/Prosa";
import { DatosContacto } from "@/components/Contacto";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Contacto", description: "Cómo comunicarte con Acopio Saludable: WhatsApp, email e Instagram. Dietética online con base en Villa Carlos Paz.", alternates: { canonical: "/contacto" } };

export default async function Pagina() {
  const cfg = await leerConfig();
  void cfg; void pesos; void Link; void DatosContacto;
  return (
    <div>
      <Titulo sobre="Contacto" bajada="Somos una dietética online con base en Villa Carlos Paz, Córdoba. No tenemos local a la calle: atendemos por estos medios.">Hablemos</Titulo>
      <Prosa>
        <DatosContacto />
        <h2>Antes de escribir</h2>
        <ul>
          <li>Costos y plazos de entrega: están en <Link href="/envios">Envíos</Link>.</li>
          <li>Problemas con un pedido: mirá <Link href="/cambios-y-devoluciones">Cambios y devoluciones</Link> y tené a mano el número de pedido.</li>
          <li>Compras para un negocio: armá el pedido en la web y, si necesitás algo que no ves en el catálogo, consultanos.</li>
        </ul>
      </Prosa>
    </div>
  );
}
