// Plantillas de prospección y reglas puras (sin base ni red), separadas para poder probarlas.
//
// La plantilla no lleva precios: cambian todos los días y la plantilla es fija. Termina en
// dos botones; el que dice que sí abre la charla y ahí el vendedor contesta con precios reales.

export const IDIOMA = "es_AR";

export type Rubro = "hotel" | "cabañas / complejo" | "departamentos / alquiler temporario" | "hostel";

type Plantilla = { nombre: string; cuerpo: string; botones: [string, string]; contexto: string };

/** Qué plantilla le toca a cada rubro y qué tiene que saber el vendedor cuando contestan. */
export const PLANTILLAS: Record<"desayuno" | "kit" | "gastronomia" | "gimnasio" | "dietetica" | "regalos" | "nutricionista", Plantilla> = {
  desayuno: {
    // 17/11 (Santiago: «tenemos que ser campeones en mensajes en frío»): 0 respuestas con el pitch largo.
    // Ahora una sola pregunta corta que se contesta sin pensar; la oferta va recién cuando contesta. Sin el nombre del dueño.
    nombre: "acopio_alojamientos_desayuno_v4",
    cuerpo:
      "Hola, {{1}} 👋 ¿Quién se encarga de las compras del desayuno? Tenemos granola, frutos secos y dátiles por kilo a precio mayorista, con entrega sin cargo en Carlos Paz.",
    botones: ["Soy yo, pasame precios", "No, gracias"],
    contexto:
      "le escribimos nosotros ofreciendo abastecer el desayuno (granola, frutos secos, dátiles, semillas) y le preguntamos quién hace esas compras. " +
      "PRIMERO preguntá (o anotá, si ya lo dijo) qué producto compra hoy, a cuánto el kilo y cuántos kilos por semana: ese precio se registra siempre, escribilo textual en tu respuesta para que Leo lo vea. " +
      "Después compará con el precio real de buscar_productos: si el nuestro es menor, decilo con el número; si no, no bajes nada de tu cuenta y ofrecé lo que sí tenemos (fraccionado fresco, entrega sin costo en la zona) y que Leo, de ventas mayoristas, le confirma el precio por volumen por este chat. " +
      "No ofrezcas ni prometas nada «sin TACC». Se paga antes de entregar, por transferencia o Mercado Pago. Atendelo como cliente de negocio: usá pedido_para_negocio con «hotel».",
  },
  kit: {
    nombre: "acopio_alojamientos_kit_v2",
    cuerpo:
      "Hola, {{1}}. Soy Santiago, de Acopio Saludable, de Villa Carlos Paz.\n\n" +
      "Armamos kits de bienvenida para cabañas y departamentos: alfajores y budines sin TACC, frutos secos y snacks, para que el huésped encuentre algo rico al llegar. Por volumen y con entrega sin costo en Carlos Paz y alrededores.\n\n" +
      "¿Le paso precios para armar el kit?",
    botones: ["Sí, pasame precios", "No, gracias"],
    contexto:
      "le escribimos nosotros ofreciendo kits de bienvenida para el huésped (frutos secos, snacks y alfajores envasados de marca). Budines no tenemos: si los pide, decilo. Atendelo como cliente de negocio: " +
      "usá pedido_para_negocio con «cabañas», proponé un kit concreto con precios reales y preguntá cuántas unidades tiene para calcular el costo por kit.",
  },
  gastronomia: {
    // 17/11 (Santiago: «tenemos que ser campeones en mensajes en frío»): 0 respuestas con el pitch largo.
    // Ahora una sola pregunta corta que se contesta sin pensar; la oferta va recién cuando contesta. Sin el nombre del dueño.
    nombre: "acopio_negocios_gastronomia_v3",
    cuerpo:
      "Hola, {{1}} 👋 ¿Quién se encarga de comprar los frutos secos y la granola del local? Tenemos precio mayorista en Carlos Paz y se lo queremos pasar a la persona indicada.",
    botones: ["Soy yo, pasame precios", "No, gracias"],
    contexto:
      "le escribimos nosotros ofreciendo abastecer su cocina (frutos secos, granola, semillas, dátiles, cacao) y le preguntamos quién hace esas compras. " +
      "PRIMERO preguntá (o anotá, si ya lo dijo) qué producto compra hoy, a cuánto el kilo y cuántos kilos por semana: ese precio se registra siempre, escribilo textual en tu respuesta para que Leo lo vea. " +
      "Después compará con el precio real de buscar_productos: si el nuestro es menor, decilo con el número; si no, no bajes nada de tu cuenta y ofrecé lo que sí tenemos (fraccionado fresco, entrega sin costo en la zona) y que Leo, de ventas mayoristas, le confirma el precio por volumen por este chat. " +
      "Se paga antes de entregar, por transferencia o Mercado Pago. Atendelo como cliente de negocio: usá pedido_para_negocio con «cafeterías».",
  },
  gimnasio: {
    // 17/11 (Santiago: «tenemos que ser campeones en mensajes en frío»): 0 respuestas con el pitch largo.
    // Ahora una sola pregunta corta que se contesta sin pensar; la oferta va recién cuando contesta. Sin el nombre del dueño.
    nombre: "acopio_negocios_gimnasio_v2",
    cuerpo:
      "Hola, {{1}} 👋 ¿Venden algo en el mostrador para después de entrenar? Tenemos barras, granola proteica y mixes con precio de reventa para gimnasios de Carlos Paz.",
    botones: ["Sí, pasame precios", "No, gracias"],
    contexto:
      "le escribimos nosotros ofreciendo productos para que revenda en el mostrador (granola proteica, barras, frutos secos). Atendelo como cliente de negocio: " +
      "usá pedido_para_negocio con «gimnasio», hablale de reventa (precio sugerido y cuánto gana por unidad) y preguntá cuántos socios tiene para armarle el pedido.",
  },
  dietetica: {
    // 21/11 (Santiago: «vender por internet a todo el país… que los captadores busquen nuestro nicho en el país»).
    // Fuera de Punilla las dietéticas no son competencia: son clientes de reventa que reciben por correo.
    // Una sola pregunta corta (lo que funcionó desde el 17/11), sin links ni pedidos: en Argentina la gente desconfía.
    nombre: "acopio_dieteticas_pais_v4",
    cuerpo:
      "Hola, {{1}} 👋 ¿A cuánto le está llegando hoy el kilo de nuez o de cajú? Somos Acopio, de Villa Carlos Paz (Córdoba): frutos secos por bulto con envío a todo el país.",
    botones: ["Pasame precios", "No, gracias"],
    contexto:
      "le escribimos nosotros: es una dietética, almacén natural o kiosco saludable de OTRA provincia o ciudad lejos de Carlos Paz, posible cliente de reventa por correo. " +
      "PRIMERO preguntá (o anotá, si ya lo dijo) a cuánto le llega hoy el kilo de nuez o cajú y de quién: ese precio se registra siempre, escribilo textual en tu respuesta para que Leo lo vea. " +
      "Después compará con buscar_productos y pasale la lista mayorista con fotos: https://www.acopiosaludable.com/mayorista (−10% desde 5 kg, −15% desde 10 kg). " +
      "NO calcules descuentos de tu cuenta: si pide precio por volumen, anotá productos y kilos y decile que Leo, de ventas mayoristas, le confirma el número por este chat. " +
      "Condiciones: pedido mínimo $60.000; envío por Andreani o Correo Argentino con número de seguimiento (el costo depende del código postal: pedíselo); pago anticipado por transferencia o link de Mercado Pago. " +
      "CONFIANZA (mucha gente teme estafas): ofrecé una primera compra chica de prueba, foto del pedido armado antes de despachar y el número de seguimiento; nunca presiones. " +
      "Hay dos mixes clásicos (con cajú y girasol, y con cajú) y la composición puede variar según lo que entra; no prometas que está listo para la góndola: los rótulos los confirma Leo. " +
      "Si confirma, anotá qué lleva, cuántos kilos, ciudad y código postal, y decile que Leo le confirma el total con el envío.",
  },
  nutricionista: {
    // 23/11 (Santiago: «contactemos a la lista completa de nutricionistas mostrando lo que ofrecemos»).
    // Una pregunta corta que se contesta sin pensar; la oferta (kit con su link) va cuando contesta.
    nombre: "acopio_nutricionistas_v1",
    cuerpo:
      "Hola, {{1}} 👋 Una consulta corta: ¿tus pacientes te preguntan dónde comprar frutos secos, semillas y granola? Somos Acopio, de Villa Carlos Paz: armamos un kit con lo que vos recomendás y se lo llevamos a su casa.",
    botones: ["Sí, contame", "No, gracias"],
    contexto:
      "le escribimos nosotros: es nutricionista (consultorio propio) y le preguntamos si sus pacientes le piden dónde comprar frutos secos, semillas y granola. NO es un comercio: no le vendas reventa ni le pidas pedido mínimo. " +
      "LA OFERTA: 1) le armamos un kit con los productos que ella o él recomienda (preguntale cuáles son los 3 o 4 que más indica) y le damos un link propio para pasar a sus pacientes: abren el link y ya ven el kit armado, pueden sumar o sacar cosas; " +
      "2) a sus pacientes se lo llevamos a la casa en Villa Carlos Paz y la zona (envío $3.000) y lo pagan al recibir (a Córdoba Capital va en el viaje semanal a Córdoba, con el envío que dé costo_envio y pago al recibir; al resto del país, por correo y pago antes); 3) de todo lo que se compre con su link, el 10% es para el profesional en productos, todos los meses; " +
      "4) si quiere, armamos un mix con su receta y su nombre. Los precios reales salen de buscar_productos; no ofrezcas descuento por transferencia. " +
      "Nunca afirmes propiedades médicas ni «apto diabéticos/celíacos» salvo lo rotulado sin TACC: el criterio nutricional es del profesional. " +
      "Cuando diga qué productos quiere en el kit, el link lo armás y lo mandás VOS en ese mismo mensaje (25/11, Santiago: «cómo va a cambiar de agente por un link»): buscá los códigos con buscar_productos y escribí https://www.acopiosaludable.com/carrito?p=CODIGO*1,CODIGO*1 (los códigos separados por coma, cada uno con *1), con el detalle y el total de hoy. Nunca digas que Martina, Nico ni nadie del equipo se lo manda después. Si un producto no está, armá el link con los que sí hay y decilo.",
  },
  regalos: {
    // 17/11 (Santiago: «tenemos que ser campeones en mensajes en frío»): 0 respuestas con el pitch largo.
    // Ahora una sola pregunta corta que se contesta sin pensar; la oferta va recién cuando contesta. Sin el nombre del dueño.
    nombre: "acopio_empresas_regalos_v3",
    cuerpo:
      "Hola, {{1}} 👋 Una consulta corta: ¿este año hacen regalo de fin de año para el equipo o los clientes? Armamos cajas de frutos secos y pan dulce con la tarjeta de la empresa.",
    botones: ["Sí, mostrame opciones", "No, gracias"],
    contexto:
      "le escribimos nosotros ofreciendo las cajas de fin de año para su equipo o sus clientes y le preguntamos si este año hacen regalo. " +
      "PRIMERO anotá cuántas cajas quiere, el presupuesto por caja y para qué fecha. Con eso proponé 3 opciones reales de menor a mayor con precio de buscar_productos (los combos de Navidad: Mesa navideña, Regalo navideño, Pan dulce casero, y cajas a medida con frutos secos, garrapiñadas y chocolates) y mandá la foto con mandar_fotos. " +
      "Cada caja va con bolsa de regalo y una tarjeta con el nombre de la empresa. No calcules descuentos de tu cuenta: desde 10 cajas, decile que Leo, de ventas a empresas, le confirma el precio por cantidad por este chat. " +
      "Se paga antes de entregar, por transferencia (con factura) o Mercado Pago. Entrega en Carlos Paz por $3.000; a Córdoba Capital, el envío que dé costo_envio. Atendelo como cliente de negocio: usá pedido_para_negocio con «empresa».",
  },
};

