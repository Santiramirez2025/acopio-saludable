// Suma al catálogo solo los productos y combos que se le pasan (de catalogo-proveedores), sin tocar
// el resto: el ajuste completo vuelve a escribir costos que la lista de La Granja ya actualizó.
// Solo administrador. POST { codigos: string[], combos: string[], aplicar?: boolean }
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { margenPct } from "@/lib/precios";
import { COMBOS_PROVEEDORES, PRODUCTOS_PROVEEDORES, fotoCombo, fotoProducto, precioDe } from "@/lib/catalogo-proveedores";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { codigos?: string[]; combos?: string[]; aplicar?: boolean };
  const productos = PRODUCTOS_PROVEEDORES.filter((p) => b.codigos?.includes(p.codigo));
  const combos = COMBOS_PROVEEDORES.filter((c) => b.combos?.includes(c.slug));
  const plan = {
    productos: productos.map((p) => ({ codigo: p.codigo, producto: `${p.producto} ${p.presentacion}`, costo: p.costo, precio: precioDe(p) })),
    combos: combos.map((c) => ({
      slug: c.slug,
      precio: Math.round(
        c.items.reduce((s, i) => {
          const p = PRODUCTOS_PROVEEDORES.find((x) => x.codigo === i.codigo);
          return s + (p ? precioDe(p) * i.cantidad : 0);
        }, 0) * (1 - c.descuentoPct / 100),
      ),
    })),
  };
  if (!b.aplicar) return NextResponse.json({ prueba: true, ...plan });

  for (const p of productos) {
    const precio = precioDe(p);
    const foto = fotoProducto(p.codigo);
    const datos = {
      producto: p.producto, marca: p.marca, presentacion: p.presentacion, categoria: p.categoria,
      formato: p.marca.startsWith("Sin marca") ? "Fraccionado" : "Envasado",
      costo: p.costo, precioPublico: precio, margenPct: margenPct(precio, p.costo),
      contenido: p.contenido, unidad: p.unidad, pesoBrutoG: p.pesoBrutoG ?? null, pesoEstimado: false,
      estado: "ACTIVO" as const, visible: true, ocultoMotivo: null,
      nichos: p.nichos ?? [], objetivos: p.objetivos ?? [], porQueLoElegimos: p.porQueLoElegimos ?? null,
      fotoUrl: foto, fotos: foto ? [foto] : [],
    };
    await prisma.product.upsert({ where: { codigo: p.codigo }, create: { codigo: p.codigo, ...datos }, update: datos });
    await prisma.priceHistory.create({ data: { codigo: p.codigo, costo: p.costo, precioPublico: precio, origen: "proveedor" } });
  }
  for (const c of combos) {
    const datos = { nombre: c.nombre, tipo: "COMBO" as const, descuentoPct: c.descuentoPct, activo: true, destacado: Boolean(c.destacado), fotoUrl: fotoCombo(c.slug) };
    const combo = await prisma.combo.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...datos }, update: datos });
    await prisma.comboItem.deleteMany({ where: { comboId: combo.id } });
    await prisma.comboItem.createMany({ data: c.items.map((i) => ({ comboId: combo.id, codigo: i.codigo, cantidad: i.cantidad })) });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ aplicado: true, ...plan });
}
