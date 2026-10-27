// Una persona contesta por WhatsApp desde el panel, o le devuelve la charla al bot.
//
// La respuesta sale por la misma API que usa el bot. Si Meta la rechaza, lo más común es
// la ventana de 24 horas: pasado un día del último mensaje del cliente, solo se puede
// escribir con una plantilla aprobada. Ese error se devuelve tal cual para que se entienda.

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enviarPorCanal, retomarCharla } from "@/lib/atencion";
import { claveValida, ultimoErrorMeta } from "@/lib/meta-mensajes";
import { cambiarEstado, guardarPedido, marcarLeida, registrarSalida, ventanaAbierta } from "@/lib/whatsapp-memoria";
import { enviarMedia, enviarSaliente, subirMedia } from "@/lib/whatsapp-cloud";
import { marca } from "@/lib/whatsapp-media";
import { ID, ordenarParaVer, planVer, textoParaPanel, type Saliente } from "@/lib/whatsapp-interactivo";
import { combosTienda } from "@/lib/tienda";
import { pesos } from "@/lib/precios";
import { urlSitio } from "@/lib/sitio";
import { leerConfig } from "@/lib/config";
import { argumentoCombo } from "@/lib/combos-tema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // Un archivo (foto o documento) llega como multipart: se sube a Meta y se manda con el texto como pie.
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) return responderConArchivo(req);
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

  // Devolvérsela al vendedor: si el cliente quedó esperando, el vendedor le contesta ya.
  if (cuerpo.accion === "bot") {
    const contesto = await retomarCharla(telefono).catch((e) => {
      console.error("retomar charla falló", e);
      return false;
    });
    return NextResponse.json({ ok: true, estado: "bot", contesto });
  }
  if (cuerpo.accion === "persona") {
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
          ordenarParaVer((await combosTienda({ activo: true, tipo: "COMBO" })).filter((x) => x.disponible))
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

  // Fuera de las 24 horas Meta acepta el texto pero no lo entrega: se avisa en vez de perderlo callado.
  if (/^\d+$/.test(telefono) && !(await ventanaAbierta(telefono).catch(() => true))) {
    return NextResponse.json({ error: "Pasaron más de 24 horas desde su último mensaje: WhatsApp no entrega texto libre. Hace falta una plantilla." }, { status: 409 });
  }
  // Contestar a mano (Santiago desde el panel) toma la charla: el bot no se mete hasta que se la devuelvan.
  // Un agente que escribe (Nico, Caro…) NO la toma: si el cliente contesta, el vendedor sigue y cierra la venta
  // (el 26/10 Nico escribió a «Hola» de Zapala y la charla quedó muda cuando el cliente respondió).
  const esSantiago = Boolean(await getServerSession(authOptions));
  if ((esSantiago && cuerpo.accion !== "agente") || cuerpo.accion === "tomar") await cambiarEstado(telefono, "persona");
  // Un agente que le arma un pedido deja el carrito guardado: el vendedor sigue con ese, no con otro.
  if (typeof cuerpo.pedido === "string" && cuerpo.pedido.startsWith("/carrito?p=")) await guardarPedido(telefono, cuerpo.pedido.slice(0, 300));
  const enviado = await enviarPorCanal(telefono, texto);
  if (!enviado) {
    return NextResponse.json(
      { error: "Meta rechazó el envío. Si pasaron más de 24 horas del último mensaje del cliente, hace falta una plantilla aprobada (en Messenger e Instagram, no se puede contestar hasta que vuelva a escribir).", detalle: ultimoErrorMeta || undefined },
      { status: 502 },
    );
  }
  await registrarSalida(telefono, "persona", texto);
  return NextResponse.json({ ok: true });
}

const TOPE_ARCHIVO = 15 * 1024 * 1024;
const IMAGENES = new Set(["image/jpeg", "image/png"]);
const DOCUMENTOS = new Set(["application/pdf", "image/webp", "text/plain", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

/** Foto o archivo desde el panel: solo WhatsApp y con la ventana de 24 h abierta. */
async function responderConArchivo(req: Request) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  const telefono = claveValida(String(fd.get("telefono") ?? "")) ?? "";
  const archivo = fd.get("archivo");
  const caption = String(fd.get("texto") ?? "").trim().slice(0, 1024);
  if (!telefono || !/^\d+$/.test(telefono)) return NextResponse.json({ error: "Los archivos solo se mandan por WhatsApp" }, { status: 400 });
  if (!(archivo instanceof File) || !archivo.size) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (archivo.size > TOPE_ARCHIVO) return NextResponse.json({ error: "El archivo pesa más de 15 MB" }, { status: 400 });
  const mime = archivo.type || "application/octet-stream";
  const tipo = IMAGENES.has(mime) ? "image" : DOCUMENTOS.has(mime) ? "document" : null;
  if (!tipo) return NextResponse.json({ error: "Formato no admitido: mandá JPG, PNG o PDF" }, { status: 400 });
  if (!(await ventanaAbierta(telefono).catch(() => true))) {
    return NextResponse.json({ error: "Pasaron más de 24 horas desde su último mensaje: WhatsApp no deja mandar archivos. Hace falta una plantilla." }, { status: 409 });
  }
  const mediaId = await subirMedia(await archivo.arrayBuffer(), mime, archivo.name || "archivo");
  if (!mediaId) return NextResponse.json({ error: "Meta no aceptó el archivo" }, { status: 502 });
  await cambiarEstado(telefono, "persona");
  const enviado = await enviarMedia(telefono, tipo, mediaId, caption, archivo.name);
  if (!enviado) return NextResponse.json({ error: "Meta rechazó el envío del archivo" }, { status: 502 });
  await registrarSalida(telefono, "persona", `${marca(tipo, mediaId)} ${caption || (tipo === "document" ? archivo.name : "")}`.trim());
  return NextResponse.json({ ok: true });
}
