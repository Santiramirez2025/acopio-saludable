// 24/11 (seguridad): la acción «reprogramar» del panel manda la plantilla de seguimiento a una lista que arma un
// agente. Desde el 23/11 Santiago puede bloquear a un cliente («no se le escribe más») y quien pidió la baja
// tampoco recibe nada: el envío a mano no puede saltearse eso. Además el teléfono se normaliza (como el resto de
// los envíos) y un mismo número no recibe dos plantillas en la misma llamada.
import { telefonoWa } from "./telefono";

export type RenglonReprogramar = { telefono: string; nombre: string; dia: string; pedido: string };
export type PlanReprogramar = { enviar: RenglonReprogramar[]; salteados: Record<string, string> };

export const TOPE_REPROGRAMAR = 30;

// Pura: recibe la lista cruda del pedido y el conjunto de teléfonos (formato 549…) con baja o bloqueo.
export function planReprogramar(lista: unknown, conBaja: Set<string>): PlanReprogramar {
  const enviar: RenglonReprogramar[] = [];
  const salteados: Record<string, string> = {};
  const vistos = new Set<string>();
  for (const it of (Array.isArray(lista) ? lista : []).slice(0, TOPE_REPROGRAMAR)) {
    const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    const clave = String(o.pedido ?? o.telefono ?? "?");
    const tel = telefonoWa(typeof o.telefono === "string" ? o.telefono : String(o.telefono ?? ""));
    const dia = typeof o.dia === "string" ? o.dia.trim().slice(0, 40) : "";
    if (!tel) { salteados[clave] = "teléfono inválido"; continue; }
    if (!dia) { salteados[clave] = "falta el día"; continue; }
    if (conBaja.has(tel)) { salteados[clave] = "bloqueado o pidió la baja: no se le escribe"; continue; }
    if (vistos.has(tel)) { salteados[clave] = "repetido en la lista"; continue; }
    vistos.add(tel);
    const nombre = typeof o.nombre === "string" && o.nombre.trim() ? o.nombre.trim().slice(0, 40) : "¡hola";
    enviar.push({ telefono: tel, nombre, dia, pedido: String(o.pedido ?? "").slice(0, 20) });
  }
  return { enviar, salteados };
}

// Teléfonos normalizados de la lista, para preguntar a la base cuáles tienen baja.
export function telefonosDeLista(lista: unknown): string[] {
  const out = new Set<string>();
  for (const it of (Array.isArray(lista) ? lista : []).slice(0, TOPE_REPROGRAMAR)) {
    const t = telefonoWa(String((it as Record<string, unknown> | null)?.telefono ?? ""));
    if (t) out.add(t);
  }
  return [...out];
}
