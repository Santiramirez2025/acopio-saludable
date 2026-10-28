// El catálogo con los proveedores nuevos (octubre 2026).
//
// Distrimay era caro en lo que más se vende y fallaba con el stock. Desde el 20/10/2026 el proveedor
// principal es La Granja del Centro (LG) y los mixes los armamos nosotros con su mercadería: los
// códigos TG-… quedaron por historia (fotos, links y pedidos viejos), pero su costo es el de la
// receta propia o el de La Granja. Todo Granolas ya no es proveedor. Esto carga los productos con su costo real, y arma
// los combos con presentaciones hogareñas que llegan justo a la compra mínima. Los códigos
// propios (TG-…, LG-…) no chocan con los de Distrimay.
//
// Costos: Todo Granolas cobra el precio de lista tal cual (la lista dice «sin IVA», pero el ticket
// del 19/10/2026 salió a precio de lista, sin IVA agregado). La Granja también viene final.
// Los márgenes de TG se recalcularon para que los precios de venta queden iguales a los de antes
// (cuando el costo se cargaba con un 21% de más).
//
// Precio = costo × (1 + margen). El margen por defecto es el de una dietética en fraccionado
// (75%); los de ticket alto (nuez, almendra, cajú, arándanos) y las granolas llevan menos para
// quedar en precio de mercado.
//
// Puro (sin base): se aplica con /api/admin/catalogo/ajustar y se prueba sin gastar nada.

export type ProductoProveedor = {
  codigo: string;
  producto: string;
  marca: string;
  presentacion: string;
  categoria: string;
  contenido: number;
  unidad: "g" | "ml";
  costo: number;
  /** Margen sobre el costo (0.75 = 75%). */
  margen?: number;
  pesoBrutoG?: number;
  nichos?: string[];
  objetivos?: string[];
  porQueLoElegimos?: string;
  /** Código del producto en la lista del proveedor, para actualizar el costo solo desde el PDF. */
  codigoProveedor?: string;
};

export const MARGEN_FRACCIONADO = 0.6;
const IVA = 1.21;
const tg = (lista: number) => lista;
/** Margen que deja el mismo precio de venta que tenía el producto cuando el costo llevaba el 21% de más. */
const mTg = (m = MARGEN_FRACCIONADO) => Math.round(((1 + m) * IVA - 1) * 1000) / 1000;
const SUELTO = "Sin marca / fraccionado";

