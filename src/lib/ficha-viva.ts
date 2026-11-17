// La ficha que da ganas: además de la Nutri y las recetas largas, cada producto trae un dato curioso, dos o tres
// tips de uso y una idea de cocina de 2 minutos (Santiago, 16/11: «cada producto además de la Nutri tiene unos
// tips de salud y recetas de cocina; hacerlo más entretenido, que le dé ganas de comprar a la gente… sin saturar
// pero sin ser el producto genérico»).
//
// Funciona por familia (palabras del nombre), así cubre todo el catálogo, también lo que entra por encargo.
// Corto a propósito: un dato, tres tips, una idea. Nada de acá dice que un alimento cure o prevenga algo:
// se habla de cómo se usa, qué aporta y cómo se guarda (igual que nutrientes.ts).
// Puro (sin base): se prueba sin gastar nada.

export type FichaViva = {
  /** Una línea que engancha. */
  dato: string;
  /** Uso, bienestar y guardado: 2 o 3, cortos. */
  tips: string[];
  /** Idea de cocina para hacer hoy, sin receta larga. */
  idea: { titulo: string; como: string };
  /** Recetas del recetario que van con esta familia (slugs de recetas.ts). */
  recetas?: string[];
};

const GUARDAR_SECO = "Guardalo en frasco cerrado, en lugar fresco y sin luz: dura meses.";

