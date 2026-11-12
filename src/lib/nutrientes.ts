// Qué aporta cada producto, dicho para que lo entienda cualquiera (Santiago, 9/11: «información sobre los
// nutrientes, por qué vendemos esto, por qué es saludable»). Puro, sin base de datos: lo usan la ficha de
// producto (panel de la Nutri), el juego «¿Qué mix sos?» y el vendedor cuando le preguntan «¿para qué sirve?».
//
// Valores por 100 g, redondeados, de tablas públicas de composición de alimentos (USDA FoodData Central y
// tabla argentina ARGENFOODS). Son orientativos: el producto real varía por cosecha y origen. Nada de acá
// afirma que un alimento cure o prevenga una enfermedad: se habla de lo que APORTA, que es lo que dice el
// Código Alimentario Argentino que se puede decir.

export type Ingrediente = {
  nombre: string;
  /** por 100 g */
  kcal: number;
  proteina: number;
  grasa: number;
  carbohidratos: number;
  fibra: number;
  /** Lo que lo hace valioso, en palabras de todos los días (máximo 3). */
  destacados: string[];
};

export const INGREDIENTES = {
  nuez: { nombre: "Nuez", kcal: 654, proteina: 15, grasa: 65, carbohidratos: 14, fibra: 7, destacados: ["Omega-3 vegetal (9 g cada 100 g): la nuez es el fruto seco que más tiene", "Magnesio y antioxidantes", "Grasas buenas, de las que el cuerpo necesita"] },
  caju: { nombre: "Castaña de cajú", kcal: 553, proteina: 18, grasa: 44, carbohidratos: 30, fibra: 3, destacados: ["Hierro y zinc: 100 g cubren casi todo el día", "Magnesio (292 mg cada 100 g)", "Cremoso y saciante, el más suave de los frutos secos"] },
  almendra: { nombre: "Almendra", kcal: 579, proteina: 21, grasa: 50, carbohidratos: 22, fibra: 12, destacados: ["Vitamina E: un puñado cubre el día", "Calcio (269 mg cada 100 g), más que muchos lácteos", "Fibra: 12 g cada 100 g"] },
  mani: { nombre: "Maní", kcal: 567, proteina: 26, grasa: 49, carbohidratos: 16, fibra: 9, destacados: ["Proteína: 26 g cada 100 g, el que más tiene", "Magnesio y vitamina B3", "Rinde: el más económico de todos"] },
  pasas: { nombre: "Pasas de uva", kcal: 299, proteina: 3, grasa: 0.5, carbohidratos: 79, fibra: 4, destacados: ["Energía rápida y natural, sin azúcar agregada", "Potasio (749 mg cada 100 g)", "Hierro vegetal"] },
  datil: { nombre: "Dátil", kcal: 282, proteina: 2.5, grasa: 0.4, carbohidratos: 75, fibra: 8, destacados: ["Dulzor natural: reemplaza el azúcar en licuados y postres", "Fibra: 8 g cada 100 g", "Potasio y magnesio"] },
  girasol: { nombre: "Semilla de girasol", kcal: 584, proteina: 21, grasa: 52, carbohidratos: 20, fibra: 9, destacados: ["Vitamina E: la semilla que más tiene", "Magnesio (325 mg cada 100 g)", "Selenio"] },
  chia: { nombre: "Chía", kcal: 486, proteina: 17, grasa: 31, carbohidratos: 42, fibra: 34, destacados: ["Fibra: 34 g cada 100 g, un tercio de la semilla", "Omega-3 vegetal (18 g cada 100 g)", "Calcio (631 mg cada 100 g)"] },
  lino: { nombre: "Lino", kcal: 534, proteina: 18, grasa: 42, carbohidratos: 29, fibra: 27, destacados: ["Omega-3 vegetal: 23 g cada 100 g, el que más tiene", "Fibra: 27 g cada 100 g", "Se aprovecha mejor molido o bien masticado"] },
  sesamo: { nombre: "Sésamo", kcal: 573, proteina: 18, grasa: 50, carbohidratos: 23, fibra: 12, destacados: ["Calcio: 975 mg cada 100 g, el campeón", "Hierro y zinc", "Sabor tostado que levanta cualquier ensalada"] },
  avena: { nombre: "Avena", kcal: 389, proteina: 17, grasa: 7, carbohidratos: 66, fibra: 11, destacados: ["Beta-glucanos: la fibra soluble de la avena", "Energía lenta: sacia hasta el mediodía", "Proteína: 17 g cada 100 g"] },
  quinoa: { nombre: "Quinoa pop", kcal: 370, proteina: 13, grasa: 6, carbohidratos: 65, fibra: 7, destacados: ["Proteína completa: tiene los 9 aminoácidos esenciales", "Sin gluten", "Liviana y crocante, para el yogur"] },
  banana: { nombre: "Banana chips", kcal: 519, proteina: 2, grasa: 34, carbohidratos: 58, fibra: 8, destacados: ["Potasio", "Dulce y crocante", "Fibra: 8 g cada 100 g"] },
  miel: { nombre: "Miel", kcal: 304, proteina: 0.3, grasa: 0, carbohidratos: 82, fibra: 0, destacados: ["Energía natural", "Antioxidantes propios de la miel pura", "Endulza con menos cantidad que el azúcar"] },
  cacao: { nombre: "Cacao amargo", kcal: 228, proteina: 20, grasa: 14, carbohidratos: 58, fibra: 33, destacados: ["Magnesio: 499 mg cada 100 g, el alimento que más tiene", "Hierro (14 mg cada 100 g)", "Fibra y antioxidantes (flavanoles)"] },
} as const satisfies Record<string, Ingrediente>;

