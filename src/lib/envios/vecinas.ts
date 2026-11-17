// Localidades vecinas a Villa Carlos Paz (Santiago, 16/11: «todo lo que es fuera de Carlos Paz se cobra envío;
// si no, es muy largo el viaje y muy corta la ganancia»). El reparto propio llega igual, en el mismo día,
// pero con un cargo por distancia. Puro: se prueba sin base.
//
// 16/11 a la noche (Santiago, por un pedido a Parque Siquiman): «solo Carlos Paz es gratis, y San Antonio de Arredondo
// y por acá cerca; lo otro no es gratis, si no me sale más el combustible». Desde ahí el cargo se cobra SIEMPRE,
// sin umbral de pedido grande, y San Antonio de Arredondo y Mayu Sumaj van como Carlos Paz.
//
// Por código postal (la web) y por nombre (el chat): 5153 es San Antonio de Arredondo y Mayu Sumaj (sin cargo), y también
// Icho Cruz, Cuesta Blanca y Tala Huasi (que por nombre pagan); 5155 Tanti y Cabalango; 5158 Bialet Massé y Parque Siquiman.
// Santa Cruz del Lago y Estancia Vieja comparten el 5152 con Carlos Paz y están pegadas: van como Carlos Paz.

const POR_CP: Record<string, number> = { "5155": 5000, "5158": 5000 };

const POR_NOMBRE: [RegExp, number][] = [
  [/\b(icho cruz|villa rio icho cruz|cuesta blanca|tala huasi)\b/, 4000],
  [/\b(tanti|cabalango|bialet masse|villa parque siquiman|parque siquiman|siquiman)\b/, 5000],
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

/** Lo que se cobra en una vecina: el cargo, siempre (sin umbral de pedido grande). */
export function envioVecina(cargo: number, _subtotal?: number): number {
  return cargo > 0 ? cargo : 0;
}