export const PRODUCTOS_PROVEEDORES: ProductoProveedor[] = [
  // ——— 28/10/2026: harinas de Harinar (Carlos Paz, más baratas que La Granja) y especias y fécula de La Granja ———
  // Los HR-… se compran en Distribuidora HARINAR (ver lib/harinar.ts): van como «propio» para que la lista de La Granja no les pise el costo.
  { codigo: "HR-HINTEGRAL", codigoProveedor: "propio", producto: "Harina integral", marca: SUELTO, presentacion: "x 1 kg", categoria: "Harinas y Féculas", contenido: 1000, unidad: "g", costo: 900, margen: 1.1111, pesoBrutoG: 1020, porQueLoElegimos: "Harina integral de trigo, para panes, pizzas y budines caseros. Fraccionada en el día." },
  { codigo: "HR-SALVADO-500", codigoProveedor: "propio", producto: "Salvado de trigo", marca: SUELTO, presentacion: "x 500 g", categoria: "Harinas y Féculas", contenido: 500, unidad: "g", costo: 360, margen: 2.3333, pesoBrutoG: 520, porQueLoElegimos: "Para sumar fibra al yogur, la avena o la masa del pan." },
  { codigo: "HR-GLUTEN-500", codigoProveedor: "propio", producto: "Gluten de trigo", marca: SUELTO, presentacion: "x 500 g", categoria: "Harinas y Féculas", contenido: 500, unidad: "g", costo: 4650, margen: 0.6989, pesoBrutoG: 520, porQueLoElegimos: "Para seitán y para que el pan integral levante más." },
  { codigo: "HR-GOTAS-250", codigoProveedor: "propio", producto: "Gotas de chocolate negro", marca: "Águila", presentacion: "x 250 g", categoria: "Repostería", contenido: 250, unidad: "g", costo: 2680, margen: 0.8284, pesoBrutoG: 270, porQueLoElegimos: "No se derriten en el horno: para galletas, budines y pan dulce." },
  { codigo: "LG-FECMAND", codigoProveedor: "001-216", producto: "Fécula de mandioca", marca: SUELTO, presentacion: "x 1 kg", categoria: "Harinas y Féculas", contenido: 1000, unidad: "g", costo: 3304, margen: 0.7857, pesoBrutoG: 1020, porQueLoElegimos: "Para chipá, panes y para espesar salsas." },
  { codigo: "LG-CANELA-100", codigoProveedor: "977-004", producto: "Canela molida", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 908, margen: 1.6432, pesoBrutoG: 110 },
  { codigo: "LG-CURCUMA-100", codigoProveedor: "977-009", producto: "Cúrcuma molida", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 636, margen: 1.8302, pesoBrutoG: 110 },
  { codigo: "LG-COMINO-100", codigoProveedor: "977-007", producto: "Comino molido", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 664, margen: 1.7108, pesoBrutoG: 110 },
  { codigo: "LG-PIMENTONAH-100", codigoProveedor: "977-018", producto: "Pimentón ahumado", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 771, margen: 1.594, pesoBrutoG: 110 },
  { codigo: "LG-PROVENZAL-100", codigoProveedor: "977-021", producto: "Provenzal", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 722, margen: 1.6316, pesoBrutoG: 110 },
  { codigo: "LG-PIMIENTA-100", codigoProveedor: "977-020", producto: "Pimienta negra molida", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 1070, margen: 1.4299, pesoBrutoG: 110 },
  { codigo: "LG-NUEZMOSC-100", codigoProveedor: "977-012", producto: "Nuez moscada molida", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 942, margen: 1.5478, pesoBrutoG: 110 },
  { codigo: "LG-AJI-100", codigoProveedor: "977-002", producto: "Ají molido", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 789, margen: 1.5349, pesoBrutoG: 110 },
  { codigo: "LG-CURRY-100", codigoProveedor: "977-010", producto: "Curry", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 519, margen: 1.8902, pesoBrutoG: 110 },
  { codigo: "LG-AJO-100", codigoProveedor: "977-003", producto: "Ajo en polvo", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 549, margen: 1.7322, pesoBrutoG: 110 },
  { codigo: "LG-JENGIBRE-100", codigoProveedor: "977-011", producto: "Jengibre molido", marca: SUELTO, presentacion: "x 100 g", categoria: "Especias", contenido: 100, unidad: "g", costo: 661, margen: 1.7231, pesoBrutoG: 110 },
  // ——— Todo Granolas: mixes y frutos secos ———
  { codigo: "TG-MIXCG", codigoProveedor: "propio", producto: "Mix Clásico con cajú y girasol", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", margen: 0.558, costo: 7400, pesoBrutoG: 1020, porQueLoElegimos: "Nueces, almendras, castañas de cajú, maní, pasas y girasol: el mix de todos los días, con cajú." },
  // Medio kilo de los cuatro de la Despensa, para la Despensa chica (zona de reparto propio): mismo costo por kilo, 4% más caro por fraccionar.
  { codigo: "TG-MIXCG-500", codigoProveedor: "propio", producto: "Mix Clásico con cajú y girasol", marca: SUELTO, presentacion: "x 500 g", categoria: "Frutos secos y mix", contenido: 500, unidad: "g", margen: 0.62, costo: 3700, pesoBrutoG: 520, porQueLoElegimos: "Nueces, almendras, castañas de cajú, maní, pasas y girasol: el mix de todos los días, en medio kilo." },
  { codigo: "TG-PASAS-500", codigoProveedor: "009-037", producto: "Pasas de uva negras sin semilla", marca: SUELTO, presentacion: "x 500 g", categoria: "Frutas desecadas", contenido: 500, unidad: "g", margen: 1.179, costo: 1575, pesoBrutoG: 520 },
  { codigo: "LG-DATIL-500", codigoProveedor: "980-047", producto: "Dátiles Deglet Nour con carozo (Argelia)", marca: SUELTO, presentacion: "x 500 g", categoria: "Frutas desecadas", contenido: 500, unidad: "g", costo: 4535, margen: 0.664, pesoBrutoG: 520, porQueLoElegimos: "Deglet Nour de Argelia: más carnoso y dulce que el egipcio, con carozo. Medio kilo." },
  { codigo: "LG-MIXSEM-500", codigoProveedor: "001-301", producto: "Mix de semillas para el desayuno", marca: SUELTO, presentacion: "x 500 g", categoria: "Semillas y granos", contenido: 500, unidad: "g", costo: 1989, margen: 0.664, pesoBrutoG: 520, porQueLoElegimos: "Lino, sésamo, girasol y chía, listas para el yogur o la ensalada. Medio kilo." },
  { codigo: "TG-MIXC", codigoProveedor: "propio", producto: "Mix Clásico con cajú", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", margen: 0.658, costo: 8600, pesoBrutoG: 1020, porQueLoElegimos: "Nueces, almendras, castañas de cajú, maní y pasas de uva. Sin girasol." },
  { codigo: "TG-MIXGIR", codigoProveedor: "propio", producto: "Mix Clásico con girasol", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", margen: 0.77, costo: 7400, pesoBrutoG: 1020 },
  { codigo: "TG-MIXT", codigoProveedor: "095-015", producto: "Mix Tropical con cajú", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", margen: mTg(), costo: tg(8654), pesoBrutoG: 1020, porQueLoElegimos: "Con banana chips, ananá y castañas de cajú." },
  { codigo: "TG-MIXTG", codigoProveedor: "095-017", producto: "Mix Tropical con girasol", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", margen: mTg(), costo: tg(7257), pesoBrutoG: 1020 },
  { codigo: "TG-MIXP", codigoProveedor: "095-020", producto: "Mix Premium sin pasas", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(10240), margen: mTg(0.6), pesoBrutoG: 1020, porQueLoElegimos: "Nuez, almendra, castañas y maní, sin pasas." },
  { codigo: "TG-MIXTSM", codigoProveedor: "propio", producto: "Mix Tropical con cajú sin maní", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: 12100, margen: 0.479, pesoBrutoG: 1020, porQueLoElegimos: "Para los que no comen maní: castañas de cajú, frutas tropicales y pasas, sin una sola semilla de maní." },
  { codigo: "TG-MIXXP", codigoProveedor: "095-021", producto: "Mix Extra Premium sin maní y sin pasas", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(16500), margen: mTg(0.35), pesoBrutoG: 1020, porQueLoElegimos: "Solo frutos secos premium, sin maní ni pasas." },
  { codigo: "TG-MIXCERV", codigoProveedor: "095-046", producto: "Mix Cervecero premium", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", margen: mTg(), costo: tg(6236), pesoBrutoG: 1020, porQueLoElegimos: "Maní salado, almendras, castañas, maíz frito y semillas: la picada lista." },
  { codigo: "TG-NUEZ", codigoProveedor: "981-007", producto: "Nuez Mariposa blanca light", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: 15993, margen: 0.44, pesoBrutoG: 1020, porQueLoElegimos: "Mariposa entera y clara, cosecha 2026." },
  { codigo: "TG-ALMGUARA", codigoProveedor: "095-025", producto: "Almendras Guara mediana", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: 22100, margen: 0.403, pesoBrutoG: 1020, porQueLoElegimos: "Almendra argentina de tamaño mediano, dulce y crocante. Más chica que la Non Pareil y más accesible." },
  { codigo: "TG-CAJU", codigoProveedor: "981-013", producto: "Castañas de cajú W4", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: 17729, margen: 0.402, pesoBrutoG: 1020 },
  { codigo: "TG-PASAS", codigoProveedor: "009-037", producto: "Pasas de uva negras sin semilla", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutas desecadas", contenido: 1000, unidad: "g", margen: 1.095, costo: 3150, pesoBrutoG: 1020 },
  { codigo: "TG-BANANA", codigoProveedor: "", producto: "Banana chips", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutas desecadas", contenido: 1000, unidad: "g", costo: 14870, margen: 0.35, pesoBrutoG: 1020 },
  { codigo: "TG-MANIQUESO", codigoProveedor: "095-051", producto: "Maní saborizado queso", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", margen: mTg(), costo: tg(4080), pesoBrutoG: 1020 },
  { codigo: "TG-MANIJAMON", codigoProveedor: "095-049", producto: "Maní saborizado jamón", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", margen: mTg(), costo: tg(4080), pesoBrutoG: 1020 },
  { codigo: "TG-MANIPIZZA", codigoProveedor: "095-048", producto: "Maní saborizado pizza", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", margen: mTg(), costo: tg(4080), pesoBrutoG: 1020 },
  { codigo: "TG-GIRASOL", codigoProveedor: "001-221", producto: "Semillas de girasol peladas", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", margen: 0.372, costo: 4503, pesoBrutoG: 1020 },
  { codigo: "TG-ZAPALLO", codigoProveedor: "095-055", producto: "Semillas de zapallo", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", costo: tg(10184), margen: mTg(0.6), pesoBrutoG: 1020 },
  { codigo: "TG-QUINOAPOP", codigoProveedor: "095-056", producto: "Quinoa pop", marca: SUELTO, presentacion: "x 500 g", categoria: "Cereales y granolas", contenido: 500, unidad: "g", costo: tg(4658), margen: mTg(0.6), pesoBrutoG: 520 },
  // ——— Todo Granolas: granolas (fabricante cordobés) ———
  { codigo: "TG-GTRAD", codigoProveedor: "095-001", producto: "Granola Tradicional", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6460), margen: mTg(0.55), pesoBrutoG: 1020, porQueLoElegimos: "Hecha en Córdoba, con avena, miel y frutos secos." },
  { codigo: "TG-GPMANI", codigoProveedor: "095-002", producto: "Granola con pasta de maní", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6996), margen: mTg(0.55), pesoBrutoG: 1020 },
  { codigo: "TG-GCACAO", codigoProveedor: "095-005", producto: "Granola cacao y coco", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6996), margen: mTg(0.55), pesoBrutoG: 1020 },
  { codigo: "TG-GPROTE", codigoProveedor: "095-003", producto: "Granola proteica", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6996), margen: mTg(0.55), pesoBrutoG: 1020, objetivos: ["gym"] },
  { codigo: "TG-GALMENDRA", codigoProveedor: "095-006", producto: "Granola con almendras", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6996), margen: mTg(0.55), pesoBrutoG: 1020 },
  { codigo: "TG-GSTEVIA", codigoProveedor: "095-007", producto: "Granola con stevia (sin azúcar, vegana)", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(7657), margen: mTg(0.55), pesoBrutoG: 1020 },
  // ——— Todo Granolas: snacks ———
  { codigo: "TG-BARRA", producto: "Barra proteica Power", marca: "Todo Granolas", presentacion: "x unidad", categoria: "Almacen", contenido: 40, unidad: "g", costo: Math.round(tg(19656) / 10), margen: mTg(0.5), pesoBrutoG: 45, objetivos: ["gym"] },
  { codigo: "TG-ALFAJORFS", producto: "Alfajor de frutos secos", marca: "Todo Granolas", presentacion: "x unidad", categoria: "Galletas, alfajores y discos", contenido: 50, unidad: "g", costo: Math.round(tg(16700) / 12), margen: mTg(0.6), pesoBrutoG: 55 },
  // ——— La Granja del Centro (con IVA) ———
  { codigo: "LG-DATIL", codigoProveedor: "980-047", producto: "Dátiles Deglet Nour con carozo (Argelia)", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutas desecadas", contenido: 1000, unidad: "g", costo: 9069, margen: 0.6 /* $14.510 suelto; la Despensa mantiene su precio con más descuento */, pesoBrutoG: 1020, porQueLoElegimos: "Deglet Nour de Argelia: más carnoso y dulce que el egipcio, con carozo." },
  { codigo: "LG-MIXSEM", codigoProveedor: "001-301", producto: "Mix de semillas para el desayuno", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", costo: 3978, pesoBrutoG: 1020, porQueLoElegimos: "Lino, sésamo, girasol y chía, listas para el yogur o la ensalada." },
  { codigo: "LG-CHIA", codigoProveedor: "001-213", producto: "Semillas de chía", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", costo: 5440, pesoBrutoG: 1020 },
  { codigo: "LG-LINO", codigoProveedor: "001-241", producto: "Semillas de lino", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", costo: 3791, pesoBrutoG: 1020 },
  { codigo: "LG-SAL", codigoProveedor: "005-108", producto: "Sal rosada del Himalaya fina", marca: SUELTO, presentacion: "x 1 kg", categoria: "Almacen", contenido: 1000, unidad: "g", costo: 3117, margen: 0.7, pesoBrutoG: 1020 },
  { codigo: "LG-MIEL", codigoProveedor: "119-002", producto: "Miel de abejas pura", marca: "Los Dos Zánganos", presentacion: "x 500 g", categoria: "Almacen", contenido: 500, unidad: "g", costo: 4455, margen: 0.6, pesoBrutoG: 720 },
  { codigo: "LG-LENTEJA", codigoProveedor: "916-505", producto: "Lentejas especiales", marca: "Marcilli", presentacion: "x 400 g", categoria: "Legumbres", contenido: 400, unidad: "g", costo: 1074, margen: 0.8, pesoBrutoG: 410 },
  { codigo: "LG-GARBANZO", codigoProveedor: "916-503", producto: "Garbanzos seleccionados", marca: "Marcilli", presentacion: "x 400 g", categoria: "Legumbres", contenido: 400, unidad: "g", costo: 606, margen: 0.9, pesoBrutoG: 410 },
  { codigo: "LG-PASASRUBIAS", codigoProveedor: "009-134", producto: "Pasas de uva rubias", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutas desecadas", contenido: 1000, unidad: "g", costo: 7650, margen: 0.6, pesoBrutoG: 1020 },
  // ——— La Granja del Centro, compra del 20/10/2026 (reemplaza a Todo Granolas) ———
  { codigo: "LG-GTRAD", codigoProveedor: "916-053", producto: "Granola tradicional", marca: "Marcilli", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: 6516, margen: 0.85, pesoBrutoG: 1020, porQueLoElegimos: "Avena, miel y frutos secos, crocante. De Marcilli, una marca que conocemos bien." },
  { codigo: "LG-GPMANI", codigoProveedor: "117-004", producto: "Granola con pasta de maní", marca: "Olimar", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: 7650, margen: 0.715, pesoBrutoG: 1020 },
  { codigo: "LG-GPROTE", codigoProveedor: "916-052", producto: "Granola proteica Sport", marca: "Marcilli", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: 7673, margen: 0.71, pesoBrutoG: 1020, objetivos: ["gym"] },
  { codigo: "LG-AVENA", codigoProveedor: "001-295", producto: "Avena arrollada fina", marca: "Marcilli", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: 2380, margen: 0.75, pesoBrutoG: 1020, objetivos: ["gym"] },
  { codigo: "LG-CACAO-250", codigoProveedor: "101-035", producto: "Cacao amargo especial", marca: "Alzol", presentacion: "x 250 g", categoria: "Almacen", contenido: 250, unidad: "g", costo: 2734, margen: 0.75, pesoBrutoG: 270, objetivos: ["gym"] },
  { codigo: "LG-ALMNP", codigoProveedor: "981-025", producto: "Almendras Non Pareil", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: 29362, margen: 0.36, pesoBrutoG: 1020, porQueLoElegimos: "La almendra grande de California, pareja y crocante." },
  { codigo: "LG-ALMNP-500", codigoProveedor: "981-025", producto: "Almendras Non Pareil", marca: SUELTO, presentacion: "x 500 g", categoria: "Frutos secos y mix", contenido: 500, unidad: "g", costo: 14681, margen: 0.4, pesoBrutoG: 520, porQueLoElegimos: "La almendra grande de California, pareja y crocante. Medio kilo." },
  { codigo: "LG-NATUZEN-RALLADO", codigoProveedor: "917-021", producto: "Pan rallado sin TACC", marca: "Natuzen", presentacion: "x 450 g", categoria: "Sin TACC", contenido: 450, unidad: "g", costo: 2790, margen: 0.6, pesoBrutoG: 470 },
  { codigo: "LG-NATUZEN-TAPAS", codigoProveedor: "917-009", producto: "Tapas de alfajor sin TACC", marca: "Natuzen", presentacion: "x 300 g", categoria: "Sin TACC", contenido: 300, unidad: "g", costo: 2798, margen: 0.6, pesoBrutoG: 320 },
  { codigo: "LG-NATUZEN-PEPAS", codigoProveedor: "917-001", producto: "Galletitas pepas sin TACC", marca: "Natuzen", presentacion: "x 200 g", categoria: "Sin TACC", contenido: 200, unidad: "g", costo: 2162, margen: 0.6, pesoBrutoG: 220 },
  // ——— Octubre 2026: mix propio y merienda sin TACC, todo de La Granja ———
  { codigo: "TG-MIXCAJUBAN", codigoProveedor: "propio", producto: "Mix de cajú y banana chips", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: 14000 /* cajú SK1 y banana a granel de La Granja */, margen: 0.45, pesoBrutoG: 1020, porQueLoElegimos: "Mitad castañas de cajú, mitad banana chips: dulce, crocante y sin maní." },
  { codigo: "TG-MIXCAJUBAN-500", codigoProveedor: "propio", producto: "Mix de cajú y banana chips", marca: SUELTO, presentacion: "x 500 g", categoria: "Frutos secos y mix", contenido: 500, unidad: "g", costo: 7000, margen: 0.46, pesoBrutoG: 520, porQueLoElegimos: "Mitad castañas de cajú, mitad banana chips: dulce, crocante y sin maní. Medio kilo." },
  { codigo: "TG-CAJUPASAS", codigoProveedor: "propio", producto: "Cajú con pasas", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: 10440, margen: 0.41 /* lista $15.900 con el recargo de la tienda, el precio que se le pasó a Mabel */, pesoBrutoG: 1020, porQueLoElegimos: "Mitad castañas de cajú W4 y mitad pasas de uva sin semilla, mezcladas en la bolsa." },
  { codigo: "LG-TAPITAS-VAI", codigoProveedor: "907-006", producto: "Tapitas para alfajor de vainilla", marca: "Doninas", presentacion: "x 200 g", categoria: "Galletas, alfajores y discos", contenido: 200, unidad: "g", costo: 2325, pesoBrutoG: 230 },
  { codigo: "LG-TAPITAS-CHOC", codigoProveedor: "907-014", producto: "Tapitas para alfajor de chocolate", marca: "Doninas", presentacion: "x 200 g", categoria: "Galletas, alfajores y discos", contenido: 200, unidad: "g", costo: 2325, pesoBrutoG: 230 },
  { codigo: "LG-DDL-REPOSTERO", codigoProveedor: "958-008", producto: "Dulce de leche repostero", marca: "Trini", presentacion: "x 1 kg", categoria: "Almacen", contenido: 1000, unidad: "g", costo: 15872, margen: 0.45, pesoBrutoG: 1100 },
  { codigo: "LG-YUKA-ALF-DDL", codigoProveedor: "903-009", producto: "Alfajores de dulce de leche sin TACC", marca: "Yuka", presentacion: "x 6 unidades", categoria: "Galletas, alfajores y discos", contenido: 6, unidad: "g", costo: 4726, pesoBrutoG: 330 },
  { codigo: "LG-YUKA-ALF-CHOC", codigoProveedor: "903-001", producto: "Alfajores de chocolate sin TACC", marca: "Yuka", presentacion: "x 6 unidades", categoria: "Galletas, alfajores y discos", contenido: 6, unidad: "g", costo: 4726, pesoBrutoG: 330 },
  { codigo: "LG-YUKA-GALL-VAI", codigoProveedor: "903-004", producto: "Galletas de vainilla sin TACC", marca: "Yuka", presentacion: "x 150 g", categoria: "Galletas, alfajores y discos", contenido: 150, unidad: "g", costo: 2229, pesoBrutoG: 170 },
  { codigo: "LG-DONINAS-COCO", codigoProveedor: "907-008", producto: "Galletitas de coco y dulce de leche", marca: "Doninas", presentacion: "x 200 g", categoria: "Galletas, alfajores y discos", contenido: 200, unidad: "g", costo: 2700, pesoBrutoG: 230 },
  { codigo: "LG-DONINAS-CHIPS", codigoProveedor: "907-007", producto: "Galletitas con chips de chocolate", marca: "Doninas", presentacion: "x 200 g", categoria: "Galletas, alfajores y discos", contenido: 200, unidad: "g", costo: 2700, pesoBrutoG: 230 },
  // ——— Navidad 2026 (combo «Mesa navideña», experimento E3): costos de La Granja del 27/10 que pasó Pablo,
  // precios de venta sugeridos por él (ya con el recargo de la tienda): 6.500 · 9.500 · 14.000 · 8.500 · 9.000 · 2.000.
  // Sin foto propia todavía: la ficha muestra la ilustración de la casa hasta que Lucas tenga las reales. ———
  { codigo: "LG-GARRAPMANI-500", producto: "Garrapiñada de maní", marca: SUELTO, presentacion: "x 500 g", categoria: "Frutos secos y mix", contenido: 500, unidad: "g", costo: 3880, margen: 0.5512, pesoBrutoG: 520, porQueLoElegimos: "La garrapiñada de maní de las fiestas, crocante y acaramelada. Medio kilo para la mesa navideña." },
  { codigo: "LG-ALMGARRAP-250", producto: "Almendras garrapiñadas", marca: SUELTO, presentacion: "x 250 g", categoria: "Frutos secos y mix", contenido: 250, unidad: "g", costo: 6320, margen: 0.3918, pesoBrutoG: 270, porQueLoElegimos: "Almendras enteras con baño de caramelo crocante: un clásico de la mesa dulce." },
  { codigo: "LG-PASASCHOC-400", producto: "Pasas de uva con chocolate sin TACC", marca: SUELTO, presentacion: "x 400 g", categoria: "Frutas desecadas", contenido: 400, unidad: "g", costo: 9820, margen: 0.3201, pesoBrutoG: 420 },
  { codigo: "LG-PANDULCE-CERAL", producto: "Pan dulce diet con frutas", marca: "Ceral", presentacion: "x 400 g", categoria: "Almacen", contenido: 400, unidad: "g", costo: 5570, margen: 0.413, pesoBrutoG: 450 },
  // Medio kilo del Mix Clásico con cajú, para el combo. Costo conservador de Pablo (receta con La Granja).
  { codigo: "TG-MIXC-500", codigoProveedor: "propio", producto: "Mix Clásico con cajú", marca: SUELTO, presentacion: "x 500 g", categoria: "Frutos secos y mix", contenido: 500, unidad: "g", costo: 7000, margen: 0.1905, pesoBrutoG: 520, porQueLoElegimos: "Nueces, almendras, castañas de cajú, maní y pasas de uva. Sin girasol. Medio kilo." },
  { codigo: "LG-BOLSAREGALO", producto: "Bolsa regalo navideña", marca: SUELTO, presentacion: "x 1 unidad", categoria: "Almacen", contenido: 0 /* no se vende por peso: sin «1 g» en la ficha */, unidad: "g", costo: 1500, margen: 0.2346, pesoBrutoG: 50, porQueLoElegimos: "Bolsa para regalo: armamos tu pedido adentro, listo para entregar." },
];

/** Productos del catálogo propio que todavía no tienen foto propia en public/img/productos/prov. */
const SIN_FOTO_PROPIA = ["TG-ALFAJORFS", "LG-SAL", "LG-GARRAPMANI-500", "LG-ALMGARRAP-250", "LG-PASASCHOC-400", "LG-PANDULCE-CERAL", "LG-BOLSAREGALO"];
/** Presentaciones que usan la foto de otra (mismo producto, otro peso). */
const FOTO_DE: Record<string, string> = { "TG-MIXC-500": "TG-MIXC" };

export function precioDe(p: ProductoProveedor): number {
  return Math.round(p.costo * (1 + (p.margen ?? MARGEN_FRACCIONADO)));
}

export type ComboProveedor = { slug: string; nombre: string; descuentoPct: number; destacado?: boolean; items: { codigo: string; cantidad: number }[] };

/**
 * Los combos, todos con presentaciones de casa y pensados para llegar justo a la compra mínima.
 * Los códigos sin prefijo son productos de marca que siguen viniendo de Distrimay.
 */
export const COMBOS_PROVEEDORES: ComboProveedor[] = [
  { slug: "despensa-4-kilos", nombre: "Despensa de 4 kilos", descuentoPct: 16.37, destacado: true, items: [{ codigo: "TG-MIXCG", cantidad: 1 }, { codigo: "LG-DATIL", cantidad: 1 }, { codigo: "TG-PASAS", cantidad: 1 }, { codigo: "LG-MIXSEM", cantidad: 1 }] },
  // Despensa chica: 2 kilos, llega justo a la compra mínima de Carlos Paz ($20.000).
  { slug: "despensa-chica", nombre: "Despensa chica de 2 kilos", descuentoPct: 6.7, destacado: true, items: [{ codigo: "TG-MIXCG-500", cantidad: 1 }, { codigo: "LG-DATIL-500", cantidad: 1 }, { codigo: "TG-PASAS-500", cantidad: 1 }, { codigo: "LG-MIXSEM-500", cantidad: 1 }] },
  { slug: "mixes-del-mes", nombre: "Mixes del mes", descuentoPct: 3, items: [{ codigo: "TG-MIXGIR", cantidad: 1 }, { codigo: "TG-MIXTSM", cantidad: 1 }, { codigo: "TG-PASAS", cantidad: 1 }] },
  { slug: "alacena-de-frutos-secos", nombre: "Alacena de frutos secos", descuentoPct: 5, destacado: true, items: [{ codigo: "TG-NUEZ", cantidad: 1 }, { codigo: "TG-MIXC", cantidad: 1 }, { codigo: "TG-PASAS", cantidad: 1 }] },
  { slug: "desayuno-30-dias", nombre: "Desayuno 30 días", descuentoPct: 5, destacado: true, items: [{ codigo: "LG-GTRAD", cantidad: 1 }, { codigo: "LG-GPMANI", cantidad: 1 }, { codigo: "LG-MIEL", cantidad: 1 }] },
  { slug: "picada-y-snacks", nombre: "Picada y snacks", descuentoPct: 3, items: [{ codigo: "TG-MIXCERV", cantidad: 1 }, { codigo: "TG-MANIQUESO", cantidad: 1 }, { codigo: "TG-MANIJAMON", cantidad: 1 }, { codigo: "TG-GIRASOL", cantidad: 1 }] },
  { slug: "mix-caju-banana", nombre: "Mix de cajú y banana · 2 kilos", descuentoPct: 5, destacado: true, items: [{ codigo: "TG-MIXCAJUBAN", cantidad: 2 }] },
  { slug: "alfajorcitos-caseros", nombre: "Kit alfajorcitos caseros", descuentoPct: 5, destacado: true, items: [{ codigo: "LG-TAPITAS-VAI", cantidad: 2 }, { codigo: "LG-TAPITAS-CHOC", cantidad: 1 }, { codigo: "LG-DDL-REPOSTERO", cantidad: 1 }] },
  { slug: "merienda-sin-tacc-yuka", nombre: "Merienda sin TACC", descuentoPct: 5, destacado: true, items: [{ codigo: "LG-YUKA-ALF-DDL", cantidad: 1 }, { codigo: "LG-YUKA-ALF-CHOC", cantidad: 1 }, { codigo: "LG-YUKA-GALL-VAI", cantidad: 1 }, { codigo: "LG-DONINAS-COCO", cantidad: 1 }, { codigo: "LG-DONINAS-CHIPS", cantidad: 1 }] },
  // Combo Navidad (opción A de Pablo, 27/10): costo $34.090, se vende a $49.000 (margen 30,4%). La suma suelta da $49.500.
  { slug: "mesa-navidena", nombre: "Mesa navideña", descuentoPct: 1.01, destacado: true, items: [{ codigo: "LG-GARRAPMANI-500", cantidad: 1 }, { codigo: "LG-ALMGARRAP-250", cantidad: 1 }, { codigo: "LG-PASASCHOC-400", cantidad: 1 }, { codigo: "LG-PANDULCE-CERAL", cantidad: 1 }, { codigo: "TG-MIXC-500", cantidad: 1 }, { codigo: "LG-BOLSAREGALO", cantidad: 1 }] },
  { slug: "arranque-gym", nombre: "Pack gym del mes", descuentoPct: 5, items: [{ codigo: "LG-GPROTE", cantidad: 1 }, { codigo: "LG-AVENA", cantidad: 1 }, { codigo: "LG-CACAO-250", cantidad: 1 }, { codigo: "LG-ALMNP-500", cantidad: 1 } ] },
];

/** Combos que quedaban rellenados con bolsones: se desactivan hasta rearmarlos con stock propio. */
export const COMBOS_A_DESACTIVAR = ["picada-y-snacks", "merienda-sin-tacc", "guisos-y-legumbres", "especiero-completo", "reposteria-casera", "duo-magnesio", "despensa-del-gym", "alacena-sin-tacc"];

/** Lo que se saca de la vista pública: bolsones y presentaciones de negocio, y lo que no es dietética. */
export const OCULTAR = {
  presentacion: /bols[oó]n|caja x ?(1[0-9]|[2-9]\d)|\b(5|10|12|20|22|25) ?(kg|kilos?)\b|x ?(5|10|20|25) ?k\b/i,
  producto: /sahumerio|cascara sagrada|laxante/i,
  categorias: ["Supermercado"],
  /** Sueltos de Distrimay que ya tenemos de Todo Granolas o La Granja: más caros y con stock que falla. El vendedor cotizaba estos. */
  codigos: [] as string[], // se completa abajo con las claves de REEMPLAZOS
  motivo: "Bolsón o fuera de rubro (catálogo hogar, oct 2026)",
};

/** En los pedidos sugeridos por rubro, cada suelto de Distrimay pasa a su equivalente propio, así se puede ocultar. */
export const REEMPLAZOS: Record<string, string> = {
  "8052": "TG-MIXCG", "1102": "TG-MIXCG", "1104": "TG-MIXCG", "5656564": "TG-MIXCG", "5656563": "TG-MIXT", "654854": "TG-MIXCERV", "4544451": "TG-MIXCERV",
  "706": "TG-NUEZ", "707": "TG-NUEZ", "570": "TG-PASAS", "571": "TG-PASAS", "6543268": "LG-PASASRUBIAS", "7643289": "LG-PASASRUBIAS",
  "5006": "LG-DATIL", "5007": "LG-DATIL", "800000000120": "LG-DATIL", "0111": "LG-DATIL",
  "149": "LG-MIXSEM", "150": "LG-MIXSEM", "522054": "LG-CHIA", "00000011": "LG-CHIA", "800000000158": "LG-LINO", "800000000159": "LG-LINO",
  "77981422628974": "TG-GIRASOL", "800000000162": "TG-GIRASOL",
  "5000": "TG-MANIPIZZA", "000098": "TG-MANIPIZZA", "5002": "TG-MANIJAMON", "0000099": "TG-MANIJAMON", "314151": "TG-MANIQUESO", "32425262": "TG-MANIQUESO", "95668": "LG-GPMANI",
};

/** Productos cargados que todavía no se venden (sin stock o sin foto real). */
export const OCULTOS_PROPIOS = [
  // Todo Granolas ya no es proveedor: sus granolas, barras y alfajores se reemplazan por La Granja (LG-…).
  "TG-ALFAJORFS", "TG-BARRA", "TG-GTRAD", "TG-GPMANI", "TG-GCACAO", "TG-GPROTE", "TG-GALMENDRA", "TG-GSTEVIA",
  // Mixes y snacks que todavía no armamos ni compramos: vuelven cuando haya receta o proveedor.
  "TG-MIXT", "TG-MIXTG", "TG-MIXP", "TG-MIXXP", "TG-MIXCERV", "TG-MANIQUESO", "TG-MANIJAMON", "TG-MANIPIZZA", "TG-QUINOAPOP", "TG-ZAPALLO",
];

/** Fotos propias, generadas con el estilo de los anuncios (public/img/productos/prov y combos/v2). */
const CON_FOTO = new Set(PRODUCTOS_PROVEEDORES.map((p) => p.codigo).filter((c) => !SIN_FOTO_PROPIA.includes(c)));
export const fotoProducto = (codigo: string) => (CON_FOTO.has(codigo) ? `/img/productos/prov/${(FOTO_DE[codigo] ?? codigo).toLowerCase()}.webp` : null);
/** Combos sin portada propia en public/img/combos/v3: sin foto, la página muestra los productos (no una imagen rota). */
const COMBOS_SIN_PORTADA = new Set(["mesa-navidena"]);
export const fotoCombo = (slug: string) => (COMBOS_SIN_PORTADA.has(slug) ? null : `/img/combos/v3/${slug}.webp`);

OCULTAR.codigos.push(...Object.keys(REEMPLAZOS));

/** Código del proveedor → código nuestro, por proveedor. */
export const POR_CODIGO_PROVEEDOR: Record<"TG" | "LG", Record<string, string[]>> = { TG: {}, LG: {} };
for (const p of PRODUCTOS_PROVEEDORES) {
  // Los TG-… que pasaron a La Granja llevan el código de su lista; los de 095-… son de la lista vieja de Todo Granolas.
  if (p.codigoProveedor && p.codigoProveedor !== "propio") {
    // Un mismo código del proveedor puede ser varias presentaciones nuestras (1 kg y 500 g de la misma almendra).
    const m = POR_CODIGO_PROVEEDOR[p.codigo.startsWith("LG-") || !p.codigoProveedor.startsWith("095-") ? "LG" : "TG"];
    (m[p.codigoProveedor] ??= []).push(p.codigo);
  }
}
