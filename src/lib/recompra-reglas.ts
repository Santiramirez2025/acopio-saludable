// Recompra: lo puro (sin base), para probarlo.

export type ItemRecompra = { codigo: string; producto: string; presentacion: string; cantidad: number; comboSlug: string | null };

const NOMBRE_COMBO: Record<string, string> = {
  "despensa-4-kilos": "la Despensa de 4 kilos",
  "despensa-chica": "la Despensa chica de 2 kilos",
  "alacena-de-frutos-secos": "la Alacena de frutos secos",
  "mixes-del-mes": "los Mixes del mes",
  "pan-dulce-casero": "el Kit Pan Dulce casero",
  "mesa-navidena": "la Mesa navideña",
  "regalo-navideno": "la Bolsa regalo navideña",
};

/**
 * Los pedidos guardan el nombre con el que se vendieron. Antes del 3/11 los dátiles se llamaban «Deglet Nour (Argelia)»,
 * y la política ya no lo permite: la recompra nombra lo que vendemos hoy, en la plantilla y en la nota para el vendedor.
 */
export function nombreVigente(producto: string): string {
  return /deglet|argelia/i.test(producto) ? "Dátiles con carozo" : producto;
}

/** Lo que va en la plantilla: corto. Si fue un combo, el nombre del combo; si no, los 2 primeros productos. */
export function resumenPedido(items: ItemRecompra[]): string {
  const combos = [...new Set(items.map((i) => i.comboSlug).filter((s): s is string => Boolean(s)))];
  if (combos.length === 1 && items.every((i) => i.comboSlug)) return NOMBRE_COMBO[combos[0]] ?? "tu combo";
  const nombres = items.map((i) => nombreVigente(i.producto).toLowerCase().replace(/\s+/g, " ").trim());
  if (nombres.length <= 2) return `tu pedido (${nombres.join(" y ")})`;
  return `tu pedido (${nombres.slice(0, 2).join(", ")} y más)`;
}

/** Lo que queda en la charla para que el vendedor arme lo mismo con los códigos exactos. */
export function textoRecompra(o: { numero: string; id: number; nombre: string; items: ItemRecompra[]; direccion: string; total: string }): string {
  const combos = [...new Set(o.items.map((i) => i.comboSlug).filter((s): s is string => Boolean(s)))];
  const sueltos = o.items.filter((i) => !i.comboSlug);
  const lineas = [
    ...combos.map((s) => `combo slug ${s} x 1`),
    ...sueltos.map((i) => `codigo ${i.codigo} · ${nombreVigente(i.producto)} ${i.presentacion} x ${i.cantidad}`),
  ];
  return (
    `[Recompra pedido ${o.numero} (id ${o.id})] Hola ${o.nombre}, soy Santiago, de Acopio Saludable. Hace unas semanas te llevamos ${resumenPedido(o.items)}. ¿Te armo lo mismo para este mes? ` +
    `[Botones: Sí, lo mismo · Quiero cambiar algo · Ahora no] ` +
    `[Para el vendedor: pedido anterior (total ${o.total}): ${lineas.join("; ")}. Dirección anterior: ${o.direccion}.]`
  );
}

/**
 * EN ESPERA (Martín 7/11, con la respuesta de Pablo del 7/11 8:10): sin dato de almendra en casa no se aseguran los dos
 * mixes con cajú, y por eso tampoco la Despensa ni la Alacena. A esos clientes no se les pregunta «¿te armo lo mismo?»
 * hasta que entre la almendra: si dicen que sí y pagan, no podemos fallarle a alguien que ya volvió.
 * No se pierden: la ventana de recompra llega a 35 días, así que salen cuando esto vuelva a false.
 */
export const RECOMPRA_EN_ESPERA_ACTIVA = true;
const COMBOS_EN_ESPERA = new Set(["despensa-4-kilos", "despensa-chica", "alacena-de-frutos-secos", "mixes-del-mes"]);

export function recompraEnEspera(items: ItemRecompra[], activa = RECOMPRA_EN_ESPERA_ACTIVA): boolean {
  if (!activa) return false;
  return items.some((i) => (i.comboSlug && COMBOS_EN_ESPERA.has(i.comboSlug)) || (/^mix\b/i.test(i.producto) && /caj[uú]/i.test(i.producto)));
}

