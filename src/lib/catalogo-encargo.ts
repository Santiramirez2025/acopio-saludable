// Productos POR ENCARGO de La Granja (Santiago, 14/11: «vemos los productos de la granja y los controlamos
// diariamente… todos los productos nuevos que agregamos son por encargo, que quede aclarado»).
//
// No los tenemos en mano: se piden a La Granja con el pedido del cliente y llegan en el reparto en 24 a 48 hs.
// La tienda, el carrito y el vendedor lo dicen en cada lugar (ver POR_ENCARGO y AVISO_ENCARGO).
//
// Costo = precio por kilo de la «LISTA DE PRECIOS MAYORISTAS 13 NOV» × lo que lleva la bolsa (los fraccionados)
// o el precio del envase (los de marca). El margen sale de una sola regla por tamaño de costo, para que la lista
// sea pareja y no un número a mano por producto. Cuando llega una lista nueva, el código del proveedor
// (codigoProveedor) deja actualizar el costo solo.

import type { ProductoProveedor } from "./catalogo-proveedores";
import { FILAS_LISTA } from "./catalogo-encargo-lista";

const SUELTO = "Sin marca / fraccionado";

/** Margen sobre el costo: lo barato lleva más (la bolsa y el fraccionado pesan), lo caro menos (si no, no se vende). */
export function margenEncargo(costo: number, tipo: "fraccionado" | "envasado" | "especia" | "suplemento"): number {
  if (tipo === "especia") return 1.6;
  if (tipo === "suplemento") return 0.4;
  if (tipo === "fraccionado") return costo < 1500 ? 1 : costo < 3000 ? 0.8 : costo < 6000 ? 0.65 : costo < 10000 ? 0.6 : costo < 15000 ? 0.55 : 0.45;
  return costo < 1500 ? 0.7 : costo < 5000 ? 0.6 : costo < 10000 ? 0.55 : costo < 20000 ? 0.5 : 0.4;
}

export type Fila = [codigo: string, codigoProveedor: string, producto: string, marca: string, presentacion: string, categoria: string, contenido: number, unidad: "g" | "ml", costo: number, porQue: string];

/** Bolsa fraccionada: precio por kilo de la lista × gramos. */
const kg = (precioKilo: number, gramos: number) => Math.round((precioKilo * gramos) / 1000);

