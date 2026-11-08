// A quién se le compra cada producto.
//
// Desde el 20/10/2026: La Granja del Centro es el proveedor principal (frutos secos, granolas,
// semillas, dátiles, miel, avena); los mixes los armamos nosotros con esa mercadería; y a
// Distrimay solo las marcas que no tiene La Granja (Yuka, Entrenuts, Zanna's…) y las urgencias.
// Todo Granolas ya no es proveedor: los códigos TG-… quedaron por historia.
//
// Lo de marca se compra donde está la marca: un mix suelto se puede comprar en cualquier lado,
// un alfajor Yuka no. Por eso la regla mira primero si el producto es de marca.
//
// Puro (sin base): se prueba sin gastar nada.

export type IdProveedor = "propio" | "lagranja" | "harinar" | "distrimay";

export type Proveedor = { id: IdProveedor; nombre: string; que: string; como: string; contacto: string };

export const PROVEEDORES: Record<IdProveedor, Proveedor> = {
  propio: {
    id: "propio",
    nombre: "Mixes propios",
    que: "Mixes que armamos nosotros con la mercadería de La Granja",
    como: "Receta por kilo: ver la compra de la semana · se fraccionan y sellan en casa",
    contacto: "",
  },
  lagranja: {
    id: "lagranja",
    nombre: "La Granja del Centro",
    que: "Frutos secos, granolas, semillas, dátiles, miel, avena y sin TACC",
    como: "Retiro en Av. Juan B. Justo 8620, Córdoba (lun a vie 7 a 17) · envío solo en Capital",
    contacto: "5493518634363",
  },
  harinar: {
    id: "harinar",
    nombre: "Distribuidora HARINAR",
    que: "Girasol pelado, lino, avena, harina integral, salvado, gluten y gotas de chocolate (códigos HR-…)",
    como: "Dinamarca 282, Carlos Paz · catálogo app.pediwa.com/harinarsas",
    contacto: "",
  },
  distrimay: {
    id: "distrimay",
    nombre: "Distrimay",
    que: "Marcas que no tienen los otros y urgencias",
    como: "compras.distrimay.com con el botón «Cargar en Distrimay» · Av. Cárcano, Carlos Paz",
    contacto: "5493541566286",
  },
};

export const ORDEN_PROVEEDORES: IdProveedor[] = ["lagranja", "harinar", "propio", "distrimay"];

const normal = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const MIX = /\bmix\b/;
const LA_GRANJA_SECOS = /\b(nuez|nueces|almendra|castana|caju|avellana|mani(?! japones)|banana|arandano|papaya|anana|granola|fruta deshidratada|ciruela|higo)/;
const LA_GRANJA = /\b(avena|mascabo|pasas?|chia|girasol|lino|zapallo|sesamo|semilla|datil|sal rosada|sal marina|sal\b|miel|lenteja|garbanzo|poroto|arroz yamani|quinoa|coco rallado|chips? (de )?chocolate|gotas de chocolate)/;

/** ¿Es de marca? «Sin marca / fraccionado» (o vacío) es lo suelto que se consigue en cualquier lado. */
export function esDeMarca(marca: string | null | undefined): boolean {
  const m = normal(marca ?? "").trim();
  return Boolean(m) && !/sin marca|fraccionad|granel|suelto/.test(m);
}

export function proveedorDe(p: { producto: string; marca?: string | null; codigo?: string }): IdProveedor {
  if (p.codigo?.startsWith("TG-")) return MIX.test(normal(p.producto)) ? "propio" : "lagranja";
  if (p.codigo?.startsWith("LG-")) return "lagranja";
  // Los HR-… son de Harinar (segundo proveedor desde el 28/10). Antes caían en el «return distrimay» del final:
  // el panel los contaba como Distrimay y /catalogo/solo-granja los habría ocultado.
  if (p.codigo?.startsWith("HR-")) return "harinar";
  if (esDeMarca(p.marca)) return "distrimay";
  const t = normal(p.producto);
  if (/bolson|caja x/.test(t)) return "distrimay"; // presentaciones de Distrimay que no se arman igual en otro lado
  if (MIX.test(t)) return "propio";
  if (LA_GRANJA_SECOS.test(t)) return "lagranja";
  if (LA_GRANJA.test(t)) return "lagranja";
  return "distrimay";
}
