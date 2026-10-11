import { NextResponse } from "next/server";
import { leerConfig } from "@/lib/config";
import { detectar, normalizar, palabrasClave } from "@/lib/asistente";
import { combosTienda, productosTienda, type ProductoTienda } from "@/lib/tienda";
import { linkWhatsapp } from "@/lib/pedidos";
import { pesos } from "@/lib/precios";
import { AVISO_SUPLEMENTOS } from "@/lib/sitio";

export const dynamic = "force-dynamic";

type Enlace = { href: string; texto: string; externo?: boolean };
type Ficha = { href: string; nombre: string; detalle: string; precio: string; foto: string | null };
type Respuesta = { texto: string; enlaces?: Enlace[]; fichas?: Ficha[]; aviso?: string };

// El catálogo publicado cambia pocas veces al día: se guarda unos minutos para no leerlo en cada mensaje.
let cache: { hasta: number; productos: (ProductoTienda & { nombre: string; indice: string })[] } | null = null;
async function catalogo() {
  if (cache && cache.hasta > Date.now()) return cache.productos;
  const productos = (await productosTienda({})).map((p) => ({ ...p, nombre: ` ${normalizar(p.producto)} `, indice: ` ${normalizar(`${p.producto} ${p.marca} ${p.presentacion} ${p.categoria}`)} ` }));
  cache = { hasta: Date.now() + 5 * 60 * 1000, productos };
  return productos;
}

