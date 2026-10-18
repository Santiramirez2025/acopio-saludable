// Reglas de la bandeja de mensajes del panel: filtros, búsqueda y cómo se muestra cada charla.
// Puras a propósito (sin base ni red) para poder probarlas.

import { canalDe, type CanalChat } from "./meta-mensajes";

export type ResumenCharla = {
  telefono: string;
  nombre: string | null;
  estado: "bot" | "persona";
  noLeidos: number;
  ultimoMensaje: Date;
  anuncioId: string | null;
  anuncioTitulo: string | null;
  prospecto: string | null;
  baja: boolean;
  ultimoTexto: string | null;
  ultimoDe: "cliente" | "bot" | "persona" | null;
  /** Pedido armado en la charla y todavía sin cerrar. */
  pedido?: string | null;
  /** Pedidos hechos con este teléfono (sin cancelados) y cuántos esperan cobro o entrega. */
  compras?: number;
  aCobrar?: number;
};

/**
 * En qué punto de la venta está cada charla, para no mezclar clientes:
 * a cobrar (hizo el pedido y falta cobrar o entregar), cliente (ya compró), para cerrar (tiene un
 * pedido armado), negocio (prospección), consulta (escribió hace poco) y fría (más de 3 días sin moverse).
 */
export type Etapa = "cobrar" | "cliente" | "cerrar" | "negocio" | "consulta" | "fria";

export const ETAPAS: Record<Etapa, { nombre: string; clase: string }> = {
  cobrar: { nombre: "A cobrar", clase: "bg-rose-100 text-rose-800" },
  cliente: { nombre: "Cliente", clase: "bg-emerald-100 text-emerald-800" },
  cerrar: { nombre: "Para cerrar", clase: "bg-amber-100 text-amber-900" },
  negocio: { nombre: "Negocio", clase: "bg-tierra-100 text-tierra-700" },
  consulta: { nombre: "Consulta", clase: "bg-sky-100 text-sky-800" },
  fria: { nombre: "Fría", clase: "bg-stone-100 text-stone-600" },
};

const TRES_DIAS = 3 * 86_400_000;

export function etapaDe(c: ResumenCharla, ahora = new Date()): Etapa {
  if ((c.aCobrar ?? 0) > 0) return "cobrar";
  if ((c.compras ?? 0) > 0) return "cliente";
  if (c.pedido) return "cerrar";
  if (c.prospecto) return "negocio";
  return ahora.getTime() - new Date(c.ultimoMensaje).getTime() > TRES_DIAS ? "fria" : "consulta";
}

/** Te espera de verdad: la charla está en tus manos y lo último lo escribió el cliente. */
export const teEspera = (c: ResumenCharla) => c.estado === "persona" && c.ultimoDe === "cliente";

export const FILTROS = [
  ["todas", "Todas"],
  ["persona", "Te esperan"],
  ["cobrar", "A cobrar"],
  ["cerrar", "Para cerrar"],
  ["cliente", "Clientes"],
  ["consulta", "Consultas"],
  ["negocio", "Negocios"],
  ["fria", "Frías"],
  ["sin-leer", "Sin leer"],
  ["anuncios", "De anuncios"],
  ["whatsapp", "WhatsApp"],
  ["messenger", "Messenger"],
  ["instagram", "Instagram"],
] as const;

export type Filtro = (typeof FILTROS)[number][0];

export function filtroValido(f: string | undefined): Filtro {
  return (FILTROS.find(([id]) => id === f)?.[0] ?? "todas") as Filtro;
}

const sinAcentos = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function pasaFiltro(c: ResumenCharla, f: Filtro, q = ""): boolean {
  const canal = canalDe(c.telefono);
  const ok =
    f === "todas" ||
    (f === "sin-leer" && c.noLeidos > 0) ||
    (f === "persona" && teEspera(c)) ||
    (f === "anuncios" && Boolean(c.anuncioId)) ||
    ((f === "cobrar" || f === "cerrar" || f === "cliente" || f === "consulta" || f === "negocio" || f === "fria") && etapaDe(c) === f) ||
    f === canal;
  if (!ok) return false;
  const t = sinAcentos(q.trim());
  if (!t) return true;
  return sinAcentos(`${c.nombre ?? ""} ${c.telefono} ${c.ultimoTexto ?? ""}`).includes(t) || c.telefono.includes(t.replace(/\D/g, "") || "\u0000");
}

export function contar(charlas: ResumenCharla[]): Record<Filtro, number> {
  return Object.fromEntries(FILTROS.map(([id]) => [id, charlas.filter((c) => pasaFiltro(c, id)).length])) as Record<Filtro, number>;
}

/** Dos letras para el avatar: iniciales del nombre, o los últimos dígitos si no hay nombre. */
export function iniciales(nombre: string | null, clave: string): string {
  const palabras = (nombre ?? "").replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (palabras.length >= 2) return (palabras[0][0] + palabras[1][0]).toUpperCase();
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return clave.replace(/\D/g, "").slice(-2) || "?";
}

const ZONA = "America/Argentina/Cordoba";
const dia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: ZONA });

/** "ahora", "hace 5 min", "14:32" (hoy), "ayer", "lun", "12/10". */
export function cuando(fecha: Date, ahora = new Date()): string {
  const seg = (ahora.getTime() - fecha.getTime()) / 1000;
  if (seg < 60) return "ahora";
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (dia(fecha) === dia(ahora)) return fecha.toLocaleTimeString("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" });
  const ayer = new Date(ahora.getTime() - 86_400_000);
  if (dia(fecha) === dia(ayer)) return "ayer";
  if (seg < 6 * 86_400) return fecha.toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "short" }).replace(".", "");
  return fecha.toLocaleDateString("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit" });
}

/** Separador de día dentro de la charla: "Hoy", "Ayer" o la fecha larga. */
export function etiquetaDia(fecha: Date, ahora = new Date()): string {
  if (dia(fecha) === dia(ahora)) return "Hoy";
  if (dia(fecha) === dia(new Date(ahora.getTime() - 86_400_000))) return "Ayer";
  return fecha.toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });
}

export function mismoDia(a: Date, b: Date): boolean {
  return dia(a) === dia(b);
}

/** Cómo se muestra el que escribió último en la vista previa. */
export function prefijo(de: ResumenCharla["ultimoDe"]): string {
  return de === "persona" ? "Vos: " : de === "bot" ? "Vendedor: " : "";
}

export function telefonoLindo(clave: string): string {
  const canal = canalDe(clave);
  if (canal !== "whatsapp") return canal === "messenger" ? "Messenger" : "Instagram";
  const m = /^549(\d{2,4})(\d{2,4})(\d{4})$/.exec(clave);
  return m ? `+54 9 ${m[1]} ${m[2]}-${m[3]}` : `+${clave}`;
}

export const COLOR_CANAL: Record<CanalChat, string> = { whatsapp: "#25D366", messenger: "#0084FF", instagram: "#E1306C" };
