// Una persona contesta por WhatsApp desde el panel, o le devuelve la charla al bot.
//
// La respuesta sale por la misma API que usa el bot. Si Meta la rechaza, lo más común es
// la ventana de 24 horas: pasado un día del último mensaje del cliente, solo se puede
// escribir con una plantilla aprobada. Ese error se devuelve tal cual para que se entienda.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enviarPorCanal } from "@/lib/atencion";
import { claveValida } from "@/lib/meta-mensajes";
import { cambiarEstado, guardarPedido, marcarLeida, registrarSalida } from "@/lib/whatsapp-memoria";
import { enviarSaliente } from "@/lib/whatsapp-cloud";
import { ID, planVer, textoParaPanel, type Saliente } from "@/lib/whatsapp-interactivo";
import { combosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { urlSitio } from "@/lib/sitio";
import { leerConfig } from "@/lib/config";
import { argumentoCombo } from "@/lib/combos-tema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let cuerpo: { telefono?: unknown; texto?: unknown; accion?: unknown; pedido?: unknown; zonas?: unknown; combos?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const telefono = typeof cuerpo.telefono === "string" ? (claveValida(cuerpo.telefono) ?? "") : "";
  if (!telefono) return NextResponse.json({ error: "Falta el teléfono" }, { status: 400 });

  if (cuerpo.accion === "leida") {
    await marcarLeida(telefono);
    return NextResponse.json({ ok: true });
  }

  if (cuerpo.accion === "bot" || cuerpo.accion === "persona") {
    await cambiarEstado(telefono, cuerpo.accion);
    if (cuerpo.accion === "persona") await marcarLeida(telefono);
    return NextResponse.json({ ok: true, estado: cuerpo.accion });
  }

  const texto = typeof cuerpo.texto === "string" ? cuerpo.texto.trim().slice(0, 4000) : "";
  if (!texto) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  // Seguimiento: lo manda el vendedor (la charla sigue en sus manos), con los botones de zona si
  // se pide, y deja guardado el pedido para que al tocar la zona salga el envío y los botones de pago.
  if (cuerpo.accion === "seguimiento") {
    if (typeof cuerpo.pedido === "string" && cuerpo.pedido.startsWith("/carrito?p=")) await guardarPedido(telefono, cuerpo.pedido.slice(0, 300));
    const m: Saliente = cuerpo.zonas
      ? {
          tipo: "botones",
          cuerpo: texto.slice(0, 1024),
          botones: [
            { id: `${ID.zona}Carlos Paz`, titulo: "Carlos Paz y zona" },
            { id: `${ID.zona}Córdoba Capital`, titulo: "Córdoba Capital" },
            { id: `${ID.opcion}Otra ciudad`, titulo: "Otra ciudad" },
          ],
        }
      : { tipo: "texto", texto };
    // Con combos: true, después del texto va la lista de combos y el botón a la tienda.
    const cfgArg = await leerConfig();
    const extra: Saliente[] = cuerpo.combos
      ? planVer(
          (await combosTienda({ activo: true, tipo: "COMBO" }))
            .filter((x) => x.disponible)
            .sort((a, b) => a.precio - b.precio)
            .map((x) => ({ slug: x.slug, nombre: x.nombre, precio: pesos(Math.round(x.precio)), argumento: argumentoCombo(x, cfgArg.descuentoTransferenciaPct, pesos).corto })),
          `${urlSitio()}/combos`,
        )
      : [];
    for (const [i, msg] of [m, ...extra].entries()) {
      const ok = await enviarSaliente(telefono, msg);
      if (!ok) return NextResponse.json({ error: "Meta rechazó el envío (¿pasaron más de 24 horas?)", enviados: i }, { status: 502 });
      await registrarSalida(telefono, "bot", textoParaPanel(msg));
    }
    return NextResponse.json({ ok: true });
  }

  // Contestar a mano toma la charla: el bot no se mete hasta que se la devuelvan.
  await cambiarEstado(telefono, "persona");
  const enviado = await enviarPorCanal(telefono, texto);
  if (!enviado) {
    return NextResponse.json(
      { error: "Meta rechazó el envío. Si pasaron más de 24 horas del último mensaje del cliente, hace falta una plantilla aprobada (en Messenger e Instagram, no se puede contestar hasta que vuelva a escribir)." },
      { status: 502 },
    );
  }
  await registrarSalida(telefono, "persona", texto);
  return NextResponse.json({ ok: true });
}
