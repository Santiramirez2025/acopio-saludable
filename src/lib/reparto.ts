// El reparto por WhatsApp: a Santiago le llega cada parada con todo lo que necesita en la calle
// (dirección con el mapa, qué lleva, cuánto cobrar, teléfono) y, cada vez que entrega uno, la siguiente.
import type { PedidoArmado } from "./armado";

const SITIO = "https://www.acopiosaludable.com";

// Perezoso: así las funciones de texto se pueden probar sin base de datos.
const avisarSantiago = async (...a: Parameters<typeof import("./avisos").avisarSantiago>) => (await import("./avisos")).avisarSantiago(...a);

/** Primero Carlos Paz y la zona; Córdoba Capital al final (es el viaje largo). */
export function ordenarParadas<T extends { zona: string }>(ps: T[]): T[] {
  const lejos = (z: string) => Number(/c[oó]rdoba/i.test(z) && !/carlos paz/i.test(z));
  return [...ps].sort((a, b) => lejos(a.zona) - lejos(b.zona));
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

/** Lo que queda por entregar hoy, en el orden del recorrido. */
export async function paradasPendientes(): Promise<PedidoArmado[]> {
  const { pizarraArmado } = await import("./armado");
  const pz = await pizarraArmado();
  return ordenarParadas([...pz.paraArmar, ...pz.listos, ...pz.enCamino]);
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