const FILAS_ELEGIDAS: Fila[] = [
  // ——— Frutos secos, chocolates y harinas de frutos secos ———
  ["LG-MIXTROP", "981-006", "Mix tropical", SUELTO, "x 1 kg", "Frutos secos y mix", 1000, "g", 10574, "Frutos secos con frutas tropicales: el mix más dulce, para los chicos y la merienda."],
  ["LG-ALMCHOC-250", "023-003", "Almendras con chocolate semiamargo", SUELTO, "x 250 g", "Frutos secos y mix", 250, "g", kg(36660, 250), "Almendra entera bañada en chocolate semiamargo: para regalar o para el postre."],
  ["LG-MANICHOC-250", "023-007", "Maní con chocolate semiamargo", SUELTO, "x 250 g", "Frutos secos y mix", 250, "g", kg(17607, 250), "El clásico de la golosinería, en bolsa de casa."],
  ["LG-ARANDCHOC-250", "023-010", "Arándanos con chocolate semiamargo", SUELTO, "x 250 g", "Frutos secos y mix", 250, "g", kg(26668, 250), "Arándano ácido con chocolate semiamargo: el que se termina primero en la mesa."],
  ["LG-LENTCHOC-250", "023-015", "Lentejas de chocolate", SUELTO, "x 250 g", "Repostería", 250, "g", kg(21568, 250), "Para decorar tortas y galletitas, o para los chicos."],
  ["LG-GOTAS-250", "023-016", "Gotas de chocolate semiamargo", SUELTO, "x 250 g", "Repostería", 250, "g", kg(11507, 250), "No se derriten en el horno: para cookies, budines y muffins."],
  ["LG-HALMENDRA-250", "981-019", "Harina de almendras sin piel", SUELTO, "x 250 g", "Harinas y Féculas", 250, "g", kg(34511, 250), "Almendra molida fina: para macarons, budines sin harina de trigo y rebozar."],
  ["LG-HCOCO-500", "981-020", "Harina de coco", SUELTO, "x 500 g", "Harinas y Féculas", 500, "g", kg(7337, 500), "Absorbe mucho líquido y rinde: para panqueques, budines y tortas."],

  // ——— Frutas desecadas y para pan dulce ———
  ["LG-MANGO-500", "980-042", "Mango en cubos", SUELTO, "x 500 g", "Frutas desecadas", 500, "g", kg(8001, 500), "Dulce y tierno: solo, en el yogur o en el mix."],
  ["LG-ANANA-500", "980-006", "Ananá en trozos", SUELTO, "x 500 g", "Frutas desecadas", 500, "g", kg(12333, 500), "Ananá deshidratado de colores: para el mix, la granola o la tabla."],
  ["LG-GOJI-250", "978-208", "Bayas de goji", SUELTO, "x 250 g", "Frutas desecadas", 250, "g", kg(20410, 250), "Ácidas y chiquitas: sobre el yogur, el açaí o la avena."],
  ["LG-PELON-500", "010-021", "Pelones de durazno", "Sin marca / envasado", "x 500 g", "Frutas desecadas", 500, "g", kg(12481, 500), "Durazno sin carozo deshidratado: el postre de la abuela, con o sin hervir."],
  ["LG-COCOESC-250", "004-006", "Coco en escamas", SUELTO, "x 250 g", "Frutas desecadas", 250, "g", kg(14742, 250), "Escamas grandes de coco: tostadas 3 minutos en sartén, para bowls y granola."],
  ["LG-PAPAYA-500", "009-130", "Papaya en cubos de colores", SUELTO, "x 500 g", "Frutas desecadas", 500, "g", kg(8207, 500), "La fruta del pan dulce y del budín navideño."],
  ["LG-FRUTAESC-500", "009-117", "Fruta escurrida", SUELTO, "x 500 g", "Frutas desecadas", 500, "g", kg(5704, 500), "Fruta abrillantada surtida para pan dulce casero."],

  // ——— Semillas y granos ———
  ["LG-AMARANTO-500", "001-203", "Amaranto en semilla", SUELTO, "x 500 g", "Semillas y granos", 500, "g", kg(8214, 500), "Grano andino: se cocina como el arroz o se popea en sartén."],
  ["LG-PSYLLIUM-250", "001-259", "Psyllium en semillas", SUELTO, "x 250 g", "Semillas y granos", 250, "g", kg(13724, 250), "Fibra soluble: una cucharadita en agua o en el pan casero sin TACC para que levante."],
  ["LG-SESAMONEG-250", "001-271", "Sésamo negro", SUELTO, "x 250 g", "Semillas y granos", 250, "g", kg(11418, 250), "Para sushi, panes y ensaladas: el contraste negro sobre todo."],
  ["LG-SARRACENO-500", "001-275", "Trigo sarraceno en semilla", SUELTO, "x 500 g", "Semillas y granos", 500, "g", kg(10955, 500), "No es trigo: se cocina como el arroz o se muele para panqueques."],
  ["LG-PISINGALLO", "001-245", "Maíz pisingallo", SUELTO, "x 1 kg", "Semillas y granos", 1000, "g", kg(1658, 1000), "Para hacer pochoclos en casa: un kilo rinde muchas películas."],
  ["LG-LEVNUTRI-250", "950-004", "Levadura nutricional en copos", SUELTO, "x 250 g", "Semillas y granos", 250, "g", kg(10288, 250), "Sabor a queso sin lácteos: sobre pastas, pochoclos y verduras."],
  ["LG-GERMEN-500", "001-219", "Germen de trigo", SUELTO, "x 500 g", "Cereales y granolas", 500, "g", kg(2288, 500), "Una cucharada en el yogur, la avena o la masa del pan."],
  ["LG-SALVAVENA-500", "001-264", "Salvado de avena", SUELTO, "x 500 g", "Cereales y granolas", 500, "g", kg(2398, 500), "Fibra de avena: en el desayuno, las milanesas o el pan casero."],

  // ——— Legumbres y granos para cocinar ———
  ["LG-ADUKI", "001-258", "Porotos aduki", SUELTO, "x 1 kg", "Legumbres", 1000, "g", kg(1870, 1000), "Poroto rojo chico de cocción rápida: guisos, hamburguesas y ensaladas."],
  ["LG-MUNG", "001-255", "Porotos mung", SUELTO, "x 1 kg", "Legumbres", 1000, "g", kg(2260, 1000), "Para germinar en casa o para un dal: se cocinan sin remojo largo."],
  ["LG-ARVEJAS-400", "916-512", "Arvejas partidas", "Sin marca / envasado", "x 400 g", "Legumbres", 400, "g", 655, "Para el guiso y la sopa crema de invierno."],
  ["LG-ALUBIA-400", "916-508", "Porotos alubia", "Sin marca / envasado", "x 400 g", "Legumbres", 400, "g", 1069, "El poroto blanco de la cazuela y el guiso de mondongo."],
  ["LG-SOJATEX", "001-278", "Soja texturizada gruesa", SUELTO, "x 1 kg", "Legumbres", 1000, "g", kg(1547, 1000), "Hidratada en caldo, reemplaza la carne picada en salsas, empanadas y rellenos."],
  ["LG-BURGOL", "001-272", "Trigo burgol fino", SUELTO, "x 1 kg", "Cereales y granolas", 1000, "g", kg(2052, 1000), "Para tabule y kibbe: se hidrata en agua caliente, sin cocinar."],

  // ——— Cereales ———
  ["LG-AVENAINST", "001-297", "Avena arrollada instantánea", SUELTO, "x 1 kg", "Cereales y granolas", 1000, "g", kg(2379, 1000), "Más fina: se hidrata en un minuto, ideal para licuados y overnight oats."],
  ["LG-AVENAGRUESA", "001-296", "Avena arrollada gruesa", SUELTO, "x 1 kg", "Cereales y granolas", 1000, "g", kg(2379, 1000), "La de copo entero: para granola casera, galletas y porridge."],
  ["LG-COPOSMAIZ", "941-017", "Copos de maíz naturales sin TACC", "Nani", "x 150 g", "Cereales y granolas", 150, "g", 1386, "Copos sin azúcar agregada, rotulados sin TACC."],
  ["LG-ALMOHCHOC-500", "919-014", "Almohaditas rellenas de chocolate", SUELTO, "x 500 g", "Cereales y granolas", 500, "g", kg(9318, 500), "El cereal que piden los chicos, en bolsa de medio kilo."],

  // ——— Harinas (reemplazan las de Harinar) ———
  ["LG-HINTEGRAL", "001-209", "Harina integral agroecológica", SUELTO, "x 1 kg", "Harinas y Féculas", 1000, "g", 2805, "Molienda integral agroecológica: para pan casero, pizza y galletas."],
  ["LG-HGARBANZO", "001-230", "Harina de garbanzos", SUELTO, "x 1 kg", "Harinas y Féculas", 1000, "g", kg(1622, 1000), "Para fainá, tortillas y rebozar."],
  ["LG-HALGARROBA-500", "001-285", "Harina de algarroba", SUELTO, "x 500 g", "Harinas y Féculas", 500, "g", kg(5950, 500), "Dulce y sin cafeína: reemplaza parte del cacao en budines y licuados."],
  ["LG-HARROZ-NATUZEN", "917-013", "Harina de arroz sin TACC", "Natuzen", "x 1 kg", "Harinas y Féculas", 1000, "g", 3434, "Base de la cocina sin TACC, envasada y rotulada por Natuzen."],
  ["LG-ALMIDON-NATUZEN", "917-012", "Almidón de maíz sin TACC", "Natuzen", "x 1 kg", "Harinas y Féculas", 1000, "g", 3434, "Para alfajores de maicena y para espesar, rotulado sin TACC."],
  ["LG-HAVENA-CUMANA", "911-001", "Harina de avena sin gluten", "Cumaná", "x 400 g", "Harinas y Féculas", 400, "g", 3006, "Avena certificada sin gluten, molida: para panqueques y budines."],

  // ——— Repostería ———
  ["LG-MASCABO", "004-001", "Azúcar integral mascabo", SUELTO, "x 1 kg", "Repostería", 1000, "g", kg(2852, 1000), "Azúcar sin refinar, con gusto a caramelo: para budines, café y galletas."],
  ["LG-IMPALPABLE", "101-031", "Azúcar impalpable", "Alzol", "x 1 kg", "Repostería", 1000, "g", 2799, "Para glasé, bañar alfajores y espolvorear."],
  ["LG-POLVOHORNEAR-NANI", "941-035", "Polvo de hornear sin TACC", "Nani", "x 200 g", "Repostería", 200, "g", 2702, "Rotulado sin TACC: sirve para toda la repostería de la casa."],
  ["LG-VAINILLA-110", "904-001", "Esencia de vainilla", SUELTO, "x 110 cc", "Repostería", 110, "ml", 1270, "La vainilla de todas las tortas."],
  ["LG-PREMEZCLA-NUTRIZIO", "914-001", "Premezcla universal sin TACC", "Nutrizio", "x 1 kg", "Harinas y Féculas", 1000, "g", 5227, "Reemplaza la harina común en tortas, tartas y masas, rotulada sin TACC."],
  ["LG-PIZZA-NATUZEN", "917-017", "Premezcla para pizza sin TACC", "Natuzen", "x 450 g", "Harinas y Féculas", 450, "g", 3577, "Pizza casera sin TACC: rinde dos pizzas medianas."],
  ["LG-BIZCO-NATUZEN", "917-019", "Premezcla para bizcochuelo sin TACC", "Natuzen", "x 450 g", "Harinas y Féculas", 450, "g", 3577, "Bizcochuelo sin TACC: le sumás huevos y aceite."],

  // ——— Sin TACC de marca ———
  ["LG-NATUZEN-CHIPS", "917-002", "Galletitas con chips de chocolate sin TACC", "Natuzen", "x 200 g", "Sin TACC", 200, "g", 2162, "Las más pedidas de Natuzen para la merienda."],
  ["LG-NATUZEN-BIZCO", "917-004", "Bizcochitos de grasa sin TACC", "Natuzen", "x 200 g", "Sin TACC", 200, "g", 2162, "Para el mate, rotulados sin TACC."],
  ["LG-NATUZEN-POLVO", "917-024", "Polvorones de vainilla sin TACC", "Natuzen", "x 130 g", "Sin TACC", 130, "g", 1367, "Se deshacen en la boca: para el mate o el café."],
  ["LG-YUKA-FIDLENT", "903-013", "Fideos tirabuzón de lentejas sin TACC", "Yuka", "x 250 g", "Sin TACC", 250, "g", 2453, "Pasta de legumbre: más proteína que el fideo común y sin TACC."],
  ["LG-YUKA-FIDGARB", "903-011", "Fideos tirabuzón de garbanzos sin TACC", "Yuka", "x 250 g", "Sin TACC", 250, "g", 2453, "Pasta de garbanzo sin TACC: se cocina en 8 minutos."],
  ["LG-NANI-FIDARROZ", "941-007", "Fideos de arroz sin TACC", "Nani", "x 350 g", "Sin TACC", 350, "g", 2317, "Para salteados y sopas, rotulados sin TACC."],
  ["LG-AVENA-CUMANA", "911-002", "Avena instantánea sin gluten", "Cumaná", "x 400 g", "Sin TACC", 400, "g", 3006, "Avena certificada sin gluten: la que puede comer un celíaco."],
  ["LG-TOSTADAS-LIBERA", "927-001", "Tostadas de arroz clásicas", "Libera", "x 140 g", "Galletas, alfajores y discos", 140, "g", 852, "Livianas y crocantes: con palta, queso o mermelada."],

  // ——— Untables, aceites y endulzantes ———
  ["LG-PMANI-NATURAL", "967-020", "Pasta de maní natural", "Entrenuts", "x 370 g", "Almacen", 370, "g", 3560, "Solo maní tostado, sin azúcar agregada."],
  ["LG-PMANI-CROCANTE", "967-021", "Pasta de maní crocante", "Entrenuts", "x 370 g", "Almacen", 370, "g", 3560, "Con trocitos de maní: para tostadas y licuados."],
  ["LG-PMANI-CACAO", "967-022", "Pasta de maní con cacao", "Entrenuts", "x 370 g", "Almacen", 370, "g", 3560, "La alternativa a la crema de avellanas, con maní y cacao."],
  ["LG-PMANI-1KG", "967-027", "Pasta de maní natural", "Entrenuts", "x 1 kg", "Almacen", 1000, "g", 7558, "El pote grande para el que la come todos los días."],
  ["LG-COCO-NEUTRO", "967-030", "Aceite de coco neutro", "Entrenuts", "x 360 cc", "Almacen", 360, "ml", 7027, "Sin olor ni gusto a coco: para cocinar y hornear."],
  ["LG-TAHINI", "950-002", "Pasta de sésamo (tahini)", "Sytari", "x 200 g", "Almacen", 200, "g", 4764, "Para hummus casero y aderezos."],
  ["LG-OLIVA-500", "935-002", "Aceite de oliva extra virgen", "Pisi", "x 500 cc", "Almacen", 500, "ml", 14293, "Oliva extra virgen de San Juan."],
  ["LG-MERM-FROJOS", "913-006", "Mermelada de frutos rojos con stevia", "Rincón de Vida", "x 400 g", "Almacen", 400, "g", 5267, "Endulzada con stevia, sin azúcar agregada."],
  ["LG-DDL-STEVIA", "958-006", "Dulce de leche con stevia", "Trini", "x 400 g", "Almacen", 400, "g", 6698, "Dulce de leche sin azúcar agregada."],
  ["LG-STEVIA-250", "916-401", "Stevia líquida", "Sin marca / envasado", "x 250 cc", "Almacen", 250, "ml", 2495, "Unas gotas endulzan el mate o el café."],

  // ——— Infusiones ———
  ["LG-TE-VERDE", "947-008", "Té verde", "Heredia", "x 25 saquitos", "Café, yerba e infusiones", 25, "g", 3943, "Té verde en saquitos de una marca serrana."],
  ["LG-TE-MANZANILLA", "947-041", "Té de manzanilla", "Heredia", "x 25 saquitos", "Café, yerba e infusiones", 25, "g", 3994, "Manzanilla para después de comer."],
  ["LG-TE-NOCHE", "947-015", "Infusión Noche", "Heredia", "x 25 saquitos", "Café, yerba e infusiones", 25, "g", 5069, "Blend de hierbas para la última taza del día."],
  ["LG-TE-CURCUMA", "947-054", "Infusión de cúrcuma y jengibre", "Heredia", "x 25 saquitos", "Café, yerba e infusiones", 25, "g", 5185, "Picante suave y cálida: con miel y limón."],
  ["LG-HIBISCUS-100", "983-550", "Flor de hibiscus", SUELTO, "x 100 g", "Café, yerba e infusiones", 100, "g", kg(16854, 100), "Infusión roja y ácida, rica fría en verano."],

  // ——— Suplementos (los que más piden los gimnasios) ———
  ["LG-CREATINA-300", "951-003", "Creatina monohidrato", "Hoch Sport", "x 300 g", "Suplementos", 300, "g", 22557, "Creatina pura en polvo: 5 g por día, rinde 60 tomas."],
  ["LG-WHEY-CHOC", "951-043", "Whey protein sabor chocolate", "Nucleo Fit", "x 907 g", "Suplementos", 907, "g", 50321, "Proteína de suero en polvo: con leche o agua después de entrenar."],
  ["LG-BARRITAS-ENTRENUTS", "967-033", "Barritas proteicas chocomaní", "Entrenuts", "x 10 unidades", "Suplementos", 10, "g", 16160, "Caja de 10 barritas: la colación del que entrena."],
  ["LG-MAGNESIO-NG", "912-004", "Magnesio 400", "NG", "x 30 comprimidos", "Suplementos", 30, "g", 3868, "Un comprimido por día, un mes."],
  ["LG-COLAGENO-250", "951-005", "Colágeno hidrolizado", "Nucleo Fit", "x 250 g", "Suplementos", 250, "g", 22986, "Colágeno en polvo, sin sabor: en el café o el licuado."],

  // ——— Especias y sal (las que más usan rotiserías y pizzerías) ———
  ["LG-OREGANO-100", "978-235", "Orégano", SUELTO, "x 100 g", "Especias", 100, "g", kg(5780, 100), "Hojas de orégano para la pizza y la salsa."],
  ["LG-CHIMI-100", "977-005", "Chimichurri", SUELTO, "x 100 g", "Especias", 100, "g", kg(6912, 100), "La mezcla para el asado: hidratala en aceite y vinagre."],
  ["LG-PIMENTON-100", "977-016", "Pimentón dulce", SUELTO, "x 100 g", "Especias", 100, "g", kg(7457, 100), "Pimentón de selección, para guisos y adobos."],
  ["LG-ADOBOPIZZA-100", "977-001", "Adobo para pizza", SUELTO, "x 100 g", "Especias", 100, "g", kg(6734, 100), "Orégano, ajo y especias: listo para la salsa."],
  ["LG-PEREJIL-100", "977-015", "Perejil deshidratado", SUELTO, "x 100 g", "Especias", 100, "g", kg(8326, 100), "Para salsas, rellenos y la tortilla."],
  ["LG-SALGRUESA", "005-109", "Sal rosada del Himalaya gruesa", SUELTO, "x 1 kg", "Almacen", 1000, "g", 2606, "Para molinillo o para la parrilla."],
];

