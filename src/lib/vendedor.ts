// Vendedor con IA del chat de la tienda.
//
// Dos reglas de diseño, y las dos son por lo mismo: que no invente.
// 1) Ningún precio, plazo ni condición sale del modelo: todo viene de las herramientas,
//    que leen el catálogo y la configuración reales.
// 2) Si la clave de API no está cargada, esto devuelve null y contesta el asistente de reglas.
//    La tienda nunca se queda sin respuesta por un problema con el proveedor de IA.

import { leerConfig } from "./config";
import { hallarProductos } from "./asistente-catalogo";
import { combosTienda } from "./tienda";
import { pesos, renglonCombo } from "./precios";
import { zonaPagaDe } from "./envios/tabla";
import type { Ficha, Respuesta } from "./asistente-catalogo";

export type Turno = { de: "yo" | "acopio"; texto: string };

const MODELO = process.env.VENDEDOR_MODELO || "claude-haiku-5-5";
const MAX_VUELTAS = 3;

export function vendedorActivo(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const HERRAMIENTAS = [
  {
    name: "buscar_productos",
    description:
      "Busca productos en el catálogo real de la tienda y devuelve nombre, presentación, precio y link. " +
      "Usala SIEMPRE antes de nombrar un producto o decir un precio.",
    input_schema: {
      type: "object" as const,
      properties: {
        consulta: { type: "string", description: "Qué buscar, por ejemplo «almendras» o «barritas sin tacc»." },
        solo_sin_tacc: { type: "boolean", description: "true para traer únicamente productos marcados sin TACC." },
      },
      required: ["consulta"],
    },
  },
  {
    name: "ver_combos",
    description:
      "Devuelve los combos armados, con precio, qué traen y si por sí solos llegan a la compra mínima. " +
      "Usala cuando a la persona le falta plata para el mínimo o no sabe qué llevar.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "datos_de_la_tienda",
    description:
      "Compra mínima, envíos, plazos, medios de pago, descuento por transferencia y horarios de atención. " +
      "Usala antes de responder cualquier cosa sobre envíos, pagos, plazos o mínimos.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

async function correrHerramienta(nombre: string, entrada: Record<string, unknown>): Promise<{ texto: string; fichas: Ficha[] }> {
  if (nombre === "buscar_productos") {
    const consulta = String(entrada.consulta ?? "");
    const productos = (await hallarProductos(consulta, entrada.solo_sin_tacc === true)).slice(0, 6);
    if (!productos.length) return { texto: `Sin resultados para «${consulta}».`, fichas: [] };
    const fichas: Ficha[] = productos.slice(0, 4).map((p) => ({
      href: `/producto/${encodeURIComponent(p.codigo)}`,
      nombre: p.producto,
      detalle: [p.marca.startsWith("Sin marca") ? "" : p.marca, p.presentacion].filter(Boolean).join(" · "),
      precio: pesos(p.precio),
      foto: p.fotoUrl,
    }));
    const texto = productos
      .map((p) => `- ${p.producto} · ${p.presentacion} · ${pesos(p.precio)}${p.sinTacc ? " · sin TACC" : ""}${p.esSuplemento ? " · suplemento" : ""}`)
      .join("\n");
    return { texto, fichas };
  }

  if (nombre === "ver_combos") {
    const cfg = await leerConfig();
    const combos = (await combosTienda({ activo: true, tipo: "COMBO" })).filter((c) => c.disponible).slice(0, 8);
    if (!combos.length) return { texto: "No hay combos disponibles ahora.", fichas: [] };
    const fichas: Ficha[] = combos.slice(0, 3).map((c) => ({
      href: `/combos/${c.slug}`,
      nombre: `Combo ${c.nombre}`,
      detalle: `Trae: ${c.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)).join(" · ")}`,
      precio: pesos(Math.round(c.precio)),
      foto: c.fotoUrl,
    }));
    const texto = combos
      .map((c) => `- ${c.nombre} · ${pesos(Math.round(c.precio))}${c.precio >= cfg.compraMinima ? " · llega solo a la compra mínima" : ""}`)
      .join("\n");
    return { texto, fichas };
  }

  if (nombre === "datos_de_la_tienda") {
    const cfg = await leerConfig();
    const zp = cfg.entregaPropiaActiva ? zonaPagaDe(cfg.tabla) : null;
    const partes = [
      `Compra mínima: ${pesos(cfg.compraMinima)} por pedido, combinando lo que quiera.`,
      cfg.entregaPropiaActiva
        ? `Entrega propia sin cargo en Villa Carlos Paz y el sur de Punilla (San Antonio de Arredondo, Mayu Sumaj, Icho Cruz, Cuesta Blanca) en ${cfg.plazoEntregaPropia}. Los domingos no se entrega.${zp ? ` A ${zp.nombre} también, por ${pesos(zp.precio)}.` : ""}`
        : "",
      "Al resto del país, por correo: despacho en 24 a 48 hs hábiles y de 2 a 7 días hábiles según zona. El costo se ve en el carrito con el código postal, antes de pagar.",
      cfg.envioGratisDesde ? `Envío gratis desde ${pesos(cfg.envioGratisDesde)}.` : "",
      `Pago: Mercado Pago (crédito, débito o dinero en cuenta) o transferencia.${cfg.descuentoTransferenciaPct > 0 ? ` Por transferencia hay ${cfg.descuentoTransferenciaPct}% de descuento.` : ""}`,
      "Los combos tienen 5% de descuento sobre el precio de lista.",
      "Atención por WhatsApp de lunes a sábado, de 8 a 20 h.",
      "Se compra por encargo al mayorista, así que se arma a medida y no hay stock parado.",
    ].filter(Boolean);
    return { texto: partes.join("\n"), fichas: [] };
  }

  return { texto: "Herramienta desconocida.", fichas: [] };
}

function instrucciones(compraMinima: string): string {
  return [
    "Sos el vendedor de Acopio Saludable, una tienda online de productos saludables a granel y sin TACC con base en Villa Carlos Paz, Córdoba. Atendés el chat de la web.",
    "",
    "CÓMO HABLÁS",
    "- Español rioplatense, de vos. Natural, como un vendedor de mostrador que sabe lo que vende.",
    "- Corto: dos o tres frases y una sola pregunta. Nunca listas largas ni párrafos.",
    "- No saludes de nuevo si ya venías hablando.",
    "",
    "CÓMO VENDÉS",
    "- Primero entendé para qué es: para la casa o para un negocio (kiosco, hotel, cabañas, dietética, gimnasio, cafetería). Preguntalo si no está claro, una sola vez.",
    `- La compra mínima es ${compraMinima}. Si lo que quiere no llega, no lo dejes ahí: ofrecé un combo o dos o tres productos que completen, con el precio de cada uno.`,
    "- Cerrá siempre con un paso concreto: agregar al carrito, ver un combo, dejar el pedido armado. Una sola acción por mensaje.",
    "- Si es un negocio que quiere comprar para revender, ofrecé pasarlo a WhatsApp para armar el pedido a medida.",
    "- No regatees ni inventes descuentos: los únicos que existen son los que te da la herramienta.",
    "",
    "LO QUE NO HACÉS NUNCA",
    "- No inventes productos, precios, plazos ni condiciones. Todo número sale de las herramientas. Si no lo tenés, buscalo; si no aparece, decí que no lo tenés y ofrecé buscar otra cosa.",
    "- No digas que un producto cura, trata, previene ni mejora ninguna condición de salud. No nombres enfermedades. Si preguntan eso, decí que no das indicaciones de salud y que consulten a su médico o nutricionista.",
    "- No prometas resultados físicos, de rendimiento ni de peso.",
    "- No inventes testimonios, certificaciones ni cantidades de clientes.",
    "- Si preguntan por un pedido ya hecho, por un reclamo o por algo que no sabés, pasalos a WhatsApp.",
    "",
    "FORMATO DE LA RESPUESTA",
    "- Texto plano, sin markdown, sin asteriscos, sin encabezados.",
    "- Los productos que buscaste se le muestran aparte en tarjetas con foto y precio: no repitas la lista entera, nombrá uno o dos y seguí.",
  ].join("\n");
}

type Bloque = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };

export async function responderComoVendedor(mensaje: string, historial: Turno[] = []): Promise<Respuesta | null> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return null;

  const cfg = await leerConfig();
  const mensajes: { role: "user" | "assistant"; content: unknown }[] = [
    ...historial.slice(-8).map((t) => ({ role: (t.de === "yo" ? "user" : "assistant") as "user" | "assistant", content: t.texto })),
    { role: "user" as const, content: mensaje },
  ];

  let fichas: Ficha[] = [];
  try {
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODELO,
          max_tokens: 500,
          system: instrucciones(pesos(cfg.compraMinima)),
          tools: HERRAMIENTAS,
          messages: mensajes,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { content?: Bloque[]; stop_reason?: string };
      const bloques = data.content ?? [];
      mensajes.push({ role: "assistant", content: bloques });

      const usos = bloques.filter((b) => b.type === "tool_use");
      if (!usos.length) {
        const texto = bloques.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
        if (!texto) return null;
        return { texto, fichas: fichas.length ? fichas : undefined };
      }

      const resultados = [];
      for (const u of usos) {
        const r = await correrHerramienta(u.name ?? "", u.input ?? {});
        if (r.fichas.length) fichas = r.fichas;
        resultados.push({ type: "tool_result", tool_use_id: u.id, content: r.texto });
      }
      mensajes.push({ role: "user", content: resultados });
    }
  } catch {
    return null;
  }
  return null;
}