const FAMILIAS: [RegExp, FichaViva][] = [
  // Primero por tipo de producto (un aceite de almendras no es una almendra); después por ingrediente.
  [/whey|protein|creatin|bcaa|glutamin|mass\b|gainer/, {
    dato: "La proteína rinde más repartida en el día que toda junta: un batido después de entrenar suma a lo que ya comés.",
    tips: ["Una medida por porción, con agua o leche fría: batir 20 segundos.", "La creatina se toma todos los días, con mucha agua, entrenes o no.", "Es un suplemento: acompaña una alimentación variada, no la reemplaza."],
    idea: { titulo: "Panqueque proteico", como: "Una medida de proteína, un huevo, una banana pisada y dos cucharadas de avena. Sartén antiadherente, vuelta y vuelta." },
  }],
  [/colageno|magnesio|omega|vitamina|capsula|comprimido|levadura de cerveza|lecitina|spirulina|espirulina|maca\b/, {
    dato: "Un suplemento dietario suma a lo que comés: funciona cuando el plato, el descanso y el movimiento acompañan.",
    tips: ["Respetá la dosis de la etiqueta: más no es mejor.", "Tomalo siempre a la misma hora para no olvidarte.", "Si estás embarazada, amamantando o tomás medicación, consultá antes con tu médico."],
    idea: { titulo: "Hacelo rutina", como: "Dejalo al lado de la pava o del mate: lo que se ve, se toma. Con un vaso grande de agua." },
  }],
  [/^pasta de (mani|sesamo|almendra)|^mantequilla de mani|tahini/, {
    dato: "La pasta de maní pura es solo maní molido: si arriba tiene aceite, es buena señal. Se revuelve y listo.",
    tips: ["Guardala boca abajo: el aceite se reparte solo.", "Una cucharada es la porción: en tostadas, con banana o en el licuado.", "En la heladera queda más firme y dura más."],
    idea: { titulo: "Licuado que llena", como: "Una banana, una cucharada de pasta de maní, leche y hielo. Desayuno o post entrenamiento." },
    recetas: ["pasta-de-mani-casera", "hummus-de-garbanzos-casero"],
  }],
  [/aceite de coco|aceite de oliva|aceite/, {
    dato: "El oliva extra virgen se usa en crudo para aprovechar su sabor; el de coco neutro aguanta bien el calor del horno y la sartén.",
    tips: ["Guardalo cerrado y lejos de la luz: es lo que más lo arruina.", "El aceite de coco se solidifica con el frío: es normal, con calor vuelve a líquido.", "Medilo con cuchara: una sopera por persona alcanza."],
    idea: { titulo: "Pochoclo con aceite de coco", como: "Una cucharada de aceite de coco, media taza de maíz pisingallo, olla tapada. Sal o canela al final." },
  }],
  [/premezcla|bizcochuelo|brownie|\bpan\b.*(sin tacc|premezcla)/, {
    dato: "Las masas sin gluten no se amasan: se baten. Y siempre quedan mejor con un rato de reposo antes del horno.",
    tips: ["Dejá descansar la mezcla 10 minutos: los almidones se hidratan y no queda arenosa.", "Usá molde chico y alto: sin gluten, la masa necesita paredes para subir.", "Si en casa hay celíacos, usá utensilios y tablas aparte."],
    idea: { titulo: "Pizza en sartén", como: "Premezcla, agua tibia, aceite y sal, batido espeso. A la sartén aceitada, tapada, 5 minutos por lado, y arriba lo que quieras." },
  }],
  [/harina|fecula|almidon|farina/, {
    dato: "Cada harina se comporta distinto: la de almendra humedece, la de coco absorbe muchísimo, la de garbanzo liga sin huevo.",
    tips: ["Para empezar, reemplazá solo un cuarto de la harina común por la nueva.", "Las harinas integrales y de frutos secos, a la heladera: tienen aceites que se enrancian.", "Tamizala siempre: suma aire y saca los grumos."],
    idea: { titulo: "Panqueques de dos ingredientes", como: "Una banana pisada, un huevo y dos cucharadas de la harina que tengas. Sartén caliente, vuelta y vuelta." },
    recetas: ["pan-casero-con-semillas", "budin-de-banana-endulzado-con-datiles"],
  }],
  [/fideo|tallarin|fetuccini|tirabuzon|mostachol|codito|spaghetti/, {
    dato: "Las pastas de legumbres y las integrales tienen más proteína y fibra: llenan con menos plato.",
    tips: ["Mucha agua y sin aceite: lo que evita que se peguen es revolver al principio.", "Las sin gluten se pasan rápido: probá 2 minutos antes de lo que dice el paquete.", "Guardá un vaso del agua de cocción para ligar la salsa."],
    idea: { titulo: "Fideos al limón", como: "Pasta al dente, oliva, ralladura y jugo de limón, pimienta y un puñado de semillas tostadas. 10 minutos." },
  }],
  [/galleta|galletita|alfajor|bizcoch|budin|pan dulce|tostada|disco|marinera|polvoron|pepas|bocadito|barrita|barra/, {
    dato: "La colación ideal combina algo crocante con algo que llene: galleta más fruta, o más un puñado de frutos secos.",
    tips: ["Armá la porción en un plato y guardá el paquete: es la forma más fácil de no pasarse.", "Si en casa hay celíacos, guardá lo sin TACC en un estante aparte.", "Bien cerradas en frasco no se humedecen."],
    idea: { titulo: "Merienda armada", como: "Dos galletas o tostadas, queso untable, rodajas de banana y canela. Con mate o té." },
  }],
  [/mermelada|dulce de leche|dulce de|batata|membrillo/, {
    dato: "Las mermeladas con stevia o sin azúcar agregada tienen más fruta por cucharada: se nota en el sabor.",
    tips: ["Una vez abierta, a la heladera y cuchara limpia: dura semanas.", "No es solo para tostadas: una cucharada en el yogur natural lo resuelve.", "Mirá la etiqueta: el primer ingrediente tiene que ser la fruta."],
    idea: { titulo: "Tarta en vasito", como: "Galletitas rotas, queso crema o yogur firme y una cucharada de mermelada arriba. Postre en 2 minutos." },
  }],
  [/bebida vegetal|leche de coco|leche de almendra|jugo|limonada/, {
    dato: "Las bebidas vegetales se agitan antes de servir: lo bueno se va al fondo.",
    tips: ["Una vez abierta, heladera y 3 o 4 días.", "Para el café con leche, calentala sin que hierva: así no se corta.", "La leche de coco reemplaza a la crema en salsas y curris."],
    idea: { titulo: "Licuado de la mañana", como: "Bebida vegetal, una banana, una cucharada de avena y canela. Licuadora 30 segundos." },
    recetas: ["leche-de-almendras-casera"],
  }],
  [/caramelo|propoleo|pastilla/, {
    dato: "Los caramelos de miel y propóleo son el clásico del invierno y de quienes usan mucho la voz.",
    tips: ["Dejalos disolver despacio, sin morder.", "Llevá un puñado en el bolso o en el auto.", "El propóleo no se recomienda en alérgicos a los productos de la colmena."],
    idea: { titulo: "Té con caramelo", como: "Un caramelo de miel en la taza de té caliente: se disuelve y lo endulza y perfuma solo." },
  }],
  [/\byerba\b(?!.*(meona|sapo|pajaro|piedra))/, {
    dato: "El agua para el mate va entre 70 y 80 °C: si hierve, quema la yerba y el mate sale amargo y se lava rápido.",
    tips: ["Mojá primero la yerba con un chorrito de agua tibia: dura más cebadas.", "La orgánica se cultiva sin agroquímicos y suele ser más suave: ideal si el mate te cae pesado.", "Cerrá bien el paquete con un broche; la yerba absorbe los olores de la alacena."],
    idea: { titulo: "Tereré de verano", como: "Yerba en un vaso alto, hielo, rodajas de limón y menta, y agua bien fría o jugo de pomelo. Listo en un minuto." },
  }],
  [/\b(te|infusion)\b|saquitos|hibiscus|rooibos|cedron|manzanilla|tilo\b|boldo|burrito|peperina|menta\b|melisa/, {
    dato: "El tiempo cambia todo: 2 a 3 minutos para el té verde, 4 a 5 para el negro y las hierbas. Pasado ese punto, amarga.",
    tips: ["Para el té verde, agua a 80 °C (apagá la pava antes del hervor).", "Las infusiones de hierbas no tienen cafeína: son la taza de la noche.", "Guardalo lejos de las especias: toma su olor enseguida."],
    idea: { titulo: "Té helado sin azúcar", como: "Dos saquitos (o dos cucharadas) en medio litro de agua caliente, 5 minutos. Sumá hielo, rodajas de naranja y una cucharadita de miel." },
  }],
  [/\bnue(z|ces)\b(?!.*moscada)/, {
    dato: "La nuez es el fruto seco con más omega-3 vegetal: un puñado (30 g) ya suma.",
    tips: ["Un puñado es la porción: unas 7 nueces enteras.", "En la heladera o el freezer no se pone rancia y dura hasta un año.", "Tostala 5 minutos en sartén seca: cambia el sabor por completo."],
    idea: { titulo: "Pesto de nuez", como: "Procesá un puñado de nueces con albahaca, ajo, aceite de oliva y sal. Para fideos, tostadas o pollo." },
    recetas: ["bolitas-de-datiles-y-nuez-sin-horno", "higos-con-queso-y-nuez", "ensalada-con-arandanos-nueces-y-semillas"],
  }],
  [/almendra/, {
    dato: "Un puñado de almendras (unas 23) cubre buena parte de la vitamina E del día.",
    tips: ["Remojadas 8 horas quedan más tiernas y se pelan solas.", "Con piel tienen más fibra; sin piel son más suaves para repostería.", "Guardalas en frasco cerrado; en verano, mejor en la heladera."],
    idea: { titulo: "Almendras tostadas con tamari", como: "Sartén seca 5 minutos, apagás el fuego y les tirás un chorrito de salsa de soja. Se secan solas y quedan saladas y crocantes." },
    recetas: ["leche-de-almendras-casera", "frutos-secos-tostados-con-especias"],
  }],
  [/caju|castana/, {
    dato: "El cajú remojado y procesado se vuelve crema: es la base de los quesos y salsas vegetales.",
    tips: ["Es el fruto seco más suave: el que eligen los chicos.", "Remojalo 2 horas antes de procesarlo y queda sedoso.", GUARDAR_SECO],
    idea: { titulo: "Salsa blanca sin lácteos", como: "Media taza de cajú remojado, una taza de agua, sal, nuez moscada y un diente de ajo. Licuadora y a la olla 3 minutos." },
    recetas: ["crema-de-caju-untable", "frutos-secos-tostados-con-especias"],
  }],
  [/\bmani\b|garrapinad|crocante/, {
    dato: "El maní es una legumbre, no un fruto seco, y es el que más proteína tiene: 26 g cada 100 g.",
    tips: ["Sin sal y tostado es la versión de todos los días.", "Procesado 8 minutos se vuelve pasta de maní, sin agregarle nada.", GUARDAR_SECO],
    idea: { titulo: "Salsa de maní para wok", como: "Dos cucharadas de maní molido o pasta de maní, salsa de soja, jugo de limón y un poco de agua tibia. Sobre fideos de arroz o verduras salteadas." },
    recetas: ["pasta-de-mani-casera"],
  }],
  [/avellana|pistacho|pecan|macadamia|\bmix\b|frutos secos/, {
    dato: "La porción de frutos secos es un puñado: lo que entra en la palma de tu mano, unos 30 g.",
    tips: ["Armá bolsitas de un puñado el domingo: la colación de la semana resuelta.", "Un golpe de sartén seca los deja más crocantes y aromáticos.", "En la heladera duran el doble y no se ponen rancios."],
    idea: { titulo: "Topping para todo", como: "Picalos grueso y guardalos en un frasco: arriba del yogur, la ensalada, la calabaza al horno o el helado." },
    recetas: ["granola-casera-con-mix-de-frutos-secos", "frutos-secos-tostados-con-especias", "bowl-de-yogur-con-granola-y-frutos-secos"],
  }],
  [/datil/, {
    dato: "El dátil endulza como el azúcar pero viene con su fibra: por eso se usa entero en licuados y masas.",
    tips: ["Dos dátiles reemplazan una cucharada de azúcar en un licuado.", "Remojalos 10 minutos en agua tibia y se hacen pasta con un tenedor.", "En la heladera se mantienen blandos por meses."],
    idea: { titulo: "Caramelo de dátiles", como: "Procesá 10 dátiles sin carozo con 3 cucharadas de agua caliente y una pizca de sal. Queda un dulce untable para tostadas o panqueques." },
    recetas: ["datiles-rellenos", "bolitas-de-datiles-y-nuez-sin-horno", "budin-de-banana-endulzado-con-datiles"],
  }],
  [/ciruela|higo|damasco|pelon|durazno|pasas?\b|arandano|pera\b|manzana|cubos de fruta|anana|mango|papaya|kiwi|melon|banana|coco en|jengibre.*azucarad|glasead|fruta/, {
    dato: "La fruta desecada es fruta sin agua: concentra el dulzor y la fibra, y por eso la porción es chica (un puñadito).",
    tips: ["Hidratala 10 minutos en agua tibia o té y vuelve a quedar tierna.", "Picada reemplaza al azúcar en budines, granolas y avena.", "En frasco cerrado dura meses; si se seca de más, un rato en agua la recupera."],
    idea: { titulo: "Compota exprés", como: "Un puñado de fruta desecada, agua hasta cubrir, una rama de canela y 10 minutos de fuego bajo. Tibia con yogur es un postre." },
    recetas: ["compota-de-ciruelas-y-damascos", "galletitas-de-avena-pasas-y-nuez", "ensalada-con-arandanos-nueces-y-semillas"],
  }],
  [/\bchia\b/, {
    dato: "La chía absorbe hasta 10 veces su peso en agua: por eso espesa sin cocinar.",
    tips: ["Remojada o molida se aprovecha mejor que entera y seca.", "Una cucharada de chía en 3 de agua, 10 minutos, reemplaza un huevo en budines.", GUARDAR_SECO],
    idea: { titulo: "Mermelada en 10 minutos", como: "Una taza de frutillas o arándanos pisados al fuego, una cucharada de chía y un poco de miel. Al enfriar, espesa sola." },
    recetas: ["pudding-de-chia", "avena-nocturna-con-semillas-y-datiles"],
  }],
  [/\blino\b|sesamo|girasol|zapallo|amapola|semilla|alpiste|canamo/, {
    dato: "Las semillas chicas se aprovechan mejor molidas o bien masticadas: enteras, muchas pasan de largo.",
    tips: ["Tostalas 2 minutos en sartén seca, hasta que salten: más sabor y más crocantes.", "Una cucharada sopera por día alcanza: en la ensalada, la sopa o el yogur.", "Molé de a poco y guardá en la heladera; molidas se oxidan rápido."],
    idea: { titulo: "Rebozador de semillas", como: "Mezclá semillas con un poco de avena y sal, y usalo en lugar de pan rallado para milanesas de berenjena o pollo." },
    recetas: ["pan-casero-con-semillas", "semillas-de-zapallo-tostadas", "ensalada-con-arandanos-nueces-y-semillas"],
  }],
  [/quinoa|quinua/, {
    dato: "La quinoa tiene los 9 aminoácidos esenciales: es de los pocos vegetales con proteína completa.",
    tips: ["Lavala bien bajo el agua hasta que no haga espuma: así se va el amargor.", "Una taza de quinoa, dos de agua, 15 minutos tapada.", "Cocida dura 4 días en la heladera: hacé de más."],
    idea: { titulo: "Ensalada que se lleva", como: "Quinoa fría, tomate, pepino, limón, oliva y un puñado de semillas. Aguanta en el táper hasta el mediodía." },
    recetas: ["como-cocinar-quinoa"],
  }],
  [/avena|granola|copos|muesli|almohadita|cereal|inflad|tutuca|pop\b|salvado|germen|amaranto/, {
    dato: "Un desayuno con avena o cereales integrales sacia más tiempo: la fibra hace que la energía se libere despacio.",
    tips: ["La porción es media taza: llenás con fruta y yogur, no con más cereal.", "La granola también va en lo salado: probala sobre una sopa crema.", "Cerrá bien la bolsa: la humedad es lo único que le quita lo crocante."],
    idea: { titulo: "Avena de la noche", como: "Media taza de avena, una de leche o bebida vegetal y fruta, al frasco y a la heladera. A la mañana está lista, sin cocinar." },
    recetas: ["avena-nocturna-con-semillas-y-datiles", "bowl-de-yogur-con-granola-y-frutos-secos", "galletitas-de-avena-pasas-y-nuez"],
  }],
  [/lenteja(?!s de chocolate)|garbanzo|poroto|arveja|lupin|soja textur|legumbre|aduki|mung/, {
    dato: "Legumbre más cereal (lentejas con arroz, garbanzos con pan) forman una proteína completa, como la de la carne.",
    tips: ["Remojalas la noche anterior y tirá esa agua: se cocinan más rápido y caen más livianas.", "Sal al final: al principio endurece la piel.", "Cocidas se freezan en porciones y tenés guiso en 10 minutos."],
    idea: { titulo: "Garbanzos crocantes", como: "Garbanzos cocidos y bien secos, oliva, pimentón y sal. Horno fuerte 25 minutos. Se comen como maní." },
    recetas: ["hummus-de-garbanzos-casero", "ensalada-tibia-de-lentejas", "crema-de-lentejas-rojas", "porotos-negros-guisados"],
  }],
  [/^arroz(?!.*(galleta|disco|tostada|fideo|harina))|burgol|cous|trigo|cebada|mijo|polenta|semola/, {
    dato: "Los granos integrales conservan el salvado y el germen: ahí están la fibra y casi todos los minerales.",
    tips: ["El integral lleva más agua y más tiempo: 1 taza de grano, 2 y media de agua.", "Tostalo un minuto en la olla antes del agua: toma gusto a nuez.", "Cocido aguanta 4 días en la heladera."],
    idea: { titulo: "Bowl de heladera", como: "Grano cocido, la verdura que haya, un huevo o legumbres y un chorrito de salsa de soja. Almuerzo en 5 minutos." },
    recetas: ["como-cocinar-arroz-yamani", "como-cocinar-quinoa"],
  }],
  [/cacao|chocolate|bombon|algarroba|marroc|licorcito/, {
    dato: "Cuanto más cacao y menos azúcar, más amargo y más magnesio: el cacao amargo es de los alimentos que más tiene.",
    tips: ["El chocolate se derrite a baño maría o de a 20 segundos en el microondas: si se pasa, se corta.", "Una cucharadita de cacao amargo en el café lo vuelve moca, sin azúcar.", "Guardalo fuera de la heladera, en lugar fresco: el frío lo blanquea."],
    idea: { titulo: "Chocolatada de verdad", como: "Una cucharada de cacao amargo, una de miel o dos dátiles, leche caliente y una pizca de canela. Batir y listo." },
    recetas: ["bolitas-de-datiles-y-nuez-sin-horno"],
  }],
  [/azucar|mascabo|stevia|edulcorante|\bmiel\b|arrope|jalea|polen/, {
    dato: "La miel y el mascabo endulzan y además dan sabor: por eso se usa menos cantidad que de azúcar blanca.",
    tips: ["Si la miel se cristaliza está perfecta: baño maría tibio y vuelve a ser líquida.", "En budines, el mascabo da color y humedad: reemplazá el azúcar uno a uno.", "La miel no se da a bebés menores de un año."],
    idea: { titulo: "Limonada con miel y jengibre", como: "Jugo de 2 limones, una cucharada de miel disuelta en agua tibia, jengibre rallado, agua fría y hielo." },
    recetas: ["barritas-de-amaranto-y-miel"],
  }],
  [/vainilla|polvo (de|para) hornear|levadura|bicarbonato|gelatina|flan|postre|mousse|agar|azahar|coco rallado|coco escamas|gotas|lentejas de chocolate|reposteria/, {
    dato: "En repostería, pesar es la mitad del éxito: una cucharada de más de polvo de hornear cambia todo el budín.",
    tips: ["Todo a temperatura ambiente antes de empezar: la masa liga mejor.", "No abras el horno los primeros 20 minutos.", "Guardá los secos en frascos con etiqueta y fecha."],
    idea: { titulo: "Budín en taza", como: "4 cucharadas de harina, 2 de azúcar o mascabo, media cucharadita de polvo de hornear, un huevo y 3 cucharadas de leche. Microondas 90 segundos." },
    recetas: ["cocadas-caseras", "budin-de-banana-endulzado-con-datiles"],
  }],
  [/curcuma|curry/, {
    dato: "La cúrcuma se aprovecha mucho mejor con una pizca de pimienta negra y algo de aceite.",
    tips: ["Agregala al final de la cocción: el calor largo le apaga el color y el sabor.", "Mancha: cuidado con la mesada y los táperes blancos.", GUARDAR_SECO],
    idea: { titulo: "Leche dorada", como: "Una taza de leche o bebida vegetal caliente, media cucharadita de cúrcuma, canela, una pizca de pimienta y miel." },
  }],
  [/canela|clavo|nuez moscada|anis|cardamomo|jengibre|vainilla/, {
    dato: "Las especias dulces dan sensación de dulzor sin azúcar: con canela, la avena pide menos miel.",
    tips: ["Enteras duran años; molidas, unos 6 meses con todo su aroma.", "Un minuto en sartén seca antes de usarlas despierta el perfume.", GUARDAR_SECO],
    idea: { titulo: "Manzana a la canela", como: "Manzana en cubos, un chorrito de agua, canela y 5 minutos de sartén. Sobre yogur o tostadas." },
  }],
  [/pimenton|paprika|aji|cayena|pimienta|chimichurri|provenzal|adobo|oregano|comino|ajo|cebolla|perejil|albahaca|laurel|tomillo|romero|condimento|especia|mostaza|coriandro|eneldo|estragon|salvia/, {
    dato: "Las especias se despiertan con calor y grasa: un minuto en el aceite, antes que el resto, y la comida cambia.",
    tips: ["Molidas duran unos 6 meses con todo su sabor: comprá de a poco y seguido.", "Lejos de la hornalla: el calor y el vapor las apagan.", "Con buenas especias se cocina con menos sal."],
    idea: { titulo: "Aceite de la casa", como: "En un frasco: oliva, una cucharada de tu mezcla de especias, ajo y sal. Sirve para adobar, para la pizza y para el pan." },
    recetas: ["frutos-secos-tostados-con-especias"],
  }],
  [/\bsal\b|caldo|salsa de soja|aceto|vinagre/, {
    dato: "Para comer con menos sal, el truco es el ácido: unas gotas de limón o vinagre al final resaltan el sabor igual.",
    tips: ["Salá al final y probá: siempre se usa menos.", "La salsa de soja ya tiene sal: no sumes más en ese plato.", GUARDAR_SECO],
    idea: { titulo: "Vinagreta de frasco", como: "3 partes de aceite, 1 de vinagre o limón, sal, mostaza y una cucharadita de miel. Tapar, agitar, y dura toda la semana." },
  }],
];

