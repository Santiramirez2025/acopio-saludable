// Localidades vecinas a Villa Carlos Paz (Santiago, 16/11: «todo lo que es fuera de Carlos Paz se cobra envío;
// si no, es muy largo el viaje y muy corta la ganancia»). El reparto propio llega igual, en el mismo día,
// pero con un cargo por distancia. Sin cargo solo desde un pedido grande. Puro: se prueba sin base.
//
// Por código postal (la web) y por nombre (el chat) tienen que dar lo mismo: 5153 es San Antonio de Arredondo,
// Mayu Sumaj, Icho Cruz, Cuesta Blanca y Tala Huasi; 5155 Tanti y Cabalango; 5158 Bialet Massé y Parque Siquiman.
// Santa Cruz del Lago y Estancia Vieja comparten el 5152 con Carlos Paz y están pegadas: van como Carlos Paz.

export const VECINAS_SIN_CARGO_DESDE = 60000;

const POR_CP: Record<string, number> = { "5153": 3000, "5155": 4000, "5158": 4000 };

const POR_NOMBRE: [RegExp, number][] = [
  [/\b(san antonio de arredondo|san antonio|arredondo|mayu sumaj|icho cruz|villa rio icho cruz|cuesta blanca|tala huasi)\b/, 3000],
  [/\b(tanti|cabalango|bialet masse|villa parque siquiman|parque siquiman|siquiman)\b/, 4000],
];

const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Cargo por distancia de ese código postal: 0 en Carlos Paz y fuera del reparto propio. */
export function cargoVecinaPorCp(cp: string): number {
  return POR_CP[cp.replace(/\D/g, "").slice(0, 4)] ?? 0;
}

/** Cargo por distancia de esa localidad escrita a mano: 0 en Carlos Paz y sus barrios. */
export function cargoVecinaPorLugar(lugar: string): number {
  const t = sinTildes(lugar);
  // «San Antonio 450, Carlos Paz» es una calle: si nombra Carlos Paz, manda Carlos Paz.
  if (/\bcarlos paz\b|\bvcp\b/.test(t) && !/arredondo/.test(t)) return 0;
  return POR_NOMBRE.find(([re]) => re.test(t))?.[1] ?? 0;
}

/** Lo que se cobra en una vecina con ese subtotal: el cargo, o 0 desde el pedido grande. */
export function envioVecina(cargo: number, subtotal: number): number {
  return cargo > 0 && subtotal < VECINAS_SIN_CARGO_DESDE ? cargo : 0;
}
