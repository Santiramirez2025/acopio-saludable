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
};

export const FILTROS = [
  ["todas", "Todas"],
  ["sin-leer", "Sin leer"],
  ["persona", "Te esperan"],
  ["anuncios", "De anuncios"],
  ["prospectos", "Prospectos"],
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
    (f === "persona" && c.estado === "persona") ||
    (f === "anuncios" && Boolean(c.anuncioId)) ||
    (f === "prospectos" && Boolean(c.prospecto)) ||
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
