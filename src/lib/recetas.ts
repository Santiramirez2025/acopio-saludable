// Recetario de Acopio (orden de Santiago, 12/11): «que cada producto tenga recetas, una guía para darle a los
// clientes, sin humo, súper educativa, con imágenes, para que se entienda fácil y enganchar al cliente».
// Reglas: medidas concretas, el porqué de cada paso que importa, nada de promesas de salud.
// Cada receta lista los códigos de los productos que usa: así aparece en la ficha de cada uno.
//
// Puro (sin base): se prueba sin gastar nada.

export type Receta = {
  slug: string;
  titulo: string;
  bajada: string;
  momento: "Desayuno" | "Merienda" | "Snack" | "Almuerzo y cena" | "Básicos caseros" | "Panadería";
  minutos: number;
  /** Tiempo que no estás en la cocina (remojo, heladera, levado). */
  espera?: string;
  rinde: string;
  dificultad: "Fácil" | "Media";
  /** Foto de portada: una foto real o la foto del producto principal. */
  foto: string;
  /** Códigos (sin la presentación) de los productos que lleva: el primero es el principal. */
  productos: string[];
  ingredientes: { cantidad: string; que: string; codigo?: string }[];
  pasos: string[];
  /** Lo educativo: por qué funciona, el error común, el truco. */
  claves: string[];
  guardar: string;
};

