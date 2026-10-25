// La empresa por dentro: quién trabaja, en qué área, cuándo y para qué. Lo usa la página /admin/empresa
// (para que cualquiera entienda cómo funciona Acopio) y la bitácora (/api/admin/agentes) para validar
// quién deja informes. Puro: sin base de datos.

export type Area = "direccion" | "comercial" | "marketing" | "operaciones" | "administracion";

export type Agente = {
  id: string;
  nombre: string;
  puesto: string;
  area: Area;
  emoji: string;
  /** Días que trabaja (0 = domingo … 6 = sábado) y horas en hora argentina (decimal: 8.22 = 8:13). */
  dias: number[];
  horas: string[];
  mision: string;
  hace: string[];
  mide: string;
  /** Si deja informe en la bitácora (las tareas viejas que solo mandan un mensaje no lo hacen). */
  informa: boolean;
};

export const AREAS: Record<Area, { nombre: string; bajada: string }> = {
  direccion: { nombre: "Dirección", bajada: "Mira el todo, corrige y decide hacia dónde crecer." },
  comercial: { nombre: "Comercial", bajada: "Conseguir clientes y venderles. Es la prioridad número uno." },
  marketing: { nombre: "Marketing", bajada: "Que nos conozcan: contenido según la fecha, diseño y comunidad." },
  operaciones: { nombre: "Operaciones", bajada: "Comprar bien, armar y entregar a tiempo." },
  administracion: { nombre: "Administración", bajada: "Los números: cuánto vendemos, cuánto ganamos, cuánto cuesta un cliente." },
};

const LUN_SAB = [1, 2, 3, 4, 5, 6];
const TODOS = [0, 1, 2, 3, 4, 5, 6];

export const AGENTES: Agente[] = [
  {
    id: "gerente", nombre: "Gerente General", puesto: "Dirige la empresa", area: "direccion", emoji: "🧭", dias: LUN_SAB, horas: ["12:57"], informa: true,
    mision: "Que todo funcione y que Santiago sepa en un minuto qué pasó y qué viene.",
    hace: ["Revisa que cada agente y cada tarea automática hayan cumplido", "Si algo falla, lo arregla solo", "Manda un parte diario de 10 líneas"],
    mide: "Tareas al día y decisiones tomadas",
  },
  {
    id: "estratega", nombre: "Director de Crecimiento", puesto: "Plan para escalar", area: "direccion", emoji: "🚀", dias: [6], horas: ["10:13"], informa: true,
    mision: "Encontrar la forma más rápida de multiplicar las ventas.",
    hace: ["Analiza la semana: qué canal trajo clientes y a qué costo", "Define 3 experimentos de crecimiento para la semana", "Ajusta las prioridades del resto de los agentes"],
    mide: "Clientes nuevos por semana",
  },
  {
    id: "ventas", nombre: "Vendedor Cerrador", puesto: "Convierte charlas en pedidos", area: "comercial", emoji: "💬", dias: LUN_SAB, horas: ["11:47", "18:47"], informa: true,
    mision: "Que ninguna persona interesada se vaya sin comprar.",
    hace: ["Retoma charlas que se cortaron con intención de compra", "Aprende qué respuestas del bot venden y cuáles no", "Recomienda qué anuncio de Meta prender o apagar"],
    mide: "Charlas → pedidos (conversión)",
  },
  {
    id: "hunter", nombre: "Cazador de Clientes", puesto: "Busca negocios y empresas", area: "comercial", emoji: "🎯", dias: LUN_SAB, horas: ["10:23"], informa: true,
    mision: "Traer clientes grandes: negocios que revenden, empresas que regalan, turismo.",
    hace: ["Encuentra dietéticas, gimnasios, cafés, hoteles y cabañas de la zona", "Arma la lista para la captación automática por WhatsApp", "Contacta empresas por mail para regalos de fin de año"],
    mide: "Negocios contactados y respuestas",
  },
  {
    id: "fidelizacion", nombre: "Fidelización y Referidos", puesto: "Que vuelvan y nos recomienden", area: "comercial", emoji: "🤝", dias: LUN_SAB, horas: ["17:13"], informa: true,
    mision: "Cada cliente tiene que comprar otra vez y traer a otro.",
    hace: ["Agradece después de cada entrega", "Pide reseña y ofrece el beneficio por referido", "Detecta clientes que dejaron de comprar"],
    mide: "Recompra y referidos",
  },
  {
    id: "mercadolibre", nombre: "Encargado de Mercado Libre", puesto: "Tienda en Mercado Libre", area: "comercial", emoji: "🛒", dias: [2, 5], horas: ["10:07"], informa: true,
    mision: "Crecer orgánico en Mercado Libre con precios competitivos y buena reputación.",
    hace: ["Compara precios con la competencia", "Mejora títulos, fotos y respuestas", "Ajusta precios sin perder ganancia"],
    mide: "Visitas, ventas y reputación",
  },
  {
    id: "marketing", nombre: "Jefe de Marketing", puesto: "Contenido según la fecha", area: "marketing", emoji: "📣", dias: TODOS, horas: ["9:37"], informa: true,
    mision: "Que todos los días salga contenido que venda, pensado para la fecha que estamos viviendo.",
    hace: ["Arma el calendario de la semana según la temporada", "Publica en Instagram, Facebook y TikTok", "Coordina con el Diseñador y el de Reels"],
    mide: "Alcance y mensajes que llegan por las publicaciones",
  },
  {
    id: "disenador", nombre: "Diseñador Gráfico", puesto: "Piezas, anuncios e ideas visuales", area: "marketing", emoji: "🎨", dias: TODOS, horas: ["9:08"], informa: true,
    mision: "Que cada publicación y cada anuncio se vea profesional y frene el dedo.",
    hace: ["Diseña posteos, historias y anuncios con fotos reales", "Propone ideas visuales nuevas", "Deja todo listo para que Marketing lo publique"],
    mide: "Piezas listas por día",
  },
  {
    id: "community", nombre: "Community Manager", puesto: "Conversación en redes", area: "marketing", emoji: "🗣️", dias: TODOS, horas: ["12:41", "19:41"], informa: true,
    mision: "Estar presentes donde está la gente de Carlos Paz y responder rápido.",
    hace: ["Comenta en cuentas de la zona para que nos conozcan", "Revisa que los comentarios propios estén respondidos", "Mide qué contenido funciona"],
    mide: "Interacciones y seguidores nuevos",
  },
  {
    id: "reels", nombre: "Productor de Reels", puesto: "Guion del video del día", area: "marketing", emoji: "🎬", dias: TODOS, horas: ["8:22"], informa: false,
    mision: "Un Reel por día, fácil de grabar con productos reales.",
    hace: ["Escribe el guion: gancho, tomas, texto y audio", "Rota temas según la temporada"],
    mide: "Reels publicados",
  },
  {
    id: "compras", nombre: "Compras y Proveedores", puesto: "Comprar mejor cada día", area: "operaciones", emoji: "📦", dias: LUN_SAB, horas: ["8:02"], informa: true,
    mision: "Pagar lo menos posible y no vender nunca a pérdida.",
    hace: ["Controla los precios de La Granja de cada día", "Busca mayoristas más baratos", "Avisa si un producto queda con poca ganancia"],
    mide: "Costo por kilo y margen",
  },
  {
    id: "logistica", nombre: "Logística y Envíos", puesto: "Que cada pedido llegue", area: "operaciones", emoji: "🚚", dias: LUN_SAB, horas: ["8:13"], informa: true,
    mision: "Entregar todo a tiempo y cobrar lo que corresponde.",
    hace: ["Arma la ruta del día", "Avisa a cada cliente el día de su entrega", "Dice qué armar y qué comprar"],
    mide: "Pedidos entregados a tiempo",
  },
  {
    id: "finanzas", nombre: "Finanzas", puesto: "Los números de la semana", area: "administracion", emoji: "📊", dias: [1], horas: ["18:23"], informa: true,
    mision: "Saber cuánto ganamos y cuánto nos cuesta cada cliente.",
    hace: ["Ventas, margen y ticket de la semana", "Cobranzas pendientes", "Costo por cliente de los anuncios"],
    mide: "Margen y costo por cliente",
  },
];

