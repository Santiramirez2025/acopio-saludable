// El reparto por WhatsApp: a Santiago le llega cada parada con todo lo que necesita en la calle
// (dirección con el mapa, qué lleva, cuánto cobrar, teléfono) y, cada vez que entrega uno, la siguiente.
import type { PedidoArmado } from "./armado";

const SITIO = "https://www.acopiosaludable.com";

// Perezoso: así las funciones de texto se pueden probar sin base de datos.
const avisarSantiago = async (...a: Parameters<typeof import("./avisos").avisarSantiago>) => (await import("./avisos")).avisarSantiago(...a);

/**
 * Orden del recorrido (18/11, Santiago: «el recorrido siempre arranca y termina en Las Jarillas, San Antonio de
 * Arredondo»): primero el sur (San Antonio, Mayu Sumaj, Icho Cruz, Cuesta Blanca), después Carlos Paz, después el
 * norte (Bialet, Tanti, Cabalango) y Córdoba Capital al final.
 */
export function ordenarParadas<T extends { zona: string; direccion?: string | null }>(ps: T[]): T[] {
  const t = (p: T) => `${p.zona} ${p.direccion ?? ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const rango = (p: T) => {
    const x = t(p);
    if (/arredondo|mayu sumaj|icho cruz|cuesta blanca|tala huasi/.test(x)) return 0;
    if (/bialet|tanti|cabalango|siquiman/.test(x)) return 2;
    if (/cordoba/.test(x) && !/carlos paz/.test(x)) return 3;
    return 1;
  };
  return [...ps].sort((a, b) => rango(a) - rango(b));
}

function wa(tel: string): string {
  const d = tel.replace(/\D/g, "");
  return d ? `https://wa.me/${d}` : "";
}

/** El mensaje de una parada. */
export function textoParada(p: PedidoArmado, i: number, total: number): string {
  const lleva = p.items.map((x) => `• ${x.cantidad} × ${x.producto} ${x.presentacion.replace(/^x\s*/i, "")}`).join("\n");
  return [
    `🚚 Parada ${i + 1} de ${total} · ${p.codigo}`,
    `👤 ${p.cliente}${p.telefono ? ` · ${wa(p.telefono)}` : ""}`,
    p.direccion ? `📍 ${p.direccion}` : "📍 Falta la dirección: pedísela antes de salir",
    p.mapa ? `🗺️ ${p.mapa}` : "",
    `💵 ${p.cobrar}`,
    p.notas ? `📝 ${p.notas}` : "",
    `📦 Lleva:\n${lleva}`,
    `✅ Al entregar, marcalo acá: ${SITIO}/admin/pedidos/${p.id}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Lo que queda por entregar HOY, en el orden del recorrido.
 * 19/11 (Santiago): «me mete todos los pedidos juntos y no salgo con todos, salgo con una ruta específica diaria».
 * La ruta del día son los pedidos marcados «Enviado» (los que salieron). Solo si todavía no salió ninguno
 * (antes de arrancar) se muestran los que están para armar.
 */
export async function paradasPendientes(): Promise<PedidoArmado[]> {
  const { pizarraArmado } = await import("./armado");
  const pz = await pizarraArmado();
  return ordenarParadas(pz.enCamino.length ? pz.enCamino : [...pz.paraArmar, ...pz.listos]);
}

/** Manda todo el reparto: un resumen y un mensaje por parada. */
export async function mandarReparto(): Promise<{ paradas: number; ok: boolean }> {
  const ps = await paradasPendientes();
  if (!ps.length) {
    await avisarSantiago("Reparto", "🚚 No hay pedidos para entregar ahora.", { mail: false });
    return { paradas: 0, ok: true };
  }
  const cobrar = ps.filter((p) => !p.pagado).reduce((s, p) => s + (Number(p.cobrar.replace(/\D/g, "")) || 0), 0);
  let ok = await avisarSantiago(
    "Reparto de hoy",
    `🚚 Reparto de hoy: ${ps.length} ${ps.length === 1 ? "parada" : "paradas"}${cobrar ? ` · a cobrar en total $ ${cobrar.toLocaleString("es-AR")}` : ""}.\nTe mando cada una en orden; cuando marques una como entregada te llega la siguiente.`,
    { mail: false },
  );
  for (const [i, p] of ps.entries()) ok = (await avisarSantiago(`Parada ${i + 1}`, textoParada(p, i, ps.length), { mail: false })) && ok;
  return { paradas: ps.length, ok };
}

/** Después de entregar un pedido: confirmación y la próxima parada. */
export async function avisarSiguiente(entregado: { id: number; nombre: string }): Promise<void> {
  const ps = await paradasPendientes();
  const codigo = `AS-${String(entregado.id).padStart(5, "0")}`;
  if (!ps.length) {
    await avisarSantiago("Reparto terminado", `✅ Entregado ${codigo} (${entregado.nombre.split(" ")[0]}).\n🎉 Terminaste el reparto: no queda ningún pedido por entregar.`, { mail: false });
    return;
  }
  await avisarSantiago("Próxima parada", `✅ Entregado ${codigo} (${entregado.nombre.split(" ")[0]}). Quedan ${ps.length}.\n\n${textoParada(ps[0], 0, ps.length).replace(/^🚚 Parada 1 de \d+/, "➡️ Próxima parada")}`, { mail: false });
}