export type IdIngrediente = keyof typeof INGREDIENTES;

/** Receta aproximada de los mixes de la casa, en partes de 100. */
const RECETAS: Record<string, Partial<Record<IdIngrediente, number>>> = {
  "TG-MIXCG": { mani: 30, girasol: 20, pasas: 20, caju: 12, almendra: 10, nuez: 8 },
  "TG-MIXC": { mani: 35, pasas: 25, caju: 15, almendra: 15, nuez: 10 },
  "TG-MIXTSM": { caju: 45, pasas: 30, banana: 25 },
  "TG-MIXCAJUBAN": { caju: 50, banana: 50 },
  "TG-CAJUPASAS": { caju: 50, pasas: 50 },
  "LG-MIXSEM": { girasol: 35, lino: 25, sesamo: 25, chia: 15 },
  "LG-GTRAD": { avena: 60, miel: 15, mani: 10, pasas: 10, girasol: 5 },
  "LG-GPMANI": { avena: 60, mani: 25, miel: 15 },
  "TG-GPMANI": { avena: 60, mani: 25, miel: 15 },
};

/** Producto de un solo ingrediente → ingrediente. Las presentaciones chicas comparten el código base. */
const SIMPLES: Record<string, IdIngrediente> = {
  "TG-NUEZ": "nuez",
  "TG-CAJU": "caju",
  "LG-ALMNP": "almendra",
  "TG-ALMGUARA": "almendra",
  "TG-PASAS": "pasas",
  "LG-PASASRUBIAS": "pasas",
  "LG-DATIL": "datil",
  "TG-GIRASOL": "girasol",
  "LG-CHIA": "chia",
  "LG-LINO": "lino",
  "LG-SESAMO": "sesamo",
  "LG-AVENA": "avena",
  "TG-QUINOAPOP": "quinoa",
  "TG-BANANA": "banana",
  "LG-MIEL": "miel",
  "LG-CACAO": "cacao",
  "TG-MANI": "mani",
  "LG-MANI": "mani",
};