export const RECETAS: Receta[] = [
  {
    slug: "avena-nocturna-con-semillas-y-datiles",
    titulo: "Avena nocturna con semillas y dátiles",
    bajada: "La armás en 5 minutos a la noche y a la mañana está lista. Sin cocinar y sin azúcar agregada: endulzan los dátiles.",
    momento: "Desayuno",
    minutos: 5,
    espera: "toda la noche en la heladera",
    rinde: "1 frasco grande (2 desayunos)",
    dificultad: "Fácil",
    foto: "/img/reales/real-semillas.jpg",
    productos: ["LG-AVENA", "LG-MIXSEM", "LG-DATIL"],
    ingredientes: [
      { cantidad: "1 taza (90 g)", que: "Avena arrollada", codigo: "LG-AVENA" },
      { cantidad: "1 taza (250 ml)", que: "Leche o bebida vegetal" },
      { cantidad: "½ taza", que: "Yogur natural" },
      { cantidad: "2 cucharadas", que: "Mix de semillas (lino, chía y sésamo)", codigo: "LG-MIXSEM" },
      { cantidad: "4", que: "Dátiles sin carozo, picados", codigo: "LG-DATIL" },
      { cantidad: "1 pizca", que: "Sal y canela (opcional)" },
    ],
    pasos: [
      "Sacale el carozo a los dátiles (se abren con los dedos) y picalos chiquito.",
      "En un frasco mezclá la avena, las semillas, los dátiles, la leche y el yogur.",
      "Tapá y llevalo a la heladera toda la noche (mínimo 4 horas).",
      "A la mañana revolvé. Si quedó muy espesa, agregá un chorrito de leche. Arriba, fruta fresca o un puñado de mix.",
    ],
    claves: [
      "La avena no necesita cocción: en la heladera absorbe el líquido y se ablanda sola.",
      "La chía del mix de semillas forma un gel con el líquido: por eso a la mañana queda cremosa.",
      "Los dátiles picados se disuelven un poco durante la noche y endulzan toda la preparación.",
    ],
    guardar: "Hasta 3 días en la heladera, en frasco cerrado. Podés dejar armados 2 o 3 frascos el domingo.",
  },
  {
    slug: "bolitas-de-datiles-y-nuez-sin-horno",
    titulo: "Bolitas de dátiles y nuez (sin horno)",
    bajada: "Dos ingredientes principales, una procesadora y 15 minutos. El snack que más preguntan.",
    momento: "Snack",
    minutos: 15,
    rinde: "unas 20 bolitas",
    dificultad: "Fácil",
    foto: "/img/reales/real-datiles.jpg",
    productos: ["LG-DATIL", "TG-NUEZ", "LG-COCO", "LG-CACAO"],
    ingredientes: [
      { cantidad: "200 g", que: "Dátiles sin carozo", codigo: "LG-DATIL" },
      { cantidad: "100 g", que: "Nuez", codigo: "TG-NUEZ" },
      { cantidad: "2 cucharadas", que: "Cacao amargo", codigo: "LG-CACAO" },
      { cantidad: "1 pizca", que: "Sal" },
      { cantidad: "½ taza", que: "Coco rallado, para rebozar", codigo: "LG-COCO" },
    ],
    pasos: [
      "Descarozá los dátiles. Si están duros, dejalos 10 minutos en agua caliente y escurrilos bien.",
      "Procesá la nuez unos segundos, hasta que quede picada gruesa.",
      "Sumá los dátiles, el cacao y la sal. Procesá hasta que la mezcla se junte sola como una masa.",
      "Armá bolitas del tamaño de una nuez con las manos húmedas y pasalas por coco rallado.",
    ],
    claves: [
      "El dátil hace de pegamento y de azúcar a la vez: no hace falta agregar nada más.",
      "La pizca de sal no se siente salada: hace que el chocolate y el dátil se sientan más.",
      "Si la masa queda seca y no se une, una cucharada de agua; si queda muy húmeda, más nuez.",
      "Cambiá la nuez por mix de frutos secos, almendras o cajú: la proporción es siempre 2 de dátil por 1 de fruto seco.",
    ],
    guardar: "Una semana en la heladera en un táper, o 3 meses en el freezer (se comen frías, no hace falta descongelar).",
  },
  {
    slug: "granola-casera-con-mix-de-frutos-secos",
    titulo: "Granola casera con mix de frutos secos",
    bajada: "Crocante, en una placa, y sabés exactamente qué tiene. El truco está en cuándo va cada cosa.",
    momento: "Desayuno",
    minutos: 35,
    rinde: "unos 700 g (un frasco grande)",
    dificultad: "Fácil",
    foto: "/img/reales/real-mix.jpg",
    productos: ["TG-MIXCG", "LG-AVENA", "LG-MIEL", "LG-MIXSEM", "TG-PASAS"],
    ingredientes: [
      { cantidad: "3 tazas (270 g)", que: "Avena arrollada", codigo: "LG-AVENA" },
      { cantidad: "1 taza (150 g)", que: "Mix de frutos secos (sin las pasas)", codigo: "TG-MIXCG" },
      { cantidad: "3 cucharadas", que: "Mix de semillas", codigo: "LG-MIXSEM" },
      { cantidad: "⅓ taza", que: "Miel", codigo: "LG-MIEL" },
      { cantidad: "¼ taza", que: "Aceite neutro" },
      { cantidad: "1 pizca", que: "Sal y canela" },
      { cantidad: "½ taza", que: "Pasas de uva (al final)", codigo: "TG-PASAS" },
    ],
    pasos: [
      "Prendé el horno a 160 °C. Separá las pasas del mix y dejalas aparte.",
      "Entibiá la miel con el aceite (10 segundos en el microondas) para que se mezcle fácil.",
      "En un bowl mezclá avena, frutos secos, semillas, sal y canela. Volcá la miel con aceite y revolvé hasta que todo quede brillante.",
      "Extendé en una placa en capa finita. Horneá 20 a 25 minutos, revolviendo a la mitad.",
      "Sacala cuando esté dorada. Dejala enfriar en la placa sin tocarla y recién ahí sumá las pasas.",
    ],
    claves: [
      "Las pasas y las frutas secas van al final: en el horno se queman y se ponen duras.",
      "Sale del horno blanda y se pone crocante al enfriarse. No la dejes de más esperando que cruja.",
      "Horno bajo (160 °C): la miel se quema rápido a más temperatura.",
      "Si no la revolvés al enfriar te quedan clusters, los trozos grandes que se venden caros.",
    ],
    guardar: "Un mes en frasco hermético, fuera de la heladera (la heladera la humedece).",
  },
  {
    slug: "leche-de-almendras-casera",
    titulo: "Leche de almendras casera",
    bajada: "Un litro con una taza de almendras, agua y una licuadora. Y la pulpa que sobra no se tira.",
    momento: "Básicos caseros",
    minutos: 10,
    espera: "8 a 12 horas de remojo",
    rinde: "1 litro",
    dificultad: "Fácil",
    foto: "/img/reales/real-almendras.jpg",
    productos: ["LG-ALMNP", "LG-DATIL"],
    ingredientes: [
      { cantidad: "1 taza (140 g)", que: "Almendras", codigo: "LG-ALMNP" },
      { cantidad: "4 tazas (1 litro)", que: "Agua fría, más agua para el remojo" },
      { cantidad: "2", que: "Dátiles sin carozo (opcional, para endulzar)", codigo: "LG-DATIL" },
      { cantidad: "1 pizca", que: "Sal" },
    ],
    pasos: [
      "Dejá las almendras en remojo en agua 8 a 12 horas (toda la noche).",
      "Tirá el agua del remojo y enjuagalas.",
      "Licuá las almendras con el litro de agua fría, los dátiles y la sal durante 1 a 2 minutos.",
      "Colá con un lienzo, una bolsa de tela o un colador muy fino, apretando bien para sacar todo el líquido.",
    ],
    claves: [
      "El remojo ablanda la almendra: la licuadora la tritura mejor y la leche sale más cremosa.",
      "El agua del remojo se tira: queda turbia y con gusto amargo.",
      "Es normal que se separe en la heladera: no tiene espesantes. Agitá antes de servir.",
      "La pulpa que queda en el lienzo sirve para budines, galletitas o la avena de la mañana.",
    ],
    guardar: "3 a 4 días en botella cerrada en la heladera. La pulpa, en el freezer.",
  },
  {
    slug: "crema-de-caju-untable",
    titulo: "Crema de cajú untable",
    bajada: "Un untable tipo queso crema, hecho con castañas de cajú. Para tostadas, sándwiches o para mojar.",
    momento: "Básicos caseros",
    minutos: 10,
    espera: "4 horas de remojo (o 15 minutos con agua hirviendo)",
    rinde: "1 frasco de 300 g",
    dificultad: "Fácil",
    foto: "/img/reales/real-caju.jpg",
    productos: ["TG-CAJU"],
    ingredientes: [
      { cantidad: "200 g", que: "Castañas de cajú", codigo: "TG-CAJU" },
      { cantidad: "½ taza", que: "Agua (de a poco)" },
      { cantidad: "Jugo de ½", que: "Limón" },
      { cantidad: "½ cucharadita", que: "Sal" },
      { cantidad: "1 diente", que: "Ajo, o ciboulette picada (opcional)" },
    ],
    pasos: [
      "Remojá el cajú 4 horas en agua fría. Apurado: 15 minutos en agua recién hervida.",
      "Escurrí y procesá con el limón, la sal y un chorrito de agua.",
      "Seguí procesando y sumando agua de a cucharadas hasta que quede liso, 3 a 5 minutos. Bajá lo que queda en las paredes.",
      "Probá y ajustá sal y limón. Llevalo a la heladera: espesa al enfriarse.",
    ],
    claves: [
      "El cajú es el fruto seco más blando y con menos cáscara: por eso queda liso sin colar.",
      "El agua va de a poco: si te pasás queda una salsa (que sirve para pastas, pero no para untar).",
      "El limón le da el toque ácido del queso crema.",
    ],
    guardar: "5 días en frasco cerrado en la heladera.",
  },
  {
    slug: "pudding-de-chia",
    titulo: "Pudding de chía",
    bajada: "Tres cucharadas de chía y una taza de leche. La proporción exacta para que no quede ni aguado ni piedra.",
    momento: "Desayuno",
    minutos: 5,
    espera: "2 horas en la heladera",
    rinde: "1 porción grande",
    dificultad: "Fácil",
    foto: "/img/productos/prov/lg-chia.webp",
    productos: ["LG-CHIA", "LG-MIEL", "TG-MIXCG"],
    ingredientes: [
      { cantidad: "3 cucharadas (30 g)", que: "Semillas de chía", codigo: "LG-CHIA" },
      { cantidad: "1 taza (250 ml)", que: "Leche o bebida vegetal" },
      { cantidad: "1 cucharadita", que: "Miel", codigo: "LG-MIEL" },
      { cantidad: "1 puñado", que: "Mix de frutos secos para arriba", codigo: "TG-MIXCG" },
    ],
    pasos: [
      "Mezclá la chía, la leche y la miel en un frasco.",
      "Esperá 5 minutos y volvé a revolver bien (este paso es el que evita los grumos).",
      "Tapá y a la heladera mínimo 2 horas o toda la noche.",
      "Serví con fruta y un puñado de mix arriba.",
    ],
    claves: [
      "La chía absorbe muchas veces su peso en líquido y forma un gel: eso es lo que espesa, no hay que cocinar nada.",
      "Si no revolvés a los 5 minutos, la chía se junta en el fondo en un bloque.",
      "¿Más firme? 4 cucharadas. ¿Más líquido? 2. Con eso lo ajustás a tu gusto.",
    ],
    guardar: "Hasta 4 días en la heladera (sin la fruta, que se agrega al servir).",
  },
  {
    slug: "hummus-de-garbanzos-casero",
    titulo: "Hummus de garbanzos casero",
    bajada: "Desde el garbanzo seco, que rinde el triple que la lata. Con el truco para que quede liso.",
    momento: "Snack",
    minutos: 20,
    espera: "12 horas de remojo y 1 hora de cocción",
    rinde: "unos 600 g",
    dificultad: "Media",
    foto: "/img/productos/prov/lg-garbanzo.webp",
    productos: ["LG-GARBANZO-1KG", "LG-SESAMO"],
    ingredientes: [
      { cantidad: "250 g", que: "Garbanzos secos", codigo: "LG-GARBANZO-1KG" },
      { cantidad: "3 cucharadas", que: "Sésamo (o pasta de sésamo)", codigo: "LG-SESAMO" },
      { cantidad: "Jugo de 1", que: "Limón" },
      { cantidad: "1 diente", que: "Ajo" },
      { cantidad: "3 cucharadas", que: "Aceite de oliva" },
      { cantidad: "1 cucharadita", que: "Sal, comino y pimentón" },
    ],
    pasos: [
      "Remojá los garbanzos 12 horas con el triple de agua. Tirá esa agua.",
      "Hervilos en agua nueva 1 hora a 1 hora y media, hasta que se aplasten fácil con los dedos. Guardá una taza del agua de cocción.",
      "Tostá el sésamo en una sartén seca 2 o 3 minutos, revolviendo, hasta que huela.",
      "Procesá el sésamo con el aceite hasta que sea una pasta. Sumá garbanzos, limón, ajo, sal y comino.",
      "Procesá agregando agua de cocción de a chorritos hasta que quede cremoso. Serví con un hilo de aceite y pimentón.",
    ],
    claves: [
      "El garbanzo tiene que estar muy cocido, más de lo que lo dejarías para una ensalada: es la clave del hummus liso.",
      "El agua de cocción (no la de la canilla) le da cuerpo y sabor.",
      "250 g de garbanzo seco se convierten en unos 600 g cocidos: rinde como 2 latas y media.",
      "Cociná el kilo entero y congelá en bolsas: tenés garbanzos listos para guisos y ensaladas.",
    ],
    guardar: "5 días en la heladera. Los garbanzos cocidos, 3 meses en el freezer.",
  },
  {
    slug: "ensalada-tibia-de-lentejas",
    titulo: "Ensalada tibia de lentejas, semillas y pasas",
    bajada: "Un plato completo en 25 minutos, sin remojo. Las pasas y las semillas son las que la hacen distinta.",
    momento: "Almuerzo y cena",
    minutos: 25,
    rinde: "3 porciones",
    dificultad: "Fácil",
    foto: "/img/productos/prov/lg-lenteja.webp",
    productos: ["LG-LENTEJA-1KG", "TG-PASAS", "LG-MIXSEM"],
    ingredientes: [
      { cantidad: "1 taza (200 g)", que: "Lentejas", codigo: "LG-LENTEJA-1KG" },
      { cantidad: "1", que: "Cebolla morada chica" },
      { cantidad: "1", que: "Zanahoria rallada" },
      { cantidad: "1 puñado", que: "Pasas de uva", codigo: "TG-PASAS" },
      { cantidad: "2 cucharadas", que: "Mix de semillas", codigo: "LG-MIXSEM" },
      { cantidad: "Al gusto", que: "Aceite de oliva, limón o vinagre, sal y comino" },
    ],
    pasos: [
      "Enjuagá las lentejas y hervilas en abundante agua 20 a 25 minutos, hasta que estén tiernas pero enteras.",
      "Mientras, picá la cebolla fina y dejala en el limón o el vinagre con un poco de sal.",
      "Escurrí las lentejas y aliñalas en caliente con aceite, sal y comino.",
      "Sumá la cebolla con su jugo, la zanahoria, las pasas y las semillas. Serví tibia.",
    ],
    claves: [
      "Las lentejas comunes no necesitan remojo: se cocinan directo.",
      "Aliñarlas en caliente hace que absorban el condimento; frías, el aceite queda por fuera.",
      "La cebolla en limón pierde el picor y queda crocante.",
      "Las pasas dan el dulce y las semillas el crocante: ese contraste es lo que la hace rica.",
    ],
    guardar: "3 días en la heladera. Rinde para la vianda.",
  },
  {
    slug: "galletitas-de-avena-pasas-y-nuez",
    titulo: "Galletitas de avena, pasas y nuez",
    bajada: "Las de la abuela, con medidas claras. Un bowl, sin batidora, 15 minutos de horno.",
    momento: "Merienda",
    minutos: 30,
    rinde: "unas 24 galletitas",
    dificultad: "Fácil",
    foto: "/img/reales/real-pasas.jpg",
    productos: ["TG-PASAS", "TG-NUEZ", "LG-AVENA", "HR-HINTEGRAL"],
    ingredientes: [
      { cantidad: "1 taza (150 g)", que: "Avena arrollada", codigo: "LG-AVENA" },
      { cantidad: "¾ taza (100 g)", que: "Harina integral o común", codigo: "HR-HINTEGRAL" },
      { cantidad: "½ taza (80 g)", que: "Azúcar mascabo o común" },
      { cantidad: "80 ml", que: "Aceite neutro (o 100 g de manteca derretida)" },
      { cantidad: "1", que: "Huevo" },
      { cantidad: "½ cucharadita", que: "Polvo de hornear y una pizca de sal" },
      { cantidad: "½ taza (60 g)", que: "Pasas de uva", codigo: "TG-PASAS" },
      { cantidad: "½ taza (50 g)", que: "Nuez picada", codigo: "TG-NUEZ" },
    ],
    pasos: [
      "Prendé el horno a 180 °C y aceitá una placa.",
      "Batí con un tenedor el huevo, el azúcar y el aceite.",
      "Sumá avena, harina, polvo de hornear y sal. Mezclá y al final agregá las pasas y la nuez.",
      "Armá montoncitos del tamaño de una cucharada, separados, y aplastalos un poco.",
      "Horneá 12 a 15 minutos, hasta que los bordes estén dorados. Dejalas enfriar en la placa.",
    ],
    claves: [
      "Salen blandas del horno y endurecen al enfriarse: si las dejás hasta que estén duras, se queman.",
      "Hidratá las pasas 10 minutos en agua tibia y secalas: quedan jugosas y no se queman en el borde.",
      "El mascabo las deja más húmedas y con gusto a caramelo.",
    ],
    guardar: "Una semana en lata o frasco cerrado.",
  },
  {
    slug: "budin-de-banana-endulzado-con-datiles",
    titulo: "Budín de banana endulzado con dátiles",
    bajada: "Para las bananas que se pasaron. Sin azúcar agregada: el dulzor sale de la banana madura y del dátil.",
    momento: "Merienda",
    minutos: 60,
    rinde: "1 budín (10 porciones)",
    dificultad: "Fácil",
    foto: "/img/reales/real-nuez.jpg",
    productos: ["LG-DATIL", "TG-NUEZ", "HR-HINTEGRAL"],
    ingredientes: [
      { cantidad: "3", que: "Bananas bien maduras (con pintitas negras)" },
      { cantidad: "120 g", que: "Dátiles sin carozo", codigo: "LG-DATIL" },
      { cantidad: "2", que: "Huevos" },
      { cantidad: "80 ml", que: "Aceite neutro" },
      { cantidad: "200 g", que: "Harina integral o común", codigo: "HR-HINTEGRAL" },
      { cantidad: "2 cucharaditas", que: "Polvo de hornear, canela y una pizca de sal" },
      { cantidad: "80 g", que: "Nuez picada", codigo: "TG-NUEZ" },
    ],
    pasos: [
      "Remojá los dátiles 10 minutos en agua caliente, escurrilos y pisalos (o procesalos) con las bananas hasta hacer un puré.",
      "Prendé el horno a 180 °C y enmantecá un molde de budín.",
      "Al puré sumale los huevos y el aceite, y mezclá.",
      "Agregá la harina con el polvo de hornear, la canela y la sal. Mezclá lo justo, hasta que no veas harina seca. Sumá la nuez.",
      "Horneá 40 a 45 minutos, hasta que un palillo salga seco. Dejalo enfriar antes de desmoldar.",
    ],
    claves: [
      "Cuanto más madura la banana, más dulce: las negras son las mejores para esto.",
      "Mezclar de más después de la harina deja el budín duro y con túneles: mezclá lo mínimo.",
      "Pasá la nuez por una cucharada de harina antes de sumarla para que no se vaya al fondo.",
    ],
    guardar: "4 días envuelto, fuera de la heladera. En porciones, 3 meses en el freezer.",
  },
  {
    slug: "pan-casero-con-semillas",
    titulo: "Pan casero con semillas",
    bajada: "Un pan de molde con semillas por dentro y por fuera. Sin amasadora y con tiempos claros.",
    momento: "Panadería",
    minutos: 30,
    espera: "1 hora y 40 de levado y 35 de horno",
    rinde: "1 pan de molde grande",
    dificultad: "Media",
    foto: "/img/productos/prov/lg-mixsem.webp",
    productos: ["LG-MIXSEM", "HR-HINTEGRAL", "TG-GIRASOL"],
    ingredientes: [
      { cantidad: "250 g", que: "Harina integral", codigo: "HR-HINTEGRAL" },
      { cantidad: "250 g", que: "Harina común 000" },
      { cantidad: "10 g (2 cucharaditas)", que: "Sal" },
      { cantidad: "7 g (1 sobre) o 25 g fresca", que: "Levadura" },
      { cantidad: "330 ml", que: "Agua tibia" },
      { cantidad: "80 g", que: "Mix de semillas, más un poco para arriba", codigo: "LG-MIXSEM" },
      { cantidad: "30 g", que: "Semillas de girasol", codigo: "TG-GIRASOL" },
    ],
    pasos: [
      "Mezclá las semillas con 50 ml de los 330 de agua y dejalas 15 minutos.",
      "En un bowl mezclá las harinas y la sal. Disolvé la levadura en el resto del agua tibia y volcala junto con las semillas.",
      "Mezclá y amasá 10 minutos, hasta que la masa esté lisa (al principio pega: no le agregues harina de más).",
      "Tapá y dejá levar 1 hora en un lugar tibio, hasta que duplique.",
      "Desgasificá, formá un cilindro, ponelo en el molde aceitado, pincelá con agua y cubrí con semillas. Levado 40 minutos más.",
      "Horno precalentado a 220 °C, 30 a 35 minutos. Dejalo enfriar sobre una rejilla antes de cortar.",
    ],
    claves: [
      "Hidratar las semillas antes evita que le roben agua a la masa y el pan quede seco.",
      "La harina integral absorbe más agua: la masa tiene que quedar un poco pegajosa.",
      "Si suena hueco al golpearle la base, está cocido.",
      "Cortarlo caliente hace que la miga quede gomosa: esperá por lo menos 1 hora.",
    ],
    guardar: "3 días en bolsa de tela. Feteado, 3 meses en el freezer (se tuesta directo congelado).",
  },
  {
    slug: "frutos-secos-tostados-con-especias",
    titulo: "Cajú y almendras tostados con especias",
    bajada: "Para la picada, mejor que los de paquete y en 15 minutos. Vos elegís cuánta sal.",
    momento: "Snack",
    minutos: 15,
    rinde: "300 g",
    dificultad: "Fácil",
    foto: "/img/reales/real-almendras-500.jpg",
    productos: ["TG-CAJU", "LG-ALMNP", "TG-GIRASOL"],
    ingredientes: [
      { cantidad: "150 g", que: "Castañas de cajú", codigo: "TG-CAJU" },
      { cantidad: "150 g", que: "Almendras", codigo: "LG-ALMNP" },
      { cantidad: "1 cucharada", que: "Aceite (o 1 clara de huevo batida)" },
      { cantidad: "½ cucharadita", que: "Sal fina" },
      { cantidad: "1 cucharadita", que: "Pimentón ahumado, curry o romero" },
    ],
    pasos: [
      "Prendé el horno a 170 °C.",
      "Mezclá los frutos secos con el aceite hasta que brillen. Sumá sal y especias y revolvé.",
      "Extendelos en una placa en una sola capa.",
      "Horneá 10 a 12 minutos, moviendo la placa a la mitad. Sacalos apenas se doren.",
      "Dejalos enfriar del todo: ahí se ponen crocantes.",
    ],
    claves: [
      "El aceite (o la clara) es lo que hace que la sal y la especia se peguen.",
      "Siguen cocinándose con su propio calor al salir del horno: sacalos un punto antes.",
      "El cajú se dora antes que la almendra: si los hacés por separado, el cajú lleva 2 minutos menos.",
    ],
    guardar: "2 semanas en frasco hermético.",
  },
  {
    slug: "datiles-rellenos",
    titulo: "Dátiles rellenos (3 versiones en 5 minutos)",
    bajada: "El bocado dulce más fácil que existe. Para la mesa de fiestas o para cuando pinta algo dulce.",
    momento: "Snack",
    minutos: 5,
    rinde: "12 dátiles",
    dificultad: "Fácil",
    foto: "/img/galeria/producto-datiles.jpg",
    productos: ["LG-DATIL", "TG-NUEZ", "LG-ALMNP", "LG-COCO"],
    ingredientes: [
      { cantidad: "12", que: "Dátiles", codigo: "LG-DATIL" },
      { cantidad: "6 mitades", que: "Nuez", codigo: "TG-NUEZ" },
      { cantidad: "6", que: "Almendras", codigo: "LG-ALMNP" },
      { cantidad: "Opcional", que: "Pasta de maní, coco rallado, chocolate amargo, sal en escamas", codigo: "LG-COCO" },
    ],
    pasos: [
      "Hacé un corte a lo largo de cada dátil, sin partirlo en dos, y sacá el carozo.",
      "Versión 1: media nuez adentro y cerralo.",
      "Versión 2: una almendra y una pizca de sal en escamas.",
      "Versión 3: una cucharadita de pasta de maní, y pasá la punta por coco rallado o chocolate derretido.",
    ],
    claves: [
      "El dátil con carozo se abre fácil con los dedos: no hace falta cuchillo.",
      "El contraste es la gracia: dulce y blando afuera, crocante adentro.",
      "Fríos de la heladera quedan como un bombón.",
    ],
    guardar: "Una semana en la heladera, tapados.",
  },
  {
    slug: "bowl-de-yogur-con-granola-y-frutos-secos",
    titulo: "Cómo armar un bowl de yogur que llene",
    bajada: "No es una receta: es una fórmula. Base, crocante, dulce y semillas, en cantidades que podés repetir todos los días.",
    momento: "Desayuno",
    minutos: 3,
    rinde: "1 bowl",
    dificultad: "Fácil",
    foto: "/img/reales/real-granola.jpg",
    productos: ["TG-GTRAD", "TG-MIXCG", "LG-MIXSEM", "LG-MIEL", "TG-BANANA"],
    ingredientes: [
      { cantidad: "1 taza (200 g)", que: "Yogur natural" },
      { cantidad: "3 cucharadas (30 g)", que: "Granola", codigo: "TG-GTRAD" },
      { cantidad: "1 puñado (25 g)", que: "Mix de frutos secos", codigo: "TG-MIXCG" },
      { cantidad: "1 cucharada", que: "Mix de semillas", codigo: "LG-MIXSEM" },
      { cantidad: "½", que: "Fruta fresca, o banana chips", codigo: "TG-BANANA" },
      { cantidad: "1 cucharadita", que: "Miel (opcional)", codigo: "LG-MIEL" },
    ],
    pasos: [
      "Yogur en el fondo.",
      "Fruta en el medio.",
      "Arriba granola, frutos secos y semillas, recién en el momento de comer.",
      "Si querés, un hilo de miel.",
    ],
    claves: [
      "Un puñado de frutos secos son unos 25 g: lo que entra en la palma cerrada.",
      "La granola va al final: si la ponés antes, se ablanda con el yogur.",
      "Con 1 kilo de mix tenés 40 puñados: más de un mes de desayunos.",
    ],
    guardar: "Se arma en el momento. Lo que sí podés dejar listo: frascos con la mezcla seca (granola, mix y semillas) para toda la semana.",
  },
];