/**
 * Plantillas frenadas: la de kit promete «sin TACC» y budines que no vendemos; cabañas y departamentos
 * quedan en la lista sin escribirles hasta que haya un texto nuevo aprobado. Hoteles y hostels vuelven
 * con la desayuno v3 (11/11), que ya no nombra «sin TACC».
 * Dietética (T-037): la v2 ofrecía el tropical y «listos para la góndola». Queda frenada hasta que Meta apruebe la v3.
 */
const FRENADAS: ReadonlySet<keyof typeof PLANTILLAS> = new Set(["kit"] as const);

/**
 * Rubros que el robot no contacta por decisión, no por plantilla (orden de Laura, 6/11): dietéticas,
 * almacenes naturales, herboristerías y casas a granel venden lo mismo que nosotros; son competencia,
 * y a esos se llega hablando con el dueño, no con una plantilla. Aunque Meta apruebe la dietética v3,
 * siguen afuera hasta que alguien saque esta regla.
 */
export function rubroExcluido(rubro: string, localidad?: string | null): boolean {
  if (!/diet|almac[eé]n natural|naturista|granel|herbor/i.test(rubro)) return false;
  // 21/11 (Santiago): a todo el país. Siguen afuera las de nuestra zona (competencia) y las sin localidad.
  return !localidad || ZONA_COMPETENCIA.test(localidad);
}