/** Para qué lo come la gente, y cómo (la parte que vende). */
const USO: Record<string, { paraQue: string; como: string; porcion: string }> = {
  nuez: { paraQue: "Para el corazón y la cabeza: es el fruto seco con más omega-3.", como: "4 o 5 mitades por día alcanzan. En el yogur, la ensalada o solas a media tarde.", porcion: "30 g ≈ 7 nueces" },
  caju: { paraQue: "Para no llegar con hambre a la cena y sumar hierro sin carne.", como: "Un puñado chico a las 17. Tostadas 5 minutos en sartén cambian todo.", porcion: "30 g ≈ 18 castañas" },
  almendra: { paraQue: "Para la piel y los huesos: vitamina E y calcio en un puñado.", como: "Remojadas de la noche anterior se digieren mejor.", porcion: "30 g ≈ 23 almendras" },
  mani: { paraQue: "Para rendir: la proteína más barata que hay.", como: "Sin sal, en el mix o en el desayuno. El que más llena por peso.", porcion: "30 g ≈ 40 granos" },
  pasas: { paraQue: "Para la energía de la mañana o antes de entrenar, sin azúcar agregada.", como: "Una cucharada en la avena, el yogur o el mate cocido.", porcion: "30 g ≈ 2 cucharadas" },
  datil: { paraQue: "Para endulzar sin azúcar: el postre que no te deja culpa.", como: "Dos dátiles en el licuado y no hace falta nada más. Con una nuez adentro, un bombón.", porcion: "30 g ≈ 3 dátiles" },
  girasol: { paraQue: "Para la piel: la semilla con más vitamina E.", como: "Tostadas sobre la ensalada o la sopa.", porcion: "30 g ≈ 3 cucharadas" },
  chia: { paraQue: "Para el intestino y la saciedad: un tercio de la semilla es fibra.", como: "Una cucharada en agua o leche 10 minutos y se hace pudding.", porcion: "15 g ≈ 1 cucharada" },
  lino: { paraQue: "Para el omega-3 vegetal: el que más tiene de todos.", como: "Molido en el momento sobre lo que comas; entero pasa de largo.", porcion: "15 g ≈ 1 cucharada" },
  sesamo: { paraQue: "Para los huesos: el alimento vegetal con más calcio.", como: "Tostado sobre arroz, ensaladas o verduras al horno.", porcion: "15 g ≈ 1 cucharada" },
  avena: { paraQue: "Para no tener hambre hasta el mediodía.", como: "Con leche o yogur la noche anterior (overnight oats) o cocida 3 minutos.", porcion: "40 g ≈ 4 cucharadas" },
  quinoa: { paraQue: "Para sumar proteína completa sin gluten, livianito.", como: "Sobre el yogur, la fruta o la ensalada. No hace falta cocinarla.", porcion: "20 g ≈ 1 taza chica" },
  banana: { paraQue: "Para un dulce crocante con potasio.", como: "En el mix o solas, mejor que una galletita.", porcion: "30 g ≈ 12 chips" },
  miel: { paraQue: "Para endulzar con algo que tiene algo adentro.", como: "Una cucharadita alcanza.", porcion: "10 g ≈ 1 cucharadita" },
  cacao: { paraQue: "Para el magnesio: nada tiene más.", como: "Una cucharada en la leche o el licuado, sin azúcar.", porcion: "10 g ≈ 1 cucharada" },
};

export type Nutrientes = {
  porcion: string;
  gramosPorcion: number;
  kcal: number;
  proteina: number;
  grasa: number;
  carbohidratos: number;
  fibra: number;
  destacados: string[];
  paraQue: string;
  como: string;
  /** Composición del mix en partes, si es un mix. */
  receta?: { nombre: string; partes: number }[];
};

const PORCION_G: Record<string, number> = { chia: 15, lino: 15, sesamo: 15, avena: 40, quinoa: 20, miel: 10, cacao: 10 };

function codigoBase(codigo: string): string {
  return codigo.replace(/-(500|250)$/i, "");
}

function escalar(n: number, g: number) {
  return Math.round((n * g) / 100 * 10) / 10;
}

