import type { Metadata } from "next";
import Link from "next/link";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { Prosa } from "@/components/Prosa";
import { DatosContacto } from "@/components/Contacto";
import { Titulo } from "@/components/Tienda";

export const metadata: Metadata = { title: "Política de privacidad", description: "Qué datos pide Acopio Saludable para procesar un pedido, para qué se usan y cómo pedir que se corrijan o eliminen.", alternates: { canonical: "/privacidad" } };

export default async function Pagina() {
  const cfg = await leerConfig();
  void cfg; void pesos; void Link; void DatosContacto;
  return (
    <div>
      <Titulo sobre="Legales">Política de privacidad</Titulo>
      <Prosa>
        <h2>Qué datos pedimos</h2>
        <p>Para procesar un pedido pedimos nombre, teléfono, email y dirección de entrega. No guardamos datos de tarjetas: el pago con tarjeta lo procesa Mercado Pago en su propio sitio.</p>
        <h2>Para qué los usamos</h2>
        <ul>
          <li>Preparar y entregar tu pedido.</li>
          <li>Avisarte sobre el estado del pedido o resolver un problema.</li>
          <li>Cumplir con obligaciones fiscales.</li>
        </ul>
        <p>No vendemos ni cedemos tus datos. Solo los compartimos con quienes participan de la entrega y del cobro: el correo y Mercado Pago.</p>
        <h2>Medición</h2>
        <p>El sitio usa Google Analytics y puede usar el píxel de Meta para saber cuántas visitas y compras hay y medir anuncios. Estas herramientas guardan cookies en tu navegador; podés bloquearlas desde la configuración del navegador sin que eso te impida comprar.</p>
        <h2>Tus derechos</h2>
        <p>Podés pedir en cualquier momento ver, corregir o eliminar tus datos, según la Ley 25.326 de Protección de Datos Personales. Escribinos:</p>
        <DatosContacto />
        <p>La Agencia de Acceso a la Información Pública es el órgano de control de esa ley y recibe denuncias y reclamos.</p>
      </Prosa>
    </div>
  );
}
