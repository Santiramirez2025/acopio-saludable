// Formulario de acopiosaludable.com/agentes: deja el lead en la bitácora y le avisa a Santiago.
// Después el navegador abre WhatsApp con el texto #agentes, así Marcos sigue la charla.
import { NextResponse } from "next/server";
import { registrarLeadFormulario } from "@/lib/vendedor-sistema";
import { telefonoWa } from "@/lib/telefono";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const campo = (k: string, max = 120) => String(b[k] ?? "").trim().slice(0, max);
  const telefono = telefonoWa(campo("telefono", 30));
  if (!telefono || !campo("empresa") || !campo("nombre")) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  const ok = await registrarLeadFormulario({ nombre: campo("nombre"), empresa: campo("empresa"), rubro: campo("rubro"), ciudad: campo("ciudad"), facturacion: campo("facturacion", 40), telefono, cargo: campo("cargo", 60) });
  // Freno a robots (muchos envíos seguidos o el mismo teléfono repetido): no se guarda ni se avisa,
  // pero la persona sigue por WhatsApp igual, que es donde Marcos atiende.
  if (!ok) return NextResponse.json({ error: "Demasiados envíos, seguí por WhatsApp" }, { status: 429 });
  return NextResponse.json({ ok: true });
}