/** Cuando el nombre no dice nada, la góndola. */
const POR_GONDOLA: Record<string, FichaViva> = {
  "Café, yerba e infusiones": {
    dato: "Las hierbas se preparan en infusión: agua recién hervida sobre la hierba, tapado, 5 a 10 minutos. Tapar es la clave: lo aromático se va con el vapor.",
    tips: ["La medida de siempre: una cucharada sopera por taza.", "Raíces y cortezas (las partes duras) van en decocción: hervir 5 minutos a fuego bajo.", "Si estás embarazada, amamantando o tomás medicación, consultá antes con tu médico."],
    idea: { titulo: "Tu propio blend", como: "Mezclá en un frasco tres hierbas que te gusten (por ejemplo cedrón, menta y manzanilla) y tenés tu té de la casa para toda la semana." },
  },
  "Cuidado natural": {
    dato: "Los aceites vegetales se usan sobre la piel apenas húmeda, después del baño: se absorben mejor y rinden más.",
    tips: ["Probá primero en una zona chica del antebrazo y esperá un día.", "Son de uso externo: no se toman.", "Guardalos cerrados y lejos del sol."],
    idea: { titulo: "Dos gotas alcanzan", como: "Calentá dos o tres gotas entre las manos y pasalas por las puntas del pelo o por los codos y talones antes de dormir." },
  },
};

