// Asistente de la tienda: responde con reglas y con datos reales de la configuración y del catálogo.
// No usa un modelo de lenguaje: así nunca inventa precios, plazos ni propiedades de un producto.

export type Intencion = "saludo" | "envio" | "pago" | "minimo" | "domingo" | "cambios" | "congelados" | "sintacc" | "negocio" | "combos" | "humano" | "pedido" | "salud" | "gracias" | "buscar";

export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
}

// El orden importa: salud va primero para no contestar nunca una consulta médica con un producto.
const REGLAS: [Intencion, RegExp][] = [
  // "sirve para" solo cuenta si lo que sigue es del cuerpo: "me sirve para casa" es una compra,
  // no una consulta de salud, y contestarle "consultá a tu médico" es perder la venta.
  ["salud", /\b(cura|curar|dolor|dolores|enfermedad|diabet|presion|colesterol|ansiedad|insomnio|dormir|adelgaz|bajar de peso|engorda|embaraz|dosis|cuanto tomo|como se toma|como tomar|contraindic|efectos secundarios|efecto secundario|medic|artritis|calambre|estrenimiento|depres|tiroides|cancer|inflama|corazon|higado|rinon|intestin|digest|defensas|inmun|hormon|glucemia|azucar en sangre|(sirve|sirven|es bueno|son buenos|es buena|son buenas) para (el|la|los|las|mi|tu|su)? ?(salud|cuerpo|piel|pelo|cabello|huesos|articulac|muscul|cerebro|memoria|vista|sangre|estomago|panza|energia|rendimiento|recuperar))/],
  ["humano", /\b(humano|persona|asesor|vendedor|alguien|hablar con|whatsapp|wasap|telefono|llamar|contacto|contactar|mail|correo)/],
  ["pedido", /\b(mi pedido|mi compra|seguimiento|donde esta|estado del pedido|numero de pedido|ya pague|no me llego|no llego)/],
  ["domingo", /\b(domingo|domingos|feriado|feriados|fin de semana|sabado|sabados|horario|horarios|atienden|abren)/],
  ["congelados", /\b(congelad|frio|freezer|cadena de frio)/],
  ["cambios", /\b(devol|devuelv|cambio|cambiar|arrepent|reembolso|reclamo|vino roto|vino mal|vencid|garantia)/],
  ["minimo", /\b(minimo|minima|monto minimo|compra minima|cuanto tengo que comprar|puedo comprar poco|una unidad|por unidad|por menor)/],
  ["pago", /\b(pago|pagar|pagos|tarjeta|credito|debito|cuotas|transferencia|transferir|efectivo|mercado pago|mercadopago|alias|cbu|descuento|factura)/],
  ["envio", /\b(envio|envios|enviar|envian|entrega|entregan|entregas|llega|llegan|llevan|demora|demoran|tarda|tardan|cuanto sale el envio|costo de envio|correo|retiro|retirar|reparto|zona|zonas|codigo postal|interior|todo el pais|carlos paz|cordoba|punilla)/],
  ["sintacc", /\b(sin tacc|celiac|celiaco|celiaca|gluten|sin gluten)/],
  ["negocio", /\b(negocio|hotel|hoteles|cabana|cabanas|gimnasio|kiosco|almacen|cafeteria|panaderia|rotiseria|reventa|revender|mayorista|por mayor|emprendimiento)/],
  ["combos", /\b(combo|combos|pack|packs|promo|promos|promocion|oferta|ofertas)/],
  ["gracias", /^(gracias|muchas gracias|genial|perfecto|listo|ok|oka|dale|buenisimo)\b/],
  ["saludo", /^(hola|holis|buenas|buen dia|buenos dias|buenas tardes|buenas noches|que tal|hey)\b/],
];

/**
 * Pide hablar con una persona, dicho de verdad. Más estricto que la intención «humano» de la web:
 * en WhatsApp «te escribo por whatsapp», «sos vendedor?» o «mandame el contacto» no son pedir una persona,
 * y derivar ahí deja la venta tirada.
 */
export function pidePersona(texto: string): boolean {
  return /\b(humano|una persona|persona real|un asesor|una asesora|hablar con|atencion personalizada|llamame|me llaman|me podes llamar|quiero que me llamen)\b/.test(normalizar(texto));
}

/**
 * Una respuesta automática de otro negocio («soy el asistente virtual de…», «en breve te respondemos»).
 * Si el vendedor le contesta, los dos bots se hablan en bucle: para WhatsApp eso es spam.
 */
export function esRespuestaAutomatica(texto: string): boolean {
  return /\b(asistente virtual|respuesta automatica|mensaje automatico|soy (el|la|un|una) (asistente|bot)|gracias por comunicarte|gracias por (tu|su) mensaje|en breve (te|le|nos) (responde|contesta|comunica)|a la brevedad (te|le) (responde|contesta)|fuera (del|de) horario|nuestro horario de atencion es|este es un mensaje automatico|no respondas? a este|canal de notificaciones|este (numero|canal) no (recibe|acepta|responde)|no (recibimos|leemos) (mensajes|respuestas) (en|por) este)/.test(normalizar(texto));
}

export function detectar(texto: string): Intencion {
  const t = normalizar(texto);
  for (const [intencion, re] of REGLAS) if (re.test(t)) return intencion;
  return "buscar";
}

const VACIAS = new Set("a al algo algun alguna busco buscando con cual cuales cuanto cuesta cuestan dame de del el ella en es esta este hay la las le lo los me mi necesito para por precio precios que quiero quisiera se si son su tenes tienen tiene un una unas unos vende venden vendes y o sale salen comprar compro kilo kilos kg gramos gr medio".split(" "));

/** Palabras con las que buscar en el catálogo, con su forma en singular. */
export function palabrasClave(texto: string): string[][] {
  return normalizar(texto)
    .split(" ")
    .filter((p) => p.length > 2 && !VACIAS.has(p))
    .slice(0, 4)
    .map((p) => [...new Set([p, p.replace(/ces$/, "z"), p.replace(/(es|s)$/, ""), p.replace(/s$/, "")])].filter((v) => v.length > 2));
}
