// Teléfonos argentinos a un solo formato, el de WhatsApp: 549 + área + número (13 dígitos).
// La gente escribe «0351 15 555-1234», «+54 9 351…», «3515551234»: si se toman «los últimos 10» sin
// sacar el 15, el mensaje le llega a otra persona. Todo lo que manda o busca por teléfono pasa por acá.

/** «0351 15 555-1234» → «5493515551234». null si no se puede armar un celular válido. */
export function telefonoWa(t: string | null | undefined): string | null {
  let d = String(t ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("549") && d.length === 13) return d;
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9") && d.length === 11) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 12) d = d.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  return d.length === 10 ? `549${d}` : null;
}

/** Los 10 dígitos que identifican el celular (área + número), para comparar. */
export function telefonoFin(t: string | null | undefined): string {
  const wa = telefonoWa(t);
  if (wa) return wa.slice(-10);
  const d = String(t ?? "").replace(/\D/g, "");
  return d.slice(-10);
}
