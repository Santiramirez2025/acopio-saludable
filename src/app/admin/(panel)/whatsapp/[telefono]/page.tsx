import Link from "next/link";
import { notFound } from "next/navigation";
import { conversacionDe, mensajesDe } from "@/lib/whatsapp-memoria";
import { RespuestaWhatsapp } from "@/components/RespuestaWhatsapp";

export const dynamic = "force-dynamic";

const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Charla({ params }: { params: Promise<{ telefono: string }> }) {
  const telefono = (await params).telefono.replace(/\D/g, "");
  const [c, mensajes] = await Promise.all([conversacionDe(telefono), mensajesDe(telefono)]);
  if (!c) notFound();
  const ultimoDelCliente = [...mensajes].reverse().find((m) => m.de === "cliente")?.fecha ?? null;
  const horasDesde = ultimoDelCliente ? (Date.now() - ultimoDelCliente.getTime()) / 3_600_000 : null;
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/whatsapp" className="text-sm text-stone-600 underline">← Todas las charlas</Link>
        <h1 className="mt-1 text-xl font-semibold">{c.nombre || `+${telefono}`}</h1>
        <p className="text-sm text-stone-600">
          +{telefono} · {c.estado === "persona" ? "La atiende una persona" : "La atiende el vendedor"}
          {horasDesde !== null && horasDesde > 24 && <span className="ml-2 chip bg-stone-200 text-stone-700">Hace más de 24 h que no escribe: Meta solo deja contestar con plantilla</span>}
        </p>
      </div>
      <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-4">
        {mensajes.map((m) => (
          <div key={m.id} className={`flex ${m.de === "cliente" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${m.de === "cliente" ? "bg-stone-100" : m.de === "persona" ? "bg-amber-100" : "bg-acopio-100"}`}>
              <div className="mb-0.5 text-[11px] uppercase tracking-wide text-stone-500">{m.de === "cliente" ? "Cliente" : m.de === "persona" ? "Vos" : "Vendedor"} · {FECHA.format(m.fecha)}</div>
              {m.texto}
            </div>
          </div>
        ))}
        {!mensajes.length && <p className="text-sm text-stone-600">Sin mensajes.</p>}
      </div>
      <RespuestaWhatsapp telefono={telefono} estado={c.estado} />
    </div>
  );
}