async function buscar(texto: string, soloSinTacc = false): Promise<Respuesta> {
  const grupos = palabrasClave(texto);
  if (!grupos.length) return { texto: "Contame qué estás buscando, por ejemplo «almendras» o «harina sin TACC», o elegí una de las opciones." };
  const productos = (await catalogo()).filter((p) => !soloSinTacc || p.sinTacc);
  // Vale más que la palabra sea el comienzo del nombre que una mención en la marca o la categoría.
  const puntosDe = (p: { nombre: string; indice: string }) => grupos.reduce((s, g) => s + (g.some((v) => p.nombre.startsWith(` ${v}`)) ? 4 : g.some((v) => p.nombre.includes(` ${v}`)) ? 3 : g.some((v) => p.indice.includes(` ${v}`)) ? 2 : g.some((v) => p.indice.includes(v)) ? 1 : 0), 0);
  const coincide = (indice: string) => grupos.every((g) => g.some((v) => indice.includes(v)));
  let hallados = productos.filter((p) => coincide(p.indice));
  if (!hallados.length && grupos.length > 1) hallados = productos.filter((p) => puntosDe(p) > 0);
  hallados = hallados.map((p, i) => ({ p, i, s: puntosDe(p) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.p);

  const consulta = grupos.map((g) => g[0]).join(" ");
  const combos = soloSinTacc ? [] : (await combosTienda({ activo: true, tipo: "COMBO" })).filter((c) => c.disponible && grupos.some((g) => g.some((v) => normalizar(c.nombre).includes(v)))).slice(0, 1);
  if (!hallados.length && !combos.length) {
    return { texto: `No encontré «${consulta}»${soloSinTacc ? " sin TACC" : ""} en el catálogo. Probá con otra palabra o mirá las góndolas.`, enlaces: [{ href: "/catalogo", texto: "Ver el catálogo" }, { href: "/combos", texto: "Ver combos" }] };
  }
  const fichas: Ficha[] = [
    ...combos.map((c) => ({ href: `/combos/${c.slug}`, nombre: `Combo ${c.nombre}`, detalle: `${c.items.length} productos, ${c.descuentoPct}% de descuento`, precio: pesos(Math.round(c.precio)), foto: c.fotoUrl })),
    ...hallados.slice(0, 4 - combos.length).map((p) => ({ href: `/producto/${p.codigo}`, nombre: p.producto, detalle: [p.marca.startsWith("Sin marca") ? "" : p.marca, p.presentacion].filter(Boolean).join(" · "), precio: pesos(p.precio), foto: p.fotoUrl })),
  ];
  const total = hallados.length + combos.length;
  return {
    texto: total > fichas.length ? `Encontré ${total} opciones. Estas son las primeras:` : total === 1 ? "Encontré esto:" : "Encontré estas opciones:",
    fichas,
    enlaces: total > fichas.length ? [{ href: `/catalogo?q=${encodeURIComponent(consulta)}`, texto: "Ver todos los resultados" }] : undefined,
    aviso: hallados.slice(0, 4).some((p) => p.esSuplemento) ? AVISO_SUPLEMENTOS : undefined,
  };
}

export async function POST(req: Request) {
  let cuerpo: { mensaje?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const mensaje = typeof cuerpo?.mensaje === "string" ? cuerpo.mensaje.trim().slice(0, 200) : "";
  if (!mensaje) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  const cfg = await leerConfig();
  const persona: Enlace = cfg.whatsapp
    ? { href: linkWhatsapp(cfg.whatsapp, "Hola, tengo una consulta sobre Acopio Saludable.") ?? "/contacto", texto: "Escribir por WhatsApp", externo: true }
    : { href: "/contacto", texto: "Ver datos de contacto" };
  const propia = cfg.entregaPropiaActiva;
  const dto = cfg.descuentoTransferenciaPct;

  let r: Respuesta;
  switch (detectar(mensaje)) {
    case "saludo":
      r = { texto: "Hola. Puedo buscarte un producto o contarte sobre envíos, pagos y la compra mínima. ¿Qué necesitás?" };
      break;
    case "gracias":
      r = { texto: "De nada. Si necesitás algo más, acá estoy." };
      break;
    case "envio":
      r = {
        texto: [
          propia ? `En Villa Carlos Paz y sur de Punilla (San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca) te lo llevamos nosotros en ${cfg.plazoEntregaPropia}, sin cargo. Los domingos no entregamos: lo que pidas el domingo se entrega a partir del lunes.` : "",
          `${propia ? "Al resto del país" : "A todo el país"} enviamos por correo: despacho en 24 a 48 hs hábiles y de 2 a 7 días hábiles de correo según la zona. El costo lo ves en el carrito con tu código postal, antes de pagar.`,
          cfg.envioGratisDesde ? `Desde ${pesos(cfg.envioGratisDesde)} el envío es gratis.` : "",
        ].filter(Boolean).join("\n\n"),
        enlaces: [{ href: "/envios", texto: "Ver envíos y plazos" }],
      };
      break;
    case "domingo":
      r = { texto: `Atendemos de lunes a sábado, de 8 a 20 h. La tienda toma pedidos todos los días, pero los domingos no entregamos: lo que pidas el domingo se entrega a partir del lunes.`, enlaces: [{ href: "/envios", texto: "Ver envíos y plazos" }] };
      break;
    case "pago":
      r = {
        texto: `Podés pagar con Mercado Pago (tarjeta de crédito, débito o dinero en cuenta) o por transferencia bancaria.${dto > 0 ? ` Pagando por transferencia tenés ${dto}% de descuento sobre el total.` : ""} Elegís el medio de pago al finalizar la compra.`,
        enlaces: [{ href: "/carrito", texto: "Ir a mi pedido" }],
      };
      break;
    case "minimo":
      r = { texto: `La compra mínima es de ${pesos(cfg.compraMinima)} por pedido. La armás combinando los productos y combos que quieras: no hace falta llevar varias unidades de lo mismo.`, enlaces: [{ href: "/combos", texto: "Ver combos" }, { href: "/armador", texto: "Armar mi pedido" }] };
      break;
    case "cambios":
      r = { texto: "Si algo llegó mal, roto o no es lo que pediste, lo resolvemos: escribinos con el número de pedido y una foto. También podés arrepentirte de la compra dentro de los 10 días corridos desde que lo recibiste.", enlaces: [{ href: "/cambios-y-devoluciones", texto: "Cambios y devoluciones" }, persona] };
      break;
    case "congelados":
      r = { texto: "Los congelados solo se entregan en la zona de reparto propio (Villa Carlos Paz y sur de Punilla). No van por correo porque necesitan cadena de frío.", enlaces: [{ href: "/catalogo?categoria=Congelados", texto: "Ver congelados" }] };
      break;
    case "sintacc": {
      const resto = mensaje.replace(/sin\s+tacc|sin\s+gluten|gluten|cel[ií]ac\w*|apto\w*|para/gi, " ");
      if (palabrasClave(resto).length) {
        r = await buscar(resto, true);
        r.aviso = "Productos marcados sin TACC en el catálogo. Revisá siempre el rotulado del envase.";
        break;
      }
      r = { texto: "Tenemos una sección con todos los productos sin TACC del catálogo. Revisá siempre el rotulado del envase antes de consumir.", enlaces: [{ href: "/sin-tacc", texto: "Ver productos sin TACC" }, { href: "/combos/alacena-sin-tacc", texto: "Combo Alacena sin TACC" }] };
      break;
    }
    case "negocio":
      r = { texto: "Vendemos por volumen para hoteles, cabañas, gimnasios, cafeterías, rotiserías y almacenes. Cada rubro tiene un pedido sugerido que podés ajustar a tu medida.", enlaces: [{ href: "/nichos", texto: "Ver pedidos por negocio" }, persona] };
      break;
    case "combos":
      r = { texto: "Los combos ya vienen armados y tienen 5% de descuento sobre el precio de lista.", enlaces: [{ href: "/combos", texto: "Ver todos los combos" }] };
      break;
    case "pedido":
      r = { texto: "Para saber en qué está tu pedido, escribinos con tu nombre o número de pedido y te lo decimos.", enlaces: [persona] };
      break;
    case "humano":
      r = { texto: "Te atiende una persona de lunes a sábado, de 8 a 20 h.", enlaces: [persona] };
      break;
    case "salud":
      r = { texto: "Eso no te lo puedo responder: no damos indicaciones de salud ni de consumo. Para eso consultá a tu médico o nutricionista. Si querés, te muestro el producto con su presentación y precio.", aviso: AVISO_SUPLEMENTOS };
      break;
    default:
      r = await buscar(mensaje);
  }
  return NextResponse.json(r);
}
