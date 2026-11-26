/** Mensajes listos del repartidor (26/11, Santiago: «plantillas cargadas» en la hoja del reparto). Sin montos. */
export const PLANTILLAS_REPARTO: Record<string, { boton: string; texto: (nombre: string) => string }> = {
  afuera: { boton: "🚪 Estoy afuera", texto: (n) => `¡Hola${n ? ` ${n}` : ""}! Soy el cadete de Acopio: estoy afuera con tu pedido 🙌` },
  quince: { boton: "⏱️ Llego en 15 min", texto: (n) => `¡Hola${n ? ` ${n}` : ""}! Soy el cadete de Acopio: llego en unos 15 minutos con tu pedido 🚗` },
  referencia: { boton: "📍 No encuentro la casa", texto: (n) => `¡Hola${n ? ` ${n}` : ""}! Soy el cadete de Acopio: estoy por tu zona y no encuentro la casa. ¿Me pasás una referencia o me compartís la ubicación?` },
  nadie: { boton: "🔔 No hay nadie", texto: (n) => `¡Hola${n ? ` ${n}` : ""}! Soy el cadete de Acopio: toqué timbre y no hay nadie. ¿Estás por llegar? Te espero unos minutos.` },
};

