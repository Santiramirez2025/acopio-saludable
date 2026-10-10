/** Imagen propia y textos de cada góndola. Los textos describen el surtido y cómo se compra: nada de promesas de salud. */
export const GONDOLAS: Record<string, { img?: string; intro: string; detalle: string }> = {
  Almacen: {
    img: "/img/gondolas/almacen.webp",
    intro: "La góndola más grande: galletitas y pepas integrales, mermeladas, miel, pastas de legumbres, budines, bebidas vegetales, stevia y sal rosada.",
    detalle: "Es el almacén natural de todos los días: productos envasados de marcas argentinas, listos para la alacena. Podés combinarlos con frutos secos, cereales o harinas en el mismo pedido para llegar a la compra mínima.",
  },
  Supermercado: {
    img: "/img/gondolas/supermercado.webp",
    intro: "Lo básico de la despensa en un solo pedido: fideos, arroz, conservas, salsas, aceite, yerba, té, café y galletitas.",
    detalle: "Sumá a tu compra saludable lo de todos los días, sin pasar por otro lado. Sirve tanto para la casa como para abastecer cabañas, hoteles y oficinas.",
  },
  Especias: {
    img: "/img/gondolas/especias.webp",
    intro: "Especias y condimentos por peso: pimentón, orégano, comino, cúrcuma, ají molido, provenzal, pimienta y mezclas para cocinar.",
    detalle: "Comprar las especias fraccionadas por peso rinde mucho más que el sobrecito. Es la góndola que más usan rotiserías, pizzerías y quienes cocinan en cantidad.",
  },
  Suplementos: {
    img: "/img/gondolas/suplementos.webp",
    intro: "Suplementos dietarios de marcas argentinas: magnesio, colágeno, vitaminas, espirulina, maca y proteínas vegetales, en cápsulas y en polvo.",
    detalle: "Son productos que la gente elige para acompañar su rutina. Cada ficha indica la presentación y la marca. Los suplementos dietarios no reemplazan una dieta variada: consultá a tu médico.",
  },
  Congelados: {
    intro: "Congelados y refrigerados: hamburguesas y milanesas de legumbres, pre pizzas, empanadas, yogures y fruta congelada.",
    detalle: "Por la cadena de frío, estos productos solo se entregan en la zona de reparto propio: Villa Carlos Paz y sur de Punilla. No se envían por correo.",
  },
  "Café, yerba e infusiones": {
    img: "/img/gondolas/infusiones.webp",
    intro: "Yerba mate, café, té en hebras y en saquitos, hierbas serranas y mate cocido, por paquete o por peso.",
    detalle: "Para la casa, la oficina o el desayuno de un alojamiento. Hay yerbas compuestas con hierbas, tés saborizados y café molido.",
  },
  "Cereales y granolas": {
    img: "/img/gondolas/cereales.webp",
    intro: "Avena, granolas, copos de maíz, cereales sin azúcar, almohaditas y muesli, por kilo y en bolsas grandes.",
    detalle: "Es la base del desayuno: llevando por kilo, el precio por porción baja mucho frente al paquete chico. Muy pedida por cafeterías, hoteles y cabañas para armar el desayuno.",
  },
  "Frutos secos y mix": {
    img: "/img/combos/alacena-de-frutos-secos.webp",
    intro: "Nueces, almendras, castañas de cajú, maní, pistachos, avellanas y mix de frutos secos, por kilo.",
    detalle: "Los frutos secos por kilo son el producto que más conviene comprar por volumen. Vienen fraccionados y cerrados; guardalos en un frasco hermético, en un lugar fresco y seco.",
  },
  "Harinas y Féculas": {
    img: "/img/gondolas/harinas.webp",
    intro: "Harina de almendras, de avena, de garbanzos, de arroz, integral, fécula de mandioca y premezclas, por kilo.",
    detalle: "Para panificar y cocinar en casa o en un local. Varias son aptas sin TACC según el rótulo del fabricante: buscá la etiqueta en cada producto y verificá el logo oficial en el envase.",
  },
  "Semillas y granos": {
    img: "/img/gondolas/semillas.webp",
    intro: "Chía, lino, sésamo, girasol, zapallo, quinoa, mijo y mix de semillas, por kilo.",
    detalle: "Para sumar a panes, ensaladas, yogures y granolas caseras. Por kilo rinden mucho y se conservan bien en frascos cerrados.",
  },
  Legumbres: {
    img: "/img/gondolas/legumbres.webp",
    intro: "Lentejas, garbanzos, porotos, arvejas partidas y soja texturizada, por kilo.",
    detalle: "La base de guisos, hamburguesas caseras y ensaladas. Secas duran meses en la alacena, por eso conviene comprarlas en cantidad.",
  },
  Panificados: {
    img: "/img/gondolas/panificados.webp",
    intro: "Tostadas, fajitas, panes de molde integrales y con semillas, y bizcochos de salvado.",
    detalle: "Panificados envasados para tener siempre a mano. Revisá en cada ficha la presentación y si el fabricante lo rotula sin TACC.",
  },
  "Frutas desecadas": {
    img: "/img/gondolas/frutas-desecadas.webp",
    intro: "Pasas de uva, dátiles, ciruelas, higos, duraznos, peras, coco rallado y chips de banana, por kilo.",
    detalle: "Para colaciones, repostería, granolas y tablas. Combinan con la góndola de frutos secos para armar tu propio mix.",
  },
  "Repostería": {
    img: "/img/combos/reposteria-casera.webp",
    intro: "Cacao amargo, chips y chocolatinas, azúcar mascabo e impalpable, coco, esencias, polvo para hornear y gelatina.",
    detalle: "Todo para la repostería casera o de un emprendimiento, en presentaciones más grandes que las del súper.",
  },
  Chocolates: {
    img: "/img/productos/chocolate-colonial-70.webp",
    intro: "Chocolates en tableta y cobertura para repostería, con distintos porcentajes de cacao.",
    detalle: "Para comer, regalar o usar en la cocina. Mirá también la góndola de repostería para chips y cacao en polvo.",
  },
};