/** Lo que aporta un producto, por porción. Null si no es de los nuestros o no sabemos qué lleva. */
export function nutrientesDe(codigo: string): Nutrientes | null {
  const base = codigoBase(codigo);
  const simple = SIMPLES[base];
  if (simple) {
    const i = INGREDIENTES[simple];
    const uso = USO[simple];
    const g = PORCION_G[simple] ?? 30;
    return {
      porcion: uso.porcion,
      gramosPorcion: g,
      kcal: Math.round((i.kcal * g) / 100),
      proteina: escalar(i.proteina, g),
      grasa: escalar(i.grasa, g),
      carbohidratos: escalar(i.carbohidratos, g),
      fibra: escalar(i.fibra, g),
      destacados: [...i.destacados],
      paraQue: uso.paraQue,
      como: uso.como,
    };
  }
  const receta = RECETAS[base];
  if (!receta) return null;
  const g = 30;
  const total = Object.values(receta).reduce((a, b) => a + (b ?? 0), 0) || 100;
  const suma = (k: keyof Ingrediente & ("kcal" | "proteina" | "grasa" | "carbohidratos" | "fibra")) =>
    Object.entries(receta).reduce((acc, [id, partes]) => acc + (INGREDIENTES[id as IdIngrediente][k] * (partes ?? 0)) / total, 0);
  // Los destacados del mix: el primero de cada ingrediente, del que más pesa al que menos, sin repetir tema.
  const ordenados = Object.entries(receta).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)) as [IdIngrediente, number][];
  const destacados: string[] = [];
  for (const [id] of ordenados) {
    const d = INGREDIENTES[id].destacados[0];
    if (d && !destacados.some((x) => x.split(":")[0] === d.split(":")[0])) destacados.push(`${INGREDIENTES[id].nombre}: ${d.charAt(0).toLowerCase()}${d.slice(1)}`);
    if (destacados.length === 3) break;
  }
  const esSemillas = base === "LG-MIXSEM";
  const esGranola = /GTRAD|GPMANI/.test(base);
  return {
    porcion: esGranola ? "40 g ≈ 4 cucharadas" : "30 g ≈ un puñado",
    gramosPorcion: g,
    kcal: Math.round((suma("kcal") * g) / 100),
    proteina: escalar(suma("proteina"), g),
    grasa: escalar(suma("grasa"), g),
    carbohidratos: escalar(suma("carbohidratos"), g),
    fibra: escalar(suma("fibra"), g),
    destacados,
    paraQue: esSemillas
      ? "Para el intestino y la saciedad: cuatro semillas que juntas suman fibra, calcio y omega-3."
      : esGranola
        ? "Para el desayuno que te lleva hasta el mediodía sin picar."
        : "Para picar algo de verdad: proteína y grasas buenas en vez de una galletita.",
    como: esSemillas
      ? "Una cucharada sobre el yogur, la ensalada o la avena. Lo que no muelas, masticalo bien."
      : esGranola
        ? "Con leche, yogur o fruta. Rinde 25 desayunos el kilo."
        : "Un puñado a media mañana o antes de entrenar. En un frasco en el escritorio dura el mes.",
    receta: ordenados.map(([id, partes]) => ({ nombre: INGREDIENTES[id].nombre, partes: Math.round((partes / total) * 100) })),
  };
}

/** Qué le preguntamos a la gente en «¿Qué mix sos?» y a dónde la mandamos. */
export const OBJETIVOS_MIX = [
  { id: "energia", nombre: "Energía para el día", emoji: "⚡", pide: "Algo que me levante a media mañana sin café" },
  { id: "entrenar", nombre: "Entrenar mejor", emoji: "🏋️", pide: "Proteína y algo rápido antes o después del gym" },
  { id: "intestino", nombre: "Comer más fibra", emoji: "🌱", pide: "Que me ayude a ir bien al baño y a sentirme liviano" },
  { id: "corazon", nombre: "Cuidar el corazón", emoji: "❤️", pide: "Grasas buenas, omega-3, lo que dice el médico" },
  { id: "dulce", nombre: "Dejar el azúcar", emoji: "🍯", pide: "Algo dulce que no sea azúcar" },
  { id: "oficina", nombre: "Picar sano en la oficina", emoji: "💼", pide: "Un frasco en el escritorio que no me dé culpa" },
] as const;

export type ObjetivoMix = (typeof OBJETIVOS_MIX)[number]["id"];

export type Recomendacion = {
  codigo: string;
  tipo: "producto" | "combo";
  titulo: string;
  porQue: string;
  /** Qué agregarle para completar, con código. */
  suma?: { codigo: string; tipo: "producto" | "combo"; nombre: string; porQue: string };
};

/**
 * Las respuestas son los objetivos elegidos (hasta 2) y si come maní.
 * Devuelve lo que le conviene de lo que tenemos, con el porqué dicho en una frase.
 */