/** Los elegidos a mano (con su texto) más el resto de la lista de La Granja (16/11: todo por encargo). */
const FILAS: Fila[] = [...FILAS_ELEGIDAS, ...FILAS_LISTA];

/** Rubros a mano donde las palabras clave no alcanzan (el resto lo clasifica el ajuste del catálogo). */
const NICHOS_POR_CATEGORIA: Record<string, string[]> = { Especias: ["rotiserias", "familias", "dieteticas"], "Sin TACC": ["familias", "dieteticas", "cafeterias"] };

const TIPO_POR_CATEGORIA: Record<string, "especia" | "suplemento"> = { Especias: "especia", Suplementos: "suplemento" };
/** Yuyos e infusiones sueltas de 100 g: mismo margen que las especias (bolsa chica, mucho fraccionado). */
const esHierbaSuelta = (categoria: string, marca: string, contenido: number) => categoria === "Café, yerba e infusiones" && marca === SUELTO && contenido <= 100;

export const PRODUCTOS_ENCARGO: ProductoProveedor[] = FILAS.map(([codigo, codigoProveedor, producto, marca, presentacion, categoria, contenido, unidad, costo, porQue]) => {
  const tipo = esHierbaSuelta(categoria, marca, contenido) ? "especia" : TIPO_POR_CATEGORIA[categoria] ?? (marca === SUELTO ? "fraccionado" : "envasado");
  return {
    codigo,
    codigoProveedor,
    producto,
    marca,
    presentacion,
    categoria,
    contenido,
    unidad,
    costo,
    margen: margenEncargo(costo, tipo),
    // Peso para el envío: lo que trae más el envase (los líquidos y potes pesan más).
    pesoBrutoG: unidad === "ml" ? Math.round(contenido * 1.25) + 60 : /unidad|comprimidos|saquitos|cápsulas|sobres/.test(presentacion) ? 250 : contenido + 30,
    porQueLoElegimos: porQue,
    ...(NICHOS_POR_CATEGORIA[categoria] ? { nichos: NICHOS_POR_CATEGORIA[categoria] } : {}),
  };
});

