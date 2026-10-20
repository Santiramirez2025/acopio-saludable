// Un negocio que nos deriva al dueño o a quien compra. Puro: se prueba sin base.
/**
 * «Te paso el número de la dueña, Lourdes» / «👤 Contacto: Lourdes 549351...»: a quién derivan y, si está,
 * su celular. null si no es una derivación.
 */
export function derivacion(texto: string): { telefono: string | null; nombre: string | null } | null {
  const t = texto.trim();
  // El celular, con o sin +54 9, con espacios o guiones: se junta todo lo que parezca número.
  const digitos = (t.match(/\+?\d[\d\s().-]{7,}\d/g) ?? []).map((x) => x.replace(/\D/g, "")).find((x) => x.length >= 10) ?? null;
  const celular = digitos ? (digitos.startsWith("549") ? digitos : digitos.startsWith("54") ? `549${digitos.slice(2)}` : digitos.length === 10 ? `549${digitos}` : digitos.length === 11 && digitos.startsWith("9") ? `54${digitos}` : digitos) : null;
  const contacto = /^(?:👤\s*)?Contacto:\s*(.+?)\s*\+?[\d\s-]{8,}$/.exec(t);
  const deriva = /(te paso|le paso|pas[aá]|pas[oó]|habl[aá]|comunic|escrib[ií]|contact)[^.]{0,60}(n[uú]mero|contacto|celu|whats|due[ñn][oa]|encargad[oa]|soci[oa]|compra|administra)/i.test(t) || /(due[ñn][oa]|encargad[oa]|soci[oa])[^.]{0,40}(n[uú]mero|contacto|celu|whats)/i.test(t);
  if (!contacto && !deriva) return null;
  const nombre = contacto?.[1]?.trim() || t.match(/(?:se llama|su nombre es|llamada|llamado)\s+([a-záéíóúñ]+)/i)?.[1] || t.match(/(?:due[ñn][oa]|encargad[oa]|soci[oa])[,:]?\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/)?.[1] || null;
  return { telefono: celular && /^549\d{10}$/.test(celular) ? celular : null, nombre: nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : null };
}
