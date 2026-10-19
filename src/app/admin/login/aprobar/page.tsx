import { redirect } from "next/navigation";
import { aprobarAcceso, verAprobacion } from "@/lib/acceso";

export const dynamic = "force-dynamic";

// El link llega por WhatsApp. Abrirlo no aprueba nada (las vistas previas también lo abren): hace falta tocar el botón.
export default async function Aprobar({ searchParams }: { searchParams: Promise<{ t?: string; ok?: string }> }) {
  const { t = "", ok } = await searchParams;
  const pedido = t ? await verAprobacion(t) : null;

  async function aprobar(fd: FormData) {
    "use server";
    const token = String(fd.get("t") ?? "");
    const bien = await aprobarAcceso(token);
    redirect(`/admin/login/aprobar?t=${encodeURIComponent(token)}&ok=${bien ? 1 : 0}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-semibold text-acopio-900">Acceso al panel</h1>
      {!pedido ? (
        <p className="text-sm text-stone-600">Este link no existe.</p>
      ) : ok === "1" || pedido.aprobado ? (
        <p className="tarjeta text-sm text-acopio-800">✅ Listo, acceso aprobado. La otra pantalla entra sola en unos segundos.</p>
      ) : pedido.vencido || ok === "0" ? (
        <p className="text-sm text-stone-600">Este pedido venció. Pedí acceso de nuevo desde la PC.</p>
      ) : (
        <form action={aprobar} className="tarjeta space-y-4">
          <p className="text-sm text-stone-700">Piden entrar desde: <b>{pedido.detalle}</b></p>
          <p className="text-sm text-stone-600">Aprobalo solo si fuiste vos o se lo pediste a Claude.</p>
          <input type="hidden" name="t" value={t} />
          <button className="btn w-full">Aprobar acceso</button>
        </form>
      )}
    </main>
  );
}