/** Donde las dietéticas son competencia: Punilla, Paravachasca, Córdoba capital y alrededores. */
const ZONA_COMPETENCIA = /carlos paz|punilla|cosqu[ií]n|bialet|tanti|icho cruz|san antonio de arredondo|mayu sumaj|cuesta blanca|tala huasi|cabalango|santa mar[ií]a|la falda|huerta grande|valle hermoso|capilla del monte|alta gracia|c[oó]rdoba(?!.*(santa fe|corrientes))|villa allende|r[ií]o ceballos|unquillo|mendiolaza|saldan|malague[nñ]o/i;

export function rubroHabilitado(rubro: string, localidad?: string | null): boolean {
  return !rubroExcluido(rubro, localidad) && !FRENADAS.has(plantillaDe(rubro));
}

export function plantillaDe(rubro: string): keyof typeof PLANTILLAS {
  if (/nutri/i.test(rubro)) return "nutricionista"; // antes que «consultor»: un consultorio de nutrición no es una empresa
  if (/empresa|estudio|inmobili|concesion|cl[ií]nica|consultor|constructora|seguros|oficina|f[aá]brica|industria|colegio|instituto|sanatorio|banco|mutual|cooperativa|regalo/i.test(rubro)) return "regalos";
  if (rubro === "hotel" || rubro === "hostel") return "desayuno";
  if (/gimnas|yoga|pilates|crossfit|funcional/i.test(rubro)) return "gimnasio";
  if (/diet|almac[eé]n natural|naturista|granel|herbor/i.test(rubro)) return "dietetica";
  if (/caf|panad|pastel|helad|vianda|restaur|almac|natural/i.test(rubro)) return "gastronomia";
  return "kit";
}

/** El texto que ve el destinatario, para guardarlo en el historial y que el vendedor sepa qué se le dijo. */
export function textoPlantilla(clave: keyof typeof PLANTILLAS, negocio: string): string {
  const p = PLANTILLAS[clave];
  return `${p.cuerpo.replace("{{1}}", negocio)}\n\n[${p.botones.join("] [")}]`;
}

/** Lo que el vendedor recibe pegado al mensaje cuando contesta un prospecto. */
export function contextoProspecto(rubro: string, negocio: string | null): string {
  const p = PLANTILLAS[plantillaDe(rubro)];
  return `<negocio>Te escribe ${negocio ?? "un negocio"} (${rubro}) de la zona: ${p.contexto} Hablale de usted o de vos según cómo te escriba, siempre cordial y breve.</negocio>\n\n`;
}

/** «No, gracias», «no me escriban más», «baja»: no se le vuelve a escribir. */
export function esBaja(texto: string): boolean {
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  return /^(no,? gracias|no gracias|no me interesa|no nos interesa|baja|stop|no me escriban|no escriban|no molesten)\b/.test(t);
}
