// Una persona contesta por WhatsApp desde el panel, o le devuelve la charla al bot.
//
// La respuesta sale por la misma API que usa el bot. Si Meta la rechaza, lo más común es
// la ventana de 24 horas: pasado un día del último mensaje del cliente, solo se puede
// escribir con una plantilla aprobada. Ese error se devuelve tal cual para que se entienda.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enviarTexto } from "@/lib/whatsapp-cloud";
import { cambiarEstado, marcarLeida, registrarSalida } from "@/lib/whatsapp-memoria";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let cuerpo: { telefono?: unknown; texto?: unknown; accion?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const telefono = typeof cuerpo.telefono === "string" ? cuerpo.telefono.replace(/\D/g, "") : "";
  if (!telefono) return NextResponse.json({ error: "Falta el teléfono" }, { status: 400 });

  if (cuerpo.accion === "bot" || cuerpo.accion === "persona") {
    await cambiarEstado(telefono, cuerpo.accion);
    if (cuerpo.accion === "persona") await marcarLeida(telefono);
    return NextResponse.json({ ok: true, estado: cuerpo.accion });
  }

  const texto = typeof cuerpo.texto === "string" ? cuerpo.texto.trim().slice(0, 4000) : "";
  if (!texto) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  // Contestar a mano toma la charla: el bot no se mete hasta que se la devuelvan.
  await cambiarEstado(telefono, "persona");
  const enviado = await enviarTexto(telefono, texto);
  if (!enviado) {
    return NextResponse.json(
      { error: "Meta rechazó el envío. Si pasaron más de 24 horas del último mensaje del cliente, hace falta una plantilla aprobada." },
      { status: 502 },
    );
  }
  await registrarSalida(telefono, "persona", texto);
  return NextResponse.json({ ok: true });
}