/** Código base sin la presentación: «LG-DATIL-500» → «LG-DATIL», «LG-GARBANZO-1KG» → «LG-GARBANZO». */
export const codigoBase = (codigo: string) => codigo.replace(/-(\d+(KG|G)?)$/i, "");

// Productos que en la cocina son lo mismo: la receta de granola con «el mix» sirve para cualquier mix de frutos secos.
const FAMILIAS: [RegExp, string][] = [
  [/^(TG-MIX(C|CG|GIR|T|TG|P|TSM|XP)|LG-MIX(PREMIUM|ENERG))$/, "mix"],
  [/^(TG-ALMGUARA|LG-ALMNP)$/, "almendra"],
  [/^LG-DATIL(SC)?$/, "datil"],
  [/^(TG-PASAS|LG-PASASRUBIAS|LG-PASAS)$/, "pasas"],
  [/^(TG|LG)-NUEZ$/, "nuez"],
  [/^(TG|LG)-CAJU$/, "caju"],
  [/^(TG|LG)-G(TRAD|PMANI|CACAO|PROTE|ALMENDRA|STEVIA)$/, "granola"],
  [/^LG-LENTEJA(ROJA)?$/, "lenteja"],
  [/^LG-(CACAO|COCO|MIEL|AVENA|CHIA|SESAMO|MIXSEM|GARBANZO)$/, ""],
];
const familia = (codigo: string) => {
  const base = codigoBase(codigo);
  const f = FAMILIAS.find(([re]) => re.test(base));
  return f && f[1] ? f[1] : base;
};

/** Recetas que usan el producto (o uno de su familia), primero las que lo tienen como principal. */
export function recetasDe(codigo: string): Receta[] {
  const f = familia(codigo);
  return RECETAS.filter((r) => r.productos.some((p) => familia(p) === f)).sort(
    (a, b) => Number(familia(b.productos[0]) === f) - Number(familia(a.productos[0]) === f),
  );
}

export const MOMENTOS = ["Desayuno", "Merienda", "Snack", "Almuerzo y cena", "Básicos caseros", "Panadería"] as const;

export const tiempoTexto = (r: Receta) => `${r.minutos} min${r.espera ? ` + ${r.espera}` : ""}`;
