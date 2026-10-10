import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { Prosa } from "@/components/Prosa";
import { DatosContacto } from "@/components/Contacto";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Cambios y devoluciones", description: "Cómo arrepentirte de una compra, qué hacer si un producto llegó dañado o equivocado y cómo se hace el reintegro.", alternates: { canonical: "/cambios-y-devoluciones" } };

export default async function Pagina() {
  const cfg = await leerConfig();
  void cfg; void pesos; void Link; void DatosContacto;
  return (
    <div>
      <Titulo sobre="Cambios y devoluciones" bajada="Si algo no llegó como esperabas, lo resolvemos.">Cambios y devoluciones</Titulo>
      <Prosa>
        <h2 id="arrepentimiento">Botón de arrepentimiento</h2>
        <p>Podés arrepentirte de tu compra dentro de los 10 días corridos desde que recibiste el pedido, sin dar explicaciones. Para hacerlo, escribinos por cualquiera de estos medios con tu número de pedido:</p>
        <DatosContacto />
        <p>El producto tiene que estar cerrado, sin uso y en su envase original. Coordinamos el retiro o la devolución y te reintegramos el importe por el mismo medio de pago.</p>
        <h2>Llegó dañado, vencido o equivocado</h2>
        <p>Avisanos dentro de las 48 horas de recibido, con una foto del producto y del envase. Te lo reponemos sin cargo o te devolvemos el dinero, lo que prefieras.</p>
        <h2>Lo que no tiene cambio</h2>
        <ul>
          <li>Alimentos abiertos o con el envase roto por el uso.</li>
          <li>Productos fraccionados a pedido una vez abiertos.</li>
          <li>Congelados, salvo que hayan llegado en mal estado.</li>
        </ul>
        <h2>Falta de un producto</h2>
        <p>Si el proveedor no entrega algo de tu pedido, te avisamos y elegís entre un reemplazo o el reintegro de ese producto.</p>
        <h2>Reintegros</h2>
        <p>Se hacen por el mismo medio con el que pagaste. Con Mercado Pago, el plazo de acreditación depende de la tarjeta; por transferencia, lo hacemos dentro de los 5 días hábiles.</p>
      </Prosa>
    </div>
  );
}
