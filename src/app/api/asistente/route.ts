import { NextResponse } from "next/server";
import { SALUDO_GENERAL } from "@/lib/whatsapp-saludo";
import { leerConfig } from "@/lib/config";
import { detectar, palabrasClave } from "@/lib/asistente";
import { buscarEnCatalogo, type Enlace, type Respuesta } from "@/lib/asistente-catalogo";
import { linkWhatsapp } from "@/lib/pedidos";
import { pesos } from "@/lib/precios";
import { zonaPagaDe } from "@/lib/envios/tabla";
import { AVISO_SUPLEMENTOS } from "@/lib/sitio";
import { cotizarCarrito } from "@/lib/tienda";
import { responderComoVendedor, vendedorActivo, type CarritoVisto, type Turno } from "@/lib/vendedor";

export const dynamic = "force-dynamic";

/**
 * El carrito que ve el vendedor lo cotiza el servidor, no el navegador.
 * Si el precio que mira el vendedor saliera del cliente, alcanzaría con editar
 * el localStorage para que te ofrezca pagar un pedido que no llega al mínimo.
 */
async function carritoDe(valor: unknown): Promise<CarritoVisto | null> {
  if (!Array.isArray(valor) || !valor.length) return null;
  try {
    const c = await cotizarCarrito(valor);
    if (!c.lineas.length) return null;
    return {
      renglones: c.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad, subtotal: l.subtotal })),
      subtotal: c.subtotal,
      falta: c.falta,
      compraMinima: c.compraMinima,
    };
  } catch {
    return null; // sin carrito el vendedor sigue atendiendo igual
  }
}

function historialDe(valor: unknown): Turno[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((t): t is { de: unknown; texto: unknown } => typeof t === "object" && t !== null)
    .map((t) => ({ de: t.de === "yo" ? ("yo" as const) : ("acopio" as const), texto: String(t.texto ?? "").slice(0, 400) }))
    .filter((t) => t.texto)
    .slice(-8);
}

export async function POST(req: Request) {
  let cuerpo: { mensaje?: unknown; historial?: unknown; carrito?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const mensaje = typeof cuerpo?.mensaje === "string" ? cuerpo.mensaje.trim().slice(0, 400) : "";
  if (!mensaje) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  const cfg = await leerConfig();
  const persona: Enlace = cfg.whatsapp
    ? { href: linkWhatsapp(cfg.whatsapp, SALUDO_GENERAL) ?? "/contacto", texto: "Escribir por WhatsApp", externo: true }
    : { href: "/contacto", texto: "Ver datos de contacto" };
  const propia = cfg.entregaPropiaActiva;
  const zonaPaga = propia ? zonaPagaDe(cfg.tabla) : null;
  const dto = cfg.descuentoTransferenciaPct;
  const intencion = detectar(mensaje);

  // Las consultas de salud no pasan por la IA: esta respuesta tiene que ser siempre la misma.
  if (intencion === "salud") {
    return NextResponse.json({
      texto: "Eso no te lo puedo responder: no damos indicaciones de salud ni de consumo. Para eso consultá a tu médico o nutricionista. Si querés, te muestro el producto con su presentación y precio.",
      aviso: AVISO_SUPLEMENTOS,
    } satisfies Respuesta);
  }

  // El vendedor con IA atiende todo lo demás. Si no hay clave cargada, falla o tarda,
  // sigue contestando el asistente de reglas de abajo: la tienda nunca queda muda.
  if (vendedorActivo()) {
    const r = await responderComoVendedor(mensaje, historialDe(cuerpo.historial), await carritoDe(cuerpo.carrito));
    if (r) {
      // Los atajos de abajo solo si la respuesta quedó sin nada para tocar: con tarjetas
      // o con botones de agregar, sumar «Ver el catálogo» le saca el foco a la acción que importa.
      const vacia = !r.fichas?.length && !r.acciones?.length;
      return NextResponse.json({ ...r, enlaces: r.enlaces ?? (vacia ? [{ href: "/catalogo", texto: "Ver el catálogo" }, persona] : undefined) });
    }
  }

  let r: Respuesta;
  switch (intencion) {
    case "saludo":
      r = { texto: "Hola. Puedo buscarte un producto o contarte sobre envíos, pagos y la compra mínima. ¿Qué necesitás?" };
      break;
    case "gracias":
      r = { texto: "De nada. Si necesitás algo más, acá estoy." };
      break;
    case "envio":
      r = {
        texto: [
          propia ? `En Villa Carlos Paz y sur de Punilla (San Antonio de Arredondo, Mayu Sumaj, Icho Cruz y Cuesta Blanca) te lo llevamos nosotros en ${cfg.plazoEntregaPropia}, sin cargo. Los domingos no entregamos: lo que pidas el domingo se entrega a partir del lunes.${zonaPaga ? ` A ${zonaPaga.nombre} también te lo llevamos nosotros, por ${pesos(zonaPaga.precio)}.` : ""}` : "",
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
        r = await buscarEnCatalogo(resto, true);
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
    default:
      r = await buscarEnCatalogo(mensaje);
  }
  return NextResponse.json(r);
}
