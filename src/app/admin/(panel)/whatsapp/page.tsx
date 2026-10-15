import Link from "next/link";
import { listarConversaciones, RETOMA_HORAS } from "@/lib/whatsapp-memoria";
import { cloudActivo } from "@/lib/whatsapp-cloud";

export const dynamic = "force-dynamic";

const FECHA = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function bonito(telefono: string): string {
  // 5493541519630 → +54 9 3541 51-9630. Si no es argentino, se muestra como viene.
  const m = /^549(\d{2,4})(\d{2,4})(\d{4})$/.exec(telefono);
  return m ? `+54 9 ${m[1]} ${m[2]}-${m[3]}` : `+${telefono}`;
}

export default async function WhatsappPanel() {
  const charlas = await listarConversaciones();
  const esperando = charlas.filter((c) => c.estado === "persona" && c.noLeidos > 0).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-xl font-semibold">WhatsApp</h1>
        <p className="text-sm text-stone-600">
          {cloudActivo() ? "Conectado a la Cloud API." : "Falta configurar la Cloud API."}{" "}
          {esperando > 0 && <span className="chip bg-amber-100 text-amber-800">{esperando} esperando una persona</span>}
        </p>
      </div>
      <p className="text-sm text-stone-600">
        El vendedor contesta solo. Cuando alguien pide hablar con una persona, o cuando contestás a mano, la charla queda en tus manos y el bot se calla.
        Si no escribís en {RETOMA_HORAS} horas, el vendedor la retoma solo para que nadie quede hablando sin respuesta.
      </p>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Último mensaje</th>
              <th className="px-3 py-2">Quién atiende</th>
              <th className="px-3 py-2 text-right">Cuándo</th>
            </tr>
          </thead>
          <tbody>
            {charlas.map((c) => (
              <tr key={c.telefono} className={`border-t border-stone-100 ${c.noLeidos > 0 ? "bg-amber-50/60" : ""}`}>
                <td className="px-3 py-2">
                  <Link href={`/admin/whatsapp/${c.telefono}`} className="font-medium text-acopio-700 underline">{c.nombre || bonito(c.telefono)}</Link>
                  {c.nombre && <div className="text-xs text-stone-600">{bonito(c.telefono)}</div>}
                  {c.anuncioId && <div className="mt-0.5 text-xs font-medium text-sky-700" title={c.anuncioTitulo ?? undefined}>Vino de un anuncio{c.anuncioTitulo ? `: ${c.anuncioTitulo.slice(0, 40)}` : ""}</div>}
                </td>
                <td className="max-w-[420px] truncate px-3 py-2 text-stone-700">
                  {c.noLeidos > 0 && <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-acopio-600 px-1.5 text-xs font-bold text-white">{c.noLeidos}</span>}
                  {c.ultimoTexto ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`chip ${c.estado === "persona" ? "bg-amber-100 text-amber-800" : "bg-acopio-100 text-acopio-700"}`}>{c.estado === "persona" ? "Una persona" : "El vendedor"}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-stone-600">{FECHA.format(c.ultimoMensaje)}</td>
              </tr>
            ))}
            {!charlas.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-stone-600">Todavía no escribió nadie por WhatsApp.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
