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

// 19/11 (Santiago, repartiendo): «el centro y 8 km a la redonda es sin cargo; todos los otros lugares tenemos que
// cobrar $3.000 o algo que no me haga caer la venta, pero que cobre: me mandaron de una punta a la otra, a lugares
// donde te metés y rompés el vehículo, y no le cobramos nada». Distancias en ruta desde el centro de Carlos Paz:
//   hasta ~8 km, sin cargo: Carlos Paz y sus barrios, Santa Cruz del Lago, Estancia Vieja, San Antonio de Arredondo
//     (ahí arranca el reparto).
//   8 a 14 km, $3.000: Mayu Sumaj, Icho Cruz, Tala Huasi, Bialet Massé, Cabalango.
//   más de 14 km, $4.000: Tanti, Cuesta Blanca.
//   Parque Siquiman: no se reparte (19/11); el vendedor ofrece un punto en Carlos Paz.
// 25/11 (Santiago, repartiendo): «en Carlos Paz sí cobramos $3.000, pero Bialet, Parque Siquiman, ya saliendo, eso ya no es
// Carlos Paz: agregale $1.000 o $2.000 más, que sea $5.000 el envío, siempre que no perdamos la venta».
// Carlos Paz y San Antonio $3.000 (config); 8 a 14 km $4.000; más de 14 km $5.000. Los pedidos ya tomados quedan como se vendieron.
export const CARGO_CERCA = 4000;
export const CARGO_LEJOS = 5000;

const POR_CP: Record<string, number> = { "5155": CARGO_LEJOS, "5158": CARGO_CERCA };

const POR_NOMBRE: [RegExp, number][] = [
  [/\b(tanti|cuesta blanca|villa parque siquiman|parque siquiman|siquiman)\b/, CARGO_LEJOS],
  [/\b(mayu sumaj|icho cruz|villa rio icho cruz|tala huasi|bialet masse|cabalango)\b/, CARGO_CERCA],
];

/** Las vecinas con cargo, como se las nombra en la tienda (mismo cargo que POR_NOMBRE; lo controla vecinas.test.ts). */
export const VECINAS_CON_CARGO: { lugares: string[]; cargo: number }[] = [
  { lugares: ["Mayu Sumaj", "Icho Cruz", "Tala Huasi", "Bialet Massé", "Cabalango"], cargo: CARGO_CERCA },
  { lugares: ["Tanti", "Cuesta Blanca"], cargo: CARGO_LEJOS },
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
