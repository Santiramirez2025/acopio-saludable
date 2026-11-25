// 25/11 (seguridad): la acción «reparto» del panel (POST /api/admin/whatsapp/prospectos) le manda a una lista que
// arma un agente el texto libre «tu pedido sale hoy» (o la plantilla si la charla está cerrada). Era el único envío a
// mano que no pasaba por ningún freno: no miraba el bloqueo de Santiago («no se le escribe más») ni la baja, no
// normalizaba el teléfono, no frenaba un monto sin «$» (bash se come «$24…») y un mismo número podía recibir dos
// avisos en la misma llamada. Mismo criterio que «reprogramar» y que /whatsapp/responder.
import { telefonoWa } from "./telefono";
import { montoSinSigno } from "./monto-sin-signo";

export type RenglonReparto = { telefono: string; nombre: string; pedido: string; hora: string; texto: string };
export type PlanReparto = { enviar: RenglonReparto[]; salteados: Record<string, string> };

export const TOPE_REPARTO = 30;

// Pura: recibe la lista cruda y el conjunto de teléfonos (formato 549…) con baja o bloqueo.
export function planReparto(lista: unknown, conBaja: Set<string>): PlanReparto {
  const enviar: RenglonReparto[] = [];
  const salteados: Record<string, string> = {};
  const vistos = new Set<string>();
  for (const it of (Array.isArray(lista) ? lista : []).slice(0, TOPE_REPARTO)) {
    const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    const pedido = typeof o.pedido === "string" ? o.pedido.trim().slice(0, 20) : "";
    const tel = telefonoWa(typeof o.telefono === "string" ? o.telefono : String(o.telefono ?? ""));
    const clave = pedido || (tel ? tel.slice(-4) : "?");
    const texto = typeof o.texto === "string" ? o.texto.trim().slice(0, 1000) : "";
    if (!tel) { salteados[clave] = "teléfono inválido"; continue; }
    if (!pedido) { salteados[clave] = "falta el pedido"; continue; }
    if (!texto) { salteados[clave] = "falta el texto"; continue; }
    const m = montoSinSigno(texto);
    if (m) { salteados[clave] = `«${m}» parece un precio sin el signo $: revisá el monto y mandalo con -d '…' entre comillas simples`; continue; }
    if (conBaja.has(tel)) { salteados[clave] = "bloqueado o pidió la baja: no se le escribe (avisale a Santiago)"; continue; }
    if (vistos.has(tel)) { salteados[clave] = "repetido en la lista"; continue; }
    vistos.add(tel);
    const nombre = typeof o.nombre === "string" ? o.nombre.trim().slice(0, 40) : "";
    const hora = typeof o.hora === "string" && o.hora.trim() ? o.hora.trim().slice(0, 20) : "ahora";
    enviar.push({ telefono: tel, nombre, pedido, hora, texto });
  }
  return { enviar, salteados };
}

// Teléfonos normalizados de la lista, para preguntar a la base cuáles tienen baja.
export function telefonosReparto(lista: unknown): string[] {
  const out = new Set<string>();
  for (const it of (Array.isArray(lista) ? lista : []).slice(0, TOPE_REPARTO)) {
    const t = telefonoWa(String((it as Record<string, unknown> | null)?.telefono ?? ""));
    if (t) out.add(t);
  }
  return [...out];
}
