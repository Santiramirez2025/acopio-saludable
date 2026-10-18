// El catálogo con los proveedores nuevos (octubre 2026).
//
// Distrimay era caro en lo que más se vende y fallaba con el stock. Esto carga los productos
// que se compran a Todo Granolas (TG) y a La Granja del Centro (LG) con su costo real, y arma
// los combos con presentaciones hogareñas que llegan justo a la compra mínima. Los códigos
// propios (TG-…, LG-…) no chocan con los de Distrimay.
//
// Costos: Todo Granolas lista 2 más 21% de IVA (la lista dice «sin IVA»; si resulta final, el
// margen es mayor y se corrige acá). La Granja ya viene con IVA.
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
};

const IVA = 1.21;
const tg = (sinIva: number) => Math.round(sinIva * IVA);
const SUELTO = "Sin marca / fraccionado";

export const MARGEN_FRACCIONADO = 0.6;

export const PRODUCTOS_PROVEEDORES: ProductoProveedor[] = [
  // ——— Todo Granolas: mixes y frutos secos ———
  { codigo: "TG-MIXCG", producto: "Mix Clásico con cajú y girasol", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(5956), pesoBrutoG: 1020, porQueLoElegimos: "Nueces, almendras, castañas de cajú, maní, pasas y girasol: el mix de todos los días, con cajú." },
  { codigo: "TG-MIXC", producto: "Mix Clásico con cajú", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(7365), pesoBrutoG: 1020 },
  { codigo: "TG-MIXGIR", producto: "Mix Clásico con girasol", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(6760), pesoBrutoG: 1020 },
  { codigo: "TG-MIXT", producto: "Mix Tropical con cajú", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(8654), pesoBrutoG: 1020, porQueLoElegimos: "Con banana chips, ananá y castañas de cajú." },
  { codigo: "TG-MIXTG", producto: "Mix Tropical con girasol", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(7257), pesoBrutoG: 1020 },
  { codigo: "TG-MIXP", producto: "Mix Premium sin pasas", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(10240), margen: 0.6, pesoBrutoG: 1020, porQueLoElegimos: "Nuez, almendra, castañas y maní, sin pasas." },
  { codigo: "TG-MIXCERV", producto: "Mix Cervecero premium", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(6236), pesoBrutoG: 1020, porQueLoElegimos: "Maní salado, almendras, castañas, maíz frito y semillas: la picada lista." },
  { codigo: "TG-NUEZ", producto: "Nuez Mariposa blanca light", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(14076), margen: 0.25, pesoBrutoG: 1020, porQueLoElegimos: "Mariposa entera y clara, cosecha 2026." },
  { codigo: "TG-CAJU", producto: "Castañas de cajú W4", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(15799), margen: 0.3, pesoBrutoG: 1020 },
  { codigo: "TG-PASAS", producto: "Pasas de uva negras sin semilla", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutas desecadas", contenido: 1000, unidad: "g", costo: tg(3410), pesoBrutoG: 1020 },
  { codigo: "TG-BANANA", producto: "Banana chips", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutas desecadas", contenido: 1000, unidad: "g", costo: tg(12526), margen: 0.2, pesoBrutoG: 1020 },
  { codigo: "TG-MANIQUESO", producto: "Maní saborizado queso", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(4080), pesoBrutoG: 1020 },
  { codigo: "TG-MANIJAMON", producto: "Maní saborizado jamón", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(4080), pesoBrutoG: 1020 },
  { codigo: "TG-MANIPIZZA", producto: "Maní saborizado pizza", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutos secos y mix", contenido: 1000, unidad: "g", costo: tg(4080), pesoBrutoG: 1020 },
  { codigo: "TG-GIRASOL", producto: "Semillas de girasol peladas", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", costo: tg(3192), pesoBrutoG: 1020 },
  { codigo: "TG-ZAPALLO", producto: "Semillas de zapallo", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", costo: tg(10184), margen: 0.6, pesoBrutoG: 1020 },
  { codigo: "TG-QUINOAPOP", producto: "Quinoa pop", marca: SUELTO, presentacion: "x 500 g", categoria: "Cereales y granolas", contenido: 500, unidad: "g", costo: tg(4658), margen: 0.6, pesoBrutoG: 520 },
  // ——— Todo Granolas: granolas (fabricante cordobés) ———
  { codigo: "TG-GTRAD", producto: "Granola Tradicional", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6460), margen: 0.55, pesoBrutoG: 1020, porQueLoElegimos: "Hecha en Córdoba, con avena, miel y frutos secos." },
  { codigo: "TG-GPMANI", producto: "Granola con pasta de maní", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6996), margen: 0.55, pesoBrutoG: 1020 },
  { codigo: "TG-GCACAO", producto: "Granola cacao y coco", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6996), margen: 0.55, pesoBrutoG: 1020 },
  { codigo: "TG-GPROTE", producto: "Granola proteica", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6996), margen: 0.55, pesoBrutoG: 1020, objetivos: ["gym"] },
  { codigo: "TG-GALMENDRA", producto: "Granola con almendras", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(6996), margen: 0.55, pesoBrutoG: 1020 },
  { codigo: "TG-GSTEVIA", producto: "Granola con stevia (sin azúcar, vegana)", marca: "Todo Granolas", presentacion: "x 1 kg", categoria: "Cereales y granolas", contenido: 1000, unidad: "g", costo: tg(7657), margen: 0.55, pesoBrutoG: 1020 },
  // ——— Todo Granolas: snacks ———
  { codigo: "TG-BARRA", producto: "Barra proteica Power", marca: "Todo Granolas", presentacion: "x unidad", categoria: "Almacen", contenido: 40, unidad: "g", costo: Math.round(tg(19656) / 10), margen: 0.5, pesoBrutoG: 45, objetivos: ["gym"] },
  { codigo: "TG-ALFAJORFS", producto: "Alfajor de frutos secos", marca: "Todo Granolas", presentacion: "x unidad", categoria: "Galletas, alfajores y discos", contenido: 50, unidad: "g", costo: Math.round(tg(16700) / 12), margen: 0.6, pesoBrutoG: 55 },
  // ——— La Granja del Centro (con IVA) ———
  { codigo: "LG-DATIL", producto: "Dátiles con carozo", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutas desecadas", contenido: 1000, unidad: "g", costo: 6151, pesoBrutoG: 1020 },
  { codigo: "LG-MIXSEM", producto: "Mix de semillas para el desayuno", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", costo: 3978, pesoBrutoG: 1020, porQueLoElegimos: "Lino, sésamo, girasol y chía, listas para el yogur o la ensalada." },
  { codigo: "LG-CHIA", producto: "Semillas de chía", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", costo: 5440, pesoBrutoG: 1020 },
  { codigo: "LG-LINO", producto: "Semillas de lino", marca: SUELTO, presentacion: "x 1 kg", categoria: "Semillas y granos", contenido: 1000, unidad: "g", costo: 3791, pesoBrutoG: 1020 },
  { codigo: "LG-SAL", producto: "Sal rosada del Himalaya fina", marca: SUELTO, presentacion: "x 1 kg", categoria: "Almacen", contenido: 1000, unidad: "g", costo: 3117, margen: 0.7, pesoBrutoG: 1020 },
  { codigo: "LG-MIEL", producto: "Miel de abejas pura", marca: "Los Dos Zánganos", presentacion: "x 500 g", categoria: "Almacen", contenido: 500, unidad: "g", costo: 4455, margen: 0.6, pesoBrutoG: 720 },
  { codigo: "LG-LENTEJA", producto: "Lentejas especiales", marca: "Marcilli", presentacion: "x 400 g", categoria: "Legumbres", contenido: 400, unidad: "g", costo: 1074, margen: 0.8, pesoBrutoG: 410 },
  { codigo: "LG-GARBANZO", producto: "Garbanzos seleccionados", marca: "Marcilli", presentacion: "x 400 g", categoria: "Legumbres", contenido: 400, unidad: "g", costo: 606, margen: 0.9, pesoBrutoG: 410 },
  { codigo: "LG-PASASRUBIAS", producto: "Pasas de uva rubias", marca: SUELTO, presentacion: "x 1 kg", categoria: "Frutas desecadas", contenido: 1000, unidad: "g", costo: 7650, margen: 0.6, pesoBrutoG: 1020 },
];

export function precioDe(p: ProductoProveedor): number {
  return Math.round(p.costo * (1 + (p.margen ?? MARGEN_FRACCIONADO)));
}

export type ComboProveedor = { slug: string; nombre: string; descuentoPct: number; destacado?: boolean; items: { codigo: string; cantidad: number }[] };

/**
 * Los combos, todos con presentaciones de casa y pensados para llegar justo a la compra mínima.
 * Los códigos sin prefijo son productos de marca que siguen viniendo de Distrimay.
 */
export const COMBOS_PROVEEDORES: ComboProveedor[] = [
  { slug: "despensa-4-kilos", nombre: "Despensa de 4 kilos", descuentoPct: 5, destacado: true, items: [{ codigo: "TG-MIXCG", cantidad: 1 }, { codigo: "LG-DATIL", cantidad: 1 }, { codigo: "TG-PASAS", cantidad: 1 }, { codigo: "LG-MIXSEM", cantidad: 1 }] },
  { slug: "mixes-del-mes", nombre: "Mixes del mes", descuentoPct: 3, items: [{ codigo: "TG-MIXGIR", cantidad: 1 }, { codigo: "TG-MIXTG", cantidad: 1 }, { codigo: "TG-PASAS", cantidad: 1 }] },
  { slug: "alacena-de-frutos-secos", nombre: "Alacena de frutos secos", descuentoPct: 5, destacado: true, items: [{ codigo: "TG-NUEZ", cantidad: 1 }, { codigo: "TG-MIXC", cantidad: 1 }, { codigo: "TG-PASAS", cantidad: 1 }] },
  { slug: "desayuno-30-dias", nombre: "Desayuno 30 días", descuentoPct: 5, destacado: true, items: [{ codigo: "TG-GTRAD", cantidad: 1 }, { codigo: "TG-GPMANI", cantidad: 1 }, { codigo: "736684208707", cantidad: 1 }, { codigo: "LG-MIEL", cantidad: 1 }] },
  { slug: "picada-y-snacks", nombre: "Picada y snacks", descuentoPct: 3, items: [{ codigo: "TG-MIXCERV", cantidad: 1 }, { codigo: "TG-MANIQUESO", cantidad: 1 }, { codigo: "TG-MANIJAMON", cantidad: 1 }, { codigo: "TG-GIRASOL", cantidad: 1 }] },
  { slug: "arranque-gym", nombre: "Pack gym del mes", descuentoPct: 5, items: [{ codigo: "TG-BARRA", cantidad: 6 }, { codigo: "TG-GPROTE", cantidad: 1 }, { codigo: "7798446310083", cantidad: 1 }] },
];

/** Combos que quedaban rellenados con bolsones: se desactivan hasta rearmarlos con stock propio. */
export const COMBOS_A_DESACTIVAR = ["merienda-sin-tacc", "guisos-y-legumbres", "especiero-completo", "reposteria-casera", "duo-magnesio", "despensa-del-gym", "alacena-sin-tacc"];

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
  "5000": "TG-MANIPIZZA", "000098": "TG-MANIPIZZA", "5002": "TG-MANIJAMON", "0000099": "TG-MANIJAMON", "314151": "TG-MANIQUESO", "32425262": "TG-MANIQUESO", "95668": "TG-GPMANI",
};

/** Productos cargados que todavía no se venden (sin stock o sin foto real). */
export const OCULTOS_PROPIOS = ["TG-ALFAJORFS"];

/** Fotos propias, generadas con el estilo de los anuncios (public/img/productos/prov y combos/v2). */
const CON_FOTO = new Set(PRODUCTOS_PROVEEDORES.map((p) => p.codigo).filter((c) => !["TG-ALFAJORFS", "LG-SAL"].includes(c)));
export const fotoProducto = (codigo: string) => (CON_FOTO.has(codigo) ? `/img/productos/prov/${codigo.toLowerCase()}.webp` : null);
export const fotoCombo = (slug: string) => `/img/combos/v3/${slug}.webp`;

OCULTAR.codigos.push(...Object.keys(REEMPLAZOS));
