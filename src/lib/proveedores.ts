// A quién se le compra cada producto.
//
// Distrimay es caro en lo que más se vende (mixes y frutos secos, 20–37% arriba) y falla con
// el stock. Entonces: frutos secos, mixes, granolas y frutas deshidratadas a Todo Granolas;
// avena, mascabo, pasas, semillas, dátiles, sal y miel a La Granja del Centro; y a Distrimay
// solo las marcas que no tienen los otros (Yuka, Entrenuts, Zanna's…) y las urgencias.
//
// Lo de marca se compra donde está la marca: un mix suelto se puede comprar en cualquier lado,
// un alfajor Yuka no. Por eso la regla mira primero si el producto es de marca.
//
// Puro (sin base): se prueba sin gastar nada.

export type IdProveedor = "todogranolas" | "lagranja" | "distrimay";

export type Proveedor = { id: IdProveedor; nombre: string; que: string; como: string; contacto: string };

export const PROVEEDORES: Record<IdProveedor, Proveedor> = {
  todogranolas: {
    id: "todogranolas",
    nombre: "Todo Granolas",
    que: "Frutos secos, mixes, granolas y frutas deshidratadas",
    como: "Pedido por WhatsApp o pedix.app/todogranolas · mínimo $80.000 · reparten en Carlos Paz los jueves, cada 15 días",
    contacto: "5493515160512",
  },
  lagranja: {
    id: "lagranja",
    nombre: "La Granja del Centro",
    que: "Avena, mascabo, pasas, semillas, dátiles, sal y miel",
    como: "Retiro en Av. Juan B. Justo 8620, Córdoba (lun a vie 7 a 17) · envío solo en Capital",
    contacto: "5493518634363",
  },
  distrimay: {
    id: "distrimay",
    nombre: "Distrimay",
    que: "Marcas que no tienen los otros y urgencias",
    como: "compras.distrimay.com con el botón «Cargar en Distrimay» · Av. Cárcano, Carlos Paz",
    contacto: "5493541566286",
  },
};

export const ORDEN_PROVEEDORES: IdProveedor[] = ["todogranolas", "lagranja", "distrimay"];

const normal = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const TODO_GRANOLAS = /\b(mix|nuez|nueces|almendra|castana|caju|avellana|pistacho|mani(?! japones)|banana|arandano|papaya|anana|granola|fruta deshidratada|ciruela)/;
const LA_GRANJA = /\b(avena|mascabo|pasas?|chia|girasol|lino|zapallo|sesamo|semilla|datil|sal rosada|sal marina|sal\b|miel|lenteja|garbanzo|poroto|arroz yamani|quinoa|coco rallado)/;

/** ¿Es de marca? «Sin marca / fraccionado» (o vacío) es lo suelto que se consigue en cualquier lado. */
export function esDeMarca(marca: string | null | undefined): boolean {
  const m = normal(marca ?? "").trim();
  return Boolean(m) && !/sin marca|fraccionad|granel|suelto/.test(m);
}

export function proveedorDe(p: { producto: string; marca?: string | null }): IdProveedor {
  if (esDeMarca(p.marca)) return "distrimay";
  const t = normal(p.producto);
  if (/bolson|caja x/.test(t)) return "distrimay"; // presentaciones de Distrimay que no se arman igual en otro lado
  if (TODO_GRANOLAS.test(t)) return "todogranolas";
  if (LA_GRANJA.test(t)) return "lagranja";
  return "distrimay";
}
