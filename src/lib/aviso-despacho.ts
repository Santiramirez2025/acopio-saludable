// Avisos por WhatsApp del pedido en marcha:
// · «ya salió», con cómo paga (sin referidos: no se mezcla con la venta);
// · con el pedido pagado y entregado, gracias + link para recomendar (5% para el amigo y 5% para él).

import type { Order } from "@prisma/client";
import { enviarTexto } from "./whatsapp-cloud";
import { registrarSalida, ventanaAbierta } from "./whatsapp-memoria";
import { avisarReparto } from "./aviso-reparto";
import { numeroPedido } from "./pedido-calculos";
import { mensajeDespacho, mensajesGracias } from "./despacho-texto";
import { urlSitio } from "./sitio";
import { telefonoWa } from "./telefono";

function telefonoDe(p: Order): string | null {
  const d = p.telefono.replace(/\D/g, "");
  return telefonoWa(d);
}

function primerNombre(p: Order): string {
  const n = p.nombre.trim().split(/\s+/)[0] ?? "";
  return n && !/cliente/i.test(n) ? n : "";
}

export async function avisarDespachoWhatsapp(p: Order): Promise<"texto" | "plantilla" | null> {
  const tel = telefonoDe(p);
  if (!tel) return null;
  // Por correo (Andreani, etc.): no es «el reparto de hoy». Va «salió por X» con el seguimiento, solo con la charla abierta.
  if (p.envioOrigen && p.envioOrigen !== "propia") {
    const nombre = primerNombre(p);
    const t = `¡Hola${nombre ? ` ${nombre}` : ""}! Tu pedido ${numeroPedido(p.id)} ya salió por ${p.envioNombre}.${p.tracking ? ` Número de seguimiento: ${p.tracking}.` : " Apenas tengamos el número de seguimiento te lo pasamos."}`;
    if ((await ventanaAbierta(tel).catch(() => false)) && (await enviarTexto(tel, t))) {
      await registrarSalida(tel, "persona", t).catch(() => undefined);
      return "texto";
    }
    return null;
  }
  const texto = mensajeDespacho(p);
  if ((await ventanaAbierta(tel).catch(() => false)) && (await enviarTexto(tel, texto))) {
    await registrarSalida(tel, "persona", texto).catch(() => undefined);
    return "texto";
  }
  // Charla cerrada: la plantilla aprobada de «sale en el reparto».
  return avisarReparto(tel, primerNombre(p), numeroPedido(p.id), "ahora", texto);
}

/** Pedido pagado y entregado: gracias + link para recomendar. Si no está pago, no se manda nada. */
export async function agradecerConReferidos(p: Order): Promise<boolean> {
  if (!p.pagadoAt || p.estado !== "ENTREGADO") return false;
  const tel = telefonoDe(p);
  if (!tel || !(await ventanaAbierta(tel).catch(() => false))) return false;
  const [uno, dos] = mensajesGracias(p, urlSitio());
  if (!(await enviarTexto(tel, uno))) return false;
  await registrarSalida(tel, "persona", uno).catch(() => undefined);
  if (await enviarTexto(tel, dos)) await registrarSalida(tel, "persona", dos).catch(() => undefined);
  return true;
}
