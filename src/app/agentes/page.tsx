// Landing del Equipo de Agentes: lo que Acopio vende a otras empresas. El precio va primero (filtra),
// después el video y el formulario. Todo lleva al WhatsApp de Marcos con el texto #agentes.
import type { Metadata } from "next";
import { PRECIO_IMPLEMENTACION, PRECIO_MENSUAL } from "@/lib/vendedor-sistema";
import { Formulario } from "./formulario";

export const metadata: Metadata = {
  title: "Tu empresa manejada por agentes de IA · Acopio Saludable",
  description: "Acopio Saludable es una empresa manejada por 23 agentes de inteligencia artificial. Implementamos el mismo equipo en tu empresa: bot de WhatsApp que vende, pizarra de pedidos y agentes que trabajan todos los días.",
  robots: { index: true, follow: true },
};

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;
const VIDEO = process.env.NEXT_PUBLIC_VIDEO_AGENTES || "";

export default function Agentes() {
  return (
    <main className="min-h-screen bg-[#0b2a20] text-white">
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-14 md:pt-20">
        <div className="text-sm font-semibold uppercase tracking-widest text-amber-300">Acopio Saludable · Equipo de Agentes</div>
        <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
          Mi empresa la manejan 23 agentes de IA.
          <br />
          <span className="text-amber-300">Yo solo reparto.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/75 md:text-xl">
          Acopio Saludable es una dietética online de Villa Carlos Paz. El vendedor de WhatsApp cierra ventas y cobra las 24 horas, logística arma los pedidos y avisa a cada cliente, compras, finanzas, Mercado Libre, diseño y seguridad dejan su informe todos los días. Implementamos el mismo equipo, a medida, en tu empresa.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 text-[#0b2a20]">
            <div className="text-sm font-semibold uppercase tracking-wide text-[#0F6B4F]">Implementación llave en mano · 30 días</div>
            <div className="mt-1 text-4xl font-black md:text-5xl">{pesos(PRECIO_IMPLEMENTACION)}</div>
            <div className="text-sm text-black/60">+ IVA · 50% para arrancar, 50% al salir en vivo</div>
          </div>
          <div className="rounded-3xl bg-white/10 p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-amber-300">Equipo corriendo · por mes</div>
            <div className="mt-1 text-4xl font-black md:text-5xl">{pesos(PRECIO_MENSUAL)}</div>
            <div className="text-sm text-white/60">+ IVA · agentes, mejoras y soporte. Menos que un empleado, trabaja de noche y los domingos.</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/55">Es para empresas que ya venden (más de $10.000.000 por mes) y quieren vender más sin sumar gente. No hay versión chica.</p>
      </section>

      {VIDEO ? (
        <section className="mx-auto max-w-5xl px-6 pb-10">
          <div className="aspect-video overflow-hidden rounded-3xl bg-black">
            <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${VIDEO}?rel=0`} title="La oficina de Acopio Saludable" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-5xl px-6 pb-10">
        <h2 className="text-2xl font-black md:text-3xl">Qué te instalamos</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["Vendedor de WhatsApp 24/7", "Con tu catálogo, tus precios y tus reglas. Cotiza, arma el pedido, cobra por transferencia o Mercado Pago y te avisa. Lee audios, fotos y comprobantes."],
            ["Panel y pizarra", "Pedidos para armar, qué cobrar, ruta del reparto a tu WhatsApp, todos los mensajes en una pizarra donde intervenís cuando querés."],
            ["5 agentes a medida", "Los que más le rindan a tu negocio: ventas, seguimiento de clientes, cobros, compras, marketing. Trabajan todos los días y dejan su informe. Les hablás por chat o por voz."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-3xl bg-white/[.07] p-6">
              <div className="text-lg font-bold">{t}</div>
              <p className="mt-2 text-white/70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-3xl bg-white p-6 text-[#0b2a20] md:p-10">
          <h2 className="text-2xl font-black md:text-3xl">Hablemos 20 minutos</h2>
          <p className="mt-2 text-black/65">Contame de tu empresa y seguimos por WhatsApp. Si tu caso da, agendamos una llamada con Santiago, que armó el sistema y lo usa todos los días.</p>
          <Formulario />
        </div>
      </section>
    </main>
  );
}