/** Los códigos por encargo: la tienda, el carrito y el vendedor lo avisan. */
export const POR_ENCARGO: ReadonlySet<string> = new Set(FILAS.map((f) => f[0]));
export const esPorEncargo = (codigo: string) => POR_ENCARGO.has(codigo);

/** Lo que se dice siempre igual, en la ficha, la tarjeta y el carrito. */
export const AVISO_ENCARGO = "Por encargo: lo pedimos con tu compra y te llega en 24 a 48 hs.";
export const CHIP_ENCARGO = "Por encargo · 24-48 hs";

/** Fotos que ya teníamos del mismo producto (envase real); el resto usa la tarjeta de la casa. */
export const FOTO_ENCARGO: Record<string, string> = {
  "LG-PMANI-NATURAL": "/img/productos/pasta-mani-natural-entrenuts.webp",
  "LG-PMANI-1KG": "/img/productos/pasta-mani-natural-entrenuts.webp",
  "LG-PMANI-CACAO": "/img/productos/pasta-mani-cacao-entrenuts.webp",
  "LG-COCO-NEUTRO": "/img/productos/aceite-coco-neutro-entrenuts.webp",
  "LG-HALMENDRA-250": "/img/productos/harina-almendras-sin-piel.webp",
  "LG-HCOCO-500": "/img/productos/harina-coco.webp",
  "LG-AVENAINST": "/img/productos/avena-instantanea.webp",
  "LG-AVENAGRUESA": "/img/productos/avena-tradicional.webp",
  "LG-PELON-500": "/img/productos/duraznos-desecados.webp",
};
