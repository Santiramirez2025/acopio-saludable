// Todos los días a la mañana: baja la lista del día de La Granja del Centro y aplica los cambios.
import { NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-acceso";
import { conRegistro } from "@/lib/salud";
import { actualizarDesdeLaGranja, avisarResultadoLista } from "@/lib/listas-aplicar";
import { avisoCostos, cruzarConWebGranja } from "@/lib/granja-web";
import { combosTienda } from "@/lib/tienda";
import { avisoCombosApagados, combosQueSeApagaron } from "@/lib/combos-apagados";
import { avisarSantiago } from "@/lib/avisos";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // 23/11: qué combos se vendían antes de los cambios automáticos (para avisar si alguno se apaga).
  const antes = await combosTienda({ activo: true }).catch(() => null);
  // Un «error» de la lista (no la pudo bajar, no trae nuestros productos) cuenta como falla: así se reintenta.
  const r = await conRegistro("listas", () => actualizarDesdeLaGranja().then((x) => {
    if ("error" in x && !/ya se aplic/i.test(x.error)) throw new Error(x.error); // «ya se aplicó» = la del día ya está: está bien
    return x;
  })).catch((e) => ({ error: String(e) }));
  await avisarResultadoLista(r);
  // 19/11: después de la lista PDF, la disponibilidad real de la web (lo «No disponible» no se vende).
  const web = await conRegistro("granja-web", () => cruzarConWebGranja(true)).catch((e) => ({ error: String(e) }));
  // 23/11: si la lista o la web de La Granja apagaron un combo (los dátiles apagaron el Trío), se avisa a Santiago.
  if (antes) {
    const despues = await combosTienda({ activo: true }).catch(() => null);
    const pausados = web && "pausar" in web && web.aplicado ? web.pausar.map((x) => x.codigo) : [];
    const texto = despues ? avisoCombosApagados(combosQueSeApagaron(antes, despues, pausados), "cambio automático de stock o precios de La Granja (7:40)") : null;
    if (texto) await avisarSantiago("Un combo se dejó de vender", texto).catch(() => false);
  }
  // 23/11: si un insumo de combos hay que comprarlo más caro (dátiles sin la caja de Egipto), se avisa todos los días.
  const caro = web && "costoSubio" in web ? avisoCostos(web.costoSubio ?? []) : null;
  if (caro) await avisarSantiago("Un insumo de los combos subió", caro).catch(() => false);
  return NextResponse.json({ lista: r, web });
}