/** Las tareas automáticas (robots) que corren solas en el servidor. */
export const ROBOTS: { nombre: string; cuando: string; hace: string }[] = [
  { nombre: "Vendedora de WhatsApp (IA)", cuando: "24 horas", hace: "Responde, arma pedidos y cobra" },
  { nombre: "Respuesta de comentarios", cuando: "Al instante", hace: "Contesta comentarios de Instagram y Facebook y abre charla por privado" },
  { nombre: "Precios de La Granja", cuando: "7:40", hace: "Lee la lista del día y actualiza costos y precios" },
  { nombre: "Captación de negocios", cuando: "9:05", hace: "Escribe a negocios nuevos de la lista por WhatsApp" },
  { nombre: "Parte de Mercado Libre", cuando: "9:15", hace: "Responde preguntas y sube precios si sube el costo" },
  { nombre: "Reactivación", cuando: "9:30", hace: "Vuelve a escribir a quien consultó y no compró" },
  { nombre: "Recompra", cuando: "10:40", hace: "Escribe a clientes a los 20-25 días de su compra" },
  { nombre: "Carritos abandonados", cuando: "11:00", hace: "Recuerda los pedidos armados sin terminar" },
  { nombre: "Radar de Instagram", cuando: "Cada 15 min", hace: "Encuentra publicaciones de la zona donde conviene aparecer" },
];

export const IDS_AGENTES = AGENTES.map((a) => a.id);

function minutos(h: string): number {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + (mm || 0);
}

export type EstadoAgente = { estado: "ok" | "falla" | "pendiente" | "atrasado" | "descanso"; texto: string };

/**
 * Cómo está un agente hoy, según su último informe. `ahora` y `ultimo` se pasan en hora argentina
 * ya convertida: día de la semana, minutos desde medianoche y fecha (AAAA-MM-DD).
 */
export function estadoAgente(
  a: Agente,
  hoy: { dia: number; min: number; fecha: string },
  ultimo: { fecha: string; hora: string; ok: boolean } | null,
): EstadoAgente {
  if (!a.dias.includes(hoy.dia)) return { estado: "descanso", texto: "Hoy no trabaja" };
  const primera = Math.min(...a.horas.map(minutos));
  const deHoy = ultimo && ultimo.fecha === hoy.fecha;
  if (deHoy && !ultimo.ok) return { estado: "falla", texto: `Reportó un problema a las ${ultimo.hora}` };
  if (deHoy) return { estado: "ok", texto: `Trabajó hoy a las ${ultimo.hora}` };
  if (hoy.min < primera) return { estado: "pendiente", texto: `Empieza a las ${a.horas[0]}` };
  if (!a.informa) return { estado: "ok", texto: `Le tocaba a las ${a.horas[0]}` };
  if (hoy.min < primera + 90) return { estado: "pendiente", texto: "Trabajando…" };
  return { estado: "atrasado", texto: `No reportó (le tocaba a las ${a.horas[0]})` };
}