export function recomendarMix(objetivos: ObjetivoMix[], sinMani: boolean): Recomendacion {
  const tiene = (o: ObjetivoMix) => objetivos.includes(o);
  if (tiene("intestino")) {
    return {
      codigo: "LG-MIXSEM", tipo: "producto", titulo: "Mix de semillas (lino, chía y sésamo)",
      porQue: "Lino, chía, sésamo y girasol: entre las cuatro suman más fibra que cualquier fruto seco, más calcio y omega-3. Una cucharada por día y se nota en una semana.",
      suma: { codigo: "LG-DATIL", tipo: "producto", nombre: "Dátiles con carozo", porQue: "8 g de fibra cada 100 g y endulzan el yogur sin azúcar." },
    };
  }
  if (tiene("corazon")) {
    return {
      codigo: "TG-NUEZ", tipo: "producto", titulo: "Nuez mariposa",
      porQue: "Es el fruto seco con más omega-3 vegetal, lo que más se recomienda para el corazón. Cuatro o cinco mitades por día alcanzan.",
      suma: { codigo: "LG-MIXSEM", tipo: "producto", nombre: "Mix de semillas", porQue: "El lino y la chía suman más omega-3 y fibra." },
    };
  }
  if (tiene("dulce")) {
    return {
      codigo: "LG-DATIL", tipo: "producto", titulo: "Dátiles con carozo",
      porQue: "Dulzor natural con fibra y potasio: dos dátiles en el licuado y no hace falta azúcar. Con una nuez adentro, es un bombón.",
      suma: { codigo: "TG-PASAS", tipo: "producto", nombre: "Pasas de uva", porQue: "Para la avena y el mate cocido de la mañana." },
    };
  }
  if (tiene("entrenar")) {
    return sinMani
      ? { codigo: "TG-CAJUPASAS", tipo: "producto", titulo: "Cajú con pasas", porQue: "Proteína y hierro del cajú con la energía rápida de la pasa: lo que se come antes de entrenar, sin maní.", suma: { codigo: "TG-NUEZ", tipo: "producto", nombre: "Nuez", porQue: "Omega-3 para la recuperación." } }
      : { codigo: "TG-MIXC", tipo: "producto", titulo: "Mix Clásico con cajú", porQue: "Maní, almendra, cajú y nuez: casi 6 g de proteína por puñado, y las pasas te dan la energía rápida para entrenar.", suma: { codigo: "LG-AVENA", tipo: "producto", nombre: "Avena", porQue: "Energía lenta para el desayuno de los días que entrenás." } };
  }
  if (tiene("oficina")) {
    return sinMani
      ? { codigo: "TG-MIXTSM", tipo: "producto", titulo: "Mix Tropical sin maní", porQue: "Cajú, frutas tropicales y pasas: dulce y crocante, sin maní. Un frasco en el escritorio dura el mes.", suma: { codigo: "TG-NUEZ", tipo: "producto", nombre: "Nuez", porQue: "Para el frasco de al lado." } }
      : { codigo: "TG-MIXCG", tipo: "producto", titulo: "Mix Clásico con cajú y girasol", porQue: "Seis cosas en un puñado, el mix que más se vende: sacia a las 17 y no es una galletita.", suma: { codigo: "LG-DATIL", tipo: "producto", nombre: "Dátiles", porQue: "El dulce de después del almuerzo." } };
  }
  // energía o nada elegido
  return sinMani
    ? { codigo: "TG-CAJUPASAS", tipo: "producto", titulo: "Cajú con pasas", porQue: "Energía rápida de la pasa y la saciedad del cajú, sin maní.", suma: { codigo: "LG-MIXSEM", tipo: "producto", nombre: "Mix de semillas", porQue: "Para el desayuno." } }
    : { codigo: "TG-MIXC", tipo: "producto", titulo: "Mix Clásico con cajú", porQue: "Frutos secos y pasas: grasas buenas que te sostienen y azúcar natural que te levanta. Un puñado a media mañana reemplaza el segundo café.", suma: { codigo: "LG-DATIL", tipo: "producto", nombre: "Dátiles con carozo", porQue: "El dulce de la tarde." } };
}
