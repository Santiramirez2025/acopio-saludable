// Lo que un agente puede hacer en el momento cuando habla con Santiago (llamada en vivo o chat escrito).
// Las que cambian algo piden confirmado:true (Santiago dijo que sí). Las ejecuta /api/admin/agentes/accion.

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) => ({ type: "function", name, description, parameters: { type: "object", properties, required } });
const SI = { confirmado: { type: "boolean", description: "true solo si Santiago ya dijo que sí a ESTA acción exacta." } };
export const HERRAMIENTAS = [
  fn("ver_pizarra", "La pizarra de armado: cada pedido para armar con lo que lleva (producto, cantidad, presentación), cuánto cobrar, zona y notas, y los totales a juntar. Usala cuando pregunten qué hay que armar.", {}),
  fn("ver_pedidos", "Lista los pedidos abiertos y los de los últimos 7 días (cliente, teléfono, estado, total, pago, ítems).", {}),
  fn("ver_charlas", "Charlas de WhatsApp recientes con sus últimos mensajes y si la ventana de 24 h está abierta.", { horas: { type: "number", description: "Cuántas horas hacia atrás (por defecto 24)." } }),
  fn("ver_charla", "La charla de WhatsApp con un cliente: pasá su teléfono o su nombre (si hay dos con ese nombre, te devuelve las opciones).", { telefono: { type: "string", description: "Teléfono o nombre del cliente" } }, ["telefono"]),
  fn("escribir_whatsapp", "Manda un mensaje de WhatsApp a un cliente o negocio (solo si la ventana de 24 h está abierta). La charla sigue con el vendedor: si le armás un pedido, pasá también el link del carrito en «pedido» (/carrito?p=CODIGO*CANT,…) así el vendedor cierra ese mismo.", { telefono: { type: "string" }, texto: { type: "string", description: "Mensaje corto, rioplatense, sin «perfecto»." }, pedido: { type: "string", description: "Opcional: /carrito?p=… con lo que le armaste" }, ...SI }, ["telefono", "texto", "confirmado"]),
  fn("cambiar_estado_pedido", "Cambia el estado de un pedido (PAGADO, EN_COMPRA, PREPARADO, ENVIADO le avisa al cliente que su pedido está en el reparto de hoy, ENTREGADO manda gracias + referidos, CANCELADO).", { id: { type: "number" }, estado: { type: "string", enum: ["PENDIENTE_PAGO", "PAGADO", "EN_COMPRA", "PREPARADO", "ENVIADO", "ENTREGADO", "CANCELADO"] }, nota: { type: "string" }, ...SI }, ["id", "estado", "confirmado"]),
  fn("cambiar_precio_ml", "Cambia el precio de una publicación de Mercado Libre (se redondea a $500 y nunca baja del piso de ganancia).", { item: { type: "string", description: "MLA…" }, precio: { type: "number" }, ...SI }, ["item", "precio", "confirmado"]),
  fn("cargar_negocios", "Carga negocios para la captación automática por WhatsApp.", { lista: { type: "array", items: { type: "object", properties: { telefono: { type: "string" }, negocio: { type: "string" }, rubro: { type: "string" }, localidad: { type: "string" } }, required: ["telefono", "negocio"] } }, ...SI }, ["lista", "confirmado"]),
];


/** Las mismas, en el formato de herramientas de Claude (para el chat escrito). */
export const HERRAMIENTAS_CLAUDE = HERRAMIENTAS.map((h) => ({ name: h.name, description: h.description, input_schema: h.parameters }));
