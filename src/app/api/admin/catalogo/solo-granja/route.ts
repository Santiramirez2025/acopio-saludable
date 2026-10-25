// El negocio pasa a comprar solo en La Granja (va en el día y se lleva cualquier cantidad):
// se ocultan de la tienda los productos de Distrimay y los combos se rearman sin ellos.
// Solo administrador. POST ?aplicar=1 aplica; sin eso devuelve el plan sin tocar nada.
// Se puede deshacer: los ocultos quedan con el motivo MOTIVO y se vuelven a mostrar con ?deshacer=1.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { proveedorDe } from "@/lib/proveedores";
import { REEMPLAZOS } from "@/lib/catalogo-proveedores";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MOTIVO = "Distrimay: se deja de vender, todo sale de La Granja (oct 2026)";
/** Equivalentes de La Granja para lo que estaba en combos. */
const EQUIVALENTES: Record<string, string> = { ...REEMPLAZOS, "702": "LG-ALMNP-500" };

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const aplicar = q.get("aplicar") === "1";

  if (q.get("deshacer") === "1") {
    const r = await prisma.product.updateMany({ where: { ocultoMotivo: MOTIVO }, data: { visible: true, ocultoMotivo: null } });
    revalidatePath("/", "layout");
    return NextResponse.json({ vueltosAMostrar: r.count });
  }

  const productos = await prisma.product.findMany({ select: { codigo: true, producto: true, marca: true, presentacion: true, visible: true, estado: true } });
  const porCodigo = new Map(productos.map((p) => [p.codigo, p]));
  const deDistrimay = productos.filter((p) => proveedorDe(p) === "distrimay");
  const aOcultar = deDistrimay.filter((p) => p.visible);
  const vendible = (c: string) => {
    const p = porCodigo.get(c);
    return Boolean(p && p.estado === "ACTIVO" && proveedorDe(p) !== "distrimay");
  };

  const combos = await prisma.combo.findMany({ where: { activo: true }, include: { items: true } });
  const planCombos = combos.map((c) => {
    const items: { codigo: string; cantidad: number }[] = [];
    const cambios: string[] = [];
    for (const i of c.items) {
      const p = porCodigo.get(i.codigo);
      if (p && proveedorDe(p) !== "distrimay") {
        items.push({ codigo: i.codigo, cantidad: i.cantidad });
        continue;
      }
      const eq = EQUIVALENTES[i.codigo];
      if (eq && vendible(eq)) {
        const ya = items.find((x) => x.codigo === eq);
        if (ya) ya.cantidad += i.cantidad;
        else items.push({ codigo: eq, cantidad: i.cantidad });
        cambios.push(`${p?.producto ?? i.codigo} → ${porCodigo.get(eq)?.producto}`);
      } else cambios.push(`sale ${p?.producto ?? i.codigo}`);
    }
    const desactivar = items.length < 2;
    return { id: c.id, slug: c.slug, nombre: c.nombre, cambios, quedan: items.length, desactivar, items };
  });

  if (aplicar) {
    await prisma.product.updateMany({ where: { codigo: { in: aOcultar.map((p) => p.codigo) } }, data: { visible: false, ocultoMotivo: MOTIVO } });
    for (const c of planCombos.filter((x) => x.cambios.length)) {
      await prisma.$transaction(async (tx) => {
        if (c.desactivar) {
          await tx.combo.update({ where: { id: c.id }, data: { activo: false } });
          return;
        }
        await tx.comboItem.deleteMany({ where: { comboId: c.id } });
        await tx.comboItem.createMany({ data: c.items.map((i) => ({ comboId: c.id, codigo: i.codigo, cantidad: i.cantidad })) });
      });
    }
    revalidatePath("/", "layout");
  }

  return NextResponse.json({
    aplicado: aplicar,
    ocultos: aOcultar.length,
    quedanVisibles: productos.filter((p) => p.visible && proveedorDe(p) !== "distrimay").length,
    combos: planCombos.filter((c) => c.cambios.length).map(({ slug, cambios, quedan, desactivar }) => ({ slug, cambios, quedan, desactivar })),
  });
}
