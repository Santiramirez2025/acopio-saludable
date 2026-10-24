// Reglas puras de Mercado Libre (sin red): qué puede decir una respuesta a una pregunta.
// ML pausa o sanciona si la respuesta tiene datos de contacto o invita a comprar por fuera.

const PROHIBIDO = [
  /https?:\/\/|www\.|\.com\b|\.ar\b/i,
  /whats ?app|wpp|instagram|facebook|telegram|mail|correo electr|@/i,
  /\b\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/,
  /por fuera|fuera de mercado libre|nuestra web|página web|pagina web/i,
];

/** Limpia la respuesta del modelo; null si queda vacía o rompe una regla (entonces la contesta Santiago). */
export function textoRespuestaMl(crudo: string): string | null {
  const t = crudo.replace(/^["«]|["»]$/g, "").replace(/\bperfecto\b[,!.]?\s*/gi, "").replace(/\s+\n/g, "\n").trim().slice(0, 1900);
  if (t.length < 5) return null;
  if (PROHIBIDO.some((r) => r.test(t))) return null;
  return t;
}
