// Plantillas de prospección y reglas puras (sin base ni red), separadas para poder probarlas.
//
// La plantilla no lleva precios: cambian todos los días y la plantilla es fija. Termina en
// dos botones; el que dice que sí abre la charla y ahí el vendedor contesta con precios reales.

export const IDIOMA = "es_AR";

export type Rubro = "hotel" | "cabañas / complejo" | "departamentos / alquiler temporario" | "hostel";

type Plantilla = { nombre: string; cuerpo: string; botones: [string, string]; contexto: string };

/** Qué plantilla le toca a cada rubro y qué tiene que saber el vendedor cuando contestan. */
export const PLANTILLAS: Record<"desayuno" | "kit" | "gastronomia" | "gimnasio", Plantilla> = {
  desayuno: {
    nombre: "acopio_alojamientos_desayuno_v2",
    cuerpo:
      "Hola, {{1}}. Soy Santiago, de Acopio Saludable, de Villa Carlos Paz.\n\n" +
      "Ofrecemos a los alojamientos de la zona lo que lleva el desayuno: granola, frutos secos, mermeladas y productos sin TACC para el huésped que los pide. Por volumen y con entrega sin costo en Carlos Paz y alrededores.\n\n" +
      "¿Le puedo pasar precios a quien se ocupa de las compras?",
    botones: ["Sí, pasame precios", "No, gracias"],
    contexto:
      "le escribimos nosotros ofreciendo abastecer el desayuno (granola, frutos secos, mermeladas, sin TACC). Atendelo como cliente de negocio: " +
      "usá pedido_para_negocio con «hotel», nombrá dos o tres productos concretos con su precio real y preguntá cuántos desayunos sirven por semana para armarle el pedido.",
  },
  kit: {
    nombre: "acopio_alojamientos_kit_v2",
    cuerpo:
      "Hola, {{1}}. Soy Santiago, de Acopio Saludable, de Villa Carlos Paz.\n\n" +
      "Armamos kits de bienvenida para cabañas y departamentos: alfajores y budines sin TACC, frutos secos y snacks, para que el huésped encuentre algo rico al llegar. Por volumen y con entrega sin costo en Carlos Paz y alrededores.\n\n" +
      "¿Le paso precios para armar el kit?",
    botones: ["Sí, pasame precios", "No, gracias"],
    contexto:
      "le escribimos nosotros ofreciendo kits de bienvenida para el huésped (alfajores y budines sin TACC, frutos secos, snacks). Atendelo como cliente de negocio: " +
      "usá pedido_para_negocio con «cabañas», proponé un kit concreto con precios reales y preguntá cuántas unidades tiene para calcular el costo por kit.",
  },
  gastronomia: {
    nombre: "acopio_negocios_gastronomia_v1",
    cuerpo:
      "Hola, {{1}}. Soy Santiago, de Acopio Saludable, de Villa Carlos Paz.\n\n" +
      "Abastecemos cafeterías, panaderías y heladerías con frutos secos, granola, semillas y dátiles para bowls, toppings y pastelería. Por volumen, con entrega sin costo en Carlos Paz y alrededores y envíos a todo Córdoba.\n\n" +
      "¿Le paso la lista de precios a quien hace las compras?",
    botones: ["Sí, pasame precios", "No, gracias"],
    contexto:
      "le escribimos nosotros ofreciendo abastecer su cocina (frutos secos, granola, semillas, dátiles, cacao). Atendelo como cliente de negocio: " +
      "usá pedido_para_negocio con «cafeterías», nombrá dos o tres insumos con su precio real por kilo y preguntá cuántos kilos usan por semana para armarle el pedido.",
  },
  gimnasio: {
    nombre: "acopio_negocios_gimnasio_v1",
    cuerpo:
      "Hola, {{1}}. Soy Santiago, de Acopio Saludable, de Villa Carlos Paz.\n\n" +
      "Armamos un pack para que los gimnasios vendan en el mostrador: granola proteica, barras, frutos secos y mixes, con precio de reventa y buen margen por unidad. Entrega sin costo en Carlos Paz y alrededores y envíos a todo Córdoba.\n\n" +
      "¿Le paso precios y cuánto le queda de ganancia?",
    botones: ["Sí, pasame precios", "No, gracias"],
    contexto:
      "le escribimos nosotros ofreciendo productos para que revenda en el mostrador (granola proteica, barras, frutos secos). Atendelo como cliente de negocio: " +
      "usá pedido_para_negocio con «gimnasio», hablale de reventa (precio sugerido y cuánto gana por unidad) y preguntá cuántos socios tiene para armarle el pedido.",
  },
};

export function plantillaDe(rubro: string): keyof typeof PLANTILLAS {
  if (rubro === "hotel" || rubro === "hostel") return "desayuno";
  if (/gimnas|yoga|pilates|crossfit|funcional/i.test(rubro)) return "gimnasio";
  if (/caf|panad|pastel|helad|vianda|restaur|almac|natural|diet/i.test(rubro)) return "gastronomia";
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