/**
 * EL BOT TAMPOCO COBRA LO QUE NO ASEGURAMOS (Martín 8/11, hallazgo de Nico del 7/11, caso …6653): con el interruptor
 * de arriba en true, la recompra ya no ofrecía la Despensa, pero el vendedor igual la cotizaba con los botones de pago.
 * Mientras siga en true, si el pedido armado trae Despensa, Alacena, Mixes del mes o un mix con cajú, eso sale del
 * pedido y entra lo que sí sale seguro (dátiles con carozo, mix de semillas y pasas, 1 kg c/u: los 3 kilos, que
 * además pasan los filtros de Ana). Los precios los pone el servidor, como siempre.
 */
export const ALTERNATIVA_SEGURA: { tipo: "producto"; id: string; cantidad: number }[] = [
  { tipo: "producto", id: "LG-DATIL", cantidad: 1 },
  { tipo: "producto", id: "LG-MIXSEM", cantidad: 1 },
  { tipo: "producto", id: "TG-PASAS", cantidad: 1 },
];

type LineaArmada = { tipo: "producto" | "combo"; id: string; cantidad: number };

export function lineaEnEspera(l: { tipo: "producto" | "combo"; id: string; nombre: string }): boolean {
  return l.tipo === "combo"
    ? COMBOS_EN_ESPERA.has(l.id)
    : /^mix\b/i.test(l.nombre) && /caj[uú]/i.test(l.nombre);
}

/** Lo que queda para cotizar y los nombres de lo que se sacó. Sin nada en espera, devuelve las mismas líneas. */
export function sinLoEnEspera<L extends LineaArmada>(
  lineas: L[],
  cotizadas: { tipo: "producto" | "combo"; id: string; nombre: string }[],
  activa = RECOMPRA_EN_ESPERA_ACTIVA,
): { lineas: LineaArmada[]; quitados: string[] } {
  if (!activa) return { lineas, quitados: [] };
  const fuera = cotizadas.filter(lineaEnEspera);
  if (!fuera.length) return { lineas, quitados: [] };
  const clave = (l: { tipo: string; id: string }) => `${l.tipo}|${l.id}`;
  const sacar = new Set(fuera.map(clave));
  const quedan: LineaArmada[] = lineas.filter((l) => !sacar.has(clave(l)));
  for (const a of ALTERNATIVA_SEGURA) if (!quedan.some((l) => clave(l) === clave(a))) quedan.push({ ...a });
  return { lineas: quedan, quitados: [...new Set(fuera.map((f) => f.nombre))] };
}

/** El texto que reemplaza al del modelo cuando hubo que cambiar el pedido: de frente, sin culpa y con el cierre. */
export function textoEnEspera(quitados: string[]): string {
  const que = quitados.length === 1 ? quitados[0] : `${quitados.slice(0, -1).join(", ")} y ${quitados.at(-1)}`;
  return `Te cuento algo antes de cobrarte: ${que} lleva el mix con cajú, que lo estamos reponiendo, y no te quiero cobrar algo que no te pueda llevar. Te armé lo que sí sale seguro esta semana 👇`;
}

/**
 * CARRITO POR DEFECTO SIN ALMENDRA (Martín 9/11, propuesta de Nico y orden de Laura del 9/11): con el interruptor de
 * espera en true (no hay almendra asegurada), la Alacena y los mixes con cajú no se proponen de entrada. Si la persona
 * no nombró productos, el carrito armado son los 3 kilos seguros (dátiles con carozo, mix de semillas y pasas), que
 * pasan los filtros de Ana (33,7% bruto / 18,5% contribución por transferencia). Antes, el modelo proponía la Alacena y
 * sinLoEnEspera la cambiaba después: el cliente veía un combo y recibía otro. Se vuelve atrás solo, con el interruptor.
 */
export function textosPorDefecto(espera = RECOMPRA_EN_ESPERA_ACTIVA) {
  return espera
    ? {
        gama: "los dátiles con carozo, las pasas, el mix de semillas y la nuez",
        carrito: "los 3 kilos que salen seguro esta semana: dátiles con carozo, mix de semillas y pasas, 1 kg de cada uno (buscar_productos y el total de las herramientas); no propongas la Alacena, la Despensa ni mixes con cajú, que los estamos reponiendo",
        corto: "los 3 kilos: dátiles con carozo, mix de semillas y pasas",
        caro: "bajá a medio kilo de lo que eligió o a uno solo de los 3 kilos",
      }
    : {
        gama: "un mix, la nuez, la almendra y el cajú",
        carrito: "la Alacena de frutos secos (recomendar_combo: precio y qué trae, con la cantidad de cada cosa)",
        corto: "la Alacena",
        caro: "bajá al Mix Clásico con cajú y girasol de 1 kg o a medio kilo",
      };
}
