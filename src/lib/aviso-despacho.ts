// «Tu pedido ya salió» por WhatsApp, con el link para recomendar (5% para el amigo y 5% para él).
// Es el mejor momento para pedir la recomendación: el pedido está por llegar y la experiencia es buena.
// Si la charla está cerrada (más de 24 h sin escribir), va la plantilla aprobada y el link queda para después.

import type { Order } from "@prisma/client";
import { enviarTexto } from "./whatsapp-cloud";
import { registrarSalida, ventanaAbierta } from "./whatsapp-memoria";
import { avisarReparto } from "./aviso-reparto";
import { numeroPedido } from "./pedido-calculos";
import { mensajesDespacho } from "./despacho-texto";
import { urlSitio } from "./sitio";

function telefonoDe(p: Order): string | null {
  const d = p.telefono.replace(/\D/g, "");
  return d.length >= 10 ? `549${d.slice(-10)}` : null;
}

function primerNombre(p: Order): string {
  const n = p.nombre.trim().split(/\s+/)[0] ?? "";
  return n && !/cliente/i.test(n) ? n : "";
}

export async function avisarDespachoWhatsapp(p: Order): Promise<"texto" | "plantilla" | null> {
  const tel = telefonoDe(p);
  if (!tel) return null;
  const [uno, dos] = mensajesDespacho(p, urlSitio());
  if (await ventanaAbierta(tel).catch(() => false)) {
    if (!(await enviarTexto(tel, uno))) return null;
    await registrarSalida(tel, "persona", uno).catch(() => undefined);
    if (await enviarTexto(tel, dos)) await registrarSalida(tel, "persona", dos).catch(() => undefined);
    return "texto";
  }
  // Charla cerrada: la plantilla de «sale en el reparto» (aprobada). La recomendación va cuando conteste.
  return avisarReparto(tel, primerNombre(p), numeroPedido(p.id), "ahora", uno);
}