/** Lo general, para lo que no cae en ninguna familia: nunca queda la ficha vacía. */
const GENERAL: FichaViva = {
  dato: "Lo fraccionamos y armamos a pedido: llega fresco, con fecha y en la cantidad que usás.",
  tips: ["Pasalo a un frasco con tapa apenas llega: dura más y lo tenés a la vista.", "Anotá la fecha de apertura en el frasco.", "Si es la primera vez que lo probás, escribinos y te contamos cómo lo usamos nosotros."],
  idea: { titulo: "Empezá simple", como: "Sumalo a algo que ya hacés todos los días (el desayuno, la ensalada, la vianda) antes de buscar una receta nueva." },
};

const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** La ficha de ese producto: por las palabras del nombre y, si no alcanza, por la góndola. */
export function fichaViva(p: { producto: string; categoria: string }): FichaViva {
  // Lo de uso externo nunca recibe tips de cocina, se llame como se llame.
  if (p.categoria === "Cuidado natural") return POR_GONDOLA["Cuidado natural"];
  const nombre = sinTildes(p.producto);
  const de = (inicio: string) => FAMILIAS.find(([re]) => re.source.startsWith(inicio))![1];
  // Gotas, cápsulas y polvos de la góndola de suplementos: siempre la ficha de suplemento (salvo proteínas y creatina).
  if (p.categoria === "Suplementos") return /whey|protein|creatin|mass\b/.test(nombre) ? de("whey") : de("colageno");
  // Un mix se trata como mix, no como el ingrediente que nombra («sin maní», «con cajú»).
  if (/\bmix\b/.test(nombre)) return /semilla/.test(nombre) ? de("\\blino") : de("avellana");
  const porNombre = FAMILIAS.find(([re]) => re.test(nombre))?.[1];
  if (porNombre) return porNombre;
  if (p.categoria === "Especias") return de("pimenton");
  return POR_GONDOLA[p.categoria] ?? GENERAL;
}
