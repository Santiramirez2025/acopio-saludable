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

/** Qué trae cada publicación de ML, por su SKU: para calcular el costo de hoy. */
export const SKU_ML: Record<string, { combo?: string; codigo?: string; cantidad?: number }> = {
  "AS-DESPENSA-4KG": { combo: "despensa-4-kilos" },
  "AS-ALACENA-3KG": { combo: "alacena-de-frutos-secos" },
  "AS-PANDULCE": { combo: "pan-dulce-casero" },
  "AS-REGALO-NAVIDAD": { combo: "regalo-navideno" },
  "AS-MIXC-2KG": { codigo: "TG-MIXC", cantidad: 2 },
  "AS-MIXC-3KG": { codigo: "TG-MIXC", cantidad: 3 },
};

/** Cargos de ML (Clásica, alimentos) y envío que paga el vendedor desde $33.000. Revisar cada tanto. */
const ML = { comision: 0.133, iibb: 0.03, envio: 9000, fijos: [[15000, 1610], [25000, 3315], [33000, 4017]] as [number, number][], bolsa: 400 };

function netoMl(precio: number): number {
  const fijo = ML.fijos.find(([hasta]) => precio < hasta)?.[1] ?? 0;
  return precio * (1 - ML.comision - ML.iibb) - fijo - (precio >= 33000 ? ML.envio : 0);
}

/** El precio redondo (de a $500) más bajo que deja al menos la ganancia mínima: $8.000 o el 30% del costo. */
export function precioMinimoMl(costo: number): number {
  const ganancia = Math.max(8000, costo * 0.3);
  let p = Math.ceil(((costo + ML.bolsa + ganancia) / (1 - ML.comision - ML.iibb)) / 500) * 500;
  while (netoMl(p) - costo - ML.bolsa < ganancia) p += 500;
  // Bajar mientras siga alcanzando (los cargos fijos son por tramos).
  while (p > 500 && netoMl(p - 500) - costo - ML.bolsa >= ganancia) p -= 500;
  return p;
}
