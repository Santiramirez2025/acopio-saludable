// Aplica el catálogo de los proveedores nuevos: carga los productos de Todo Granolas y La Granja
// con su costo, rearma los combos con presentaciones de casa, apaga los combos rellenados con
// bolsones y saca de la vista pública los bolsones y lo que no es dietética.
//
// POST { aplicar?: boolean } — sin aplicar:true solo devuelve lo que haría.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { margenPct } from "@/lib/precios";
import { COMBOS_A_DESACTIVAR, COMBOS_PROVEEDORES, OCULTAR, OCULTOS_PROPIOS, PRODUCTOS_PROVEEDORES, fotoCombo, fotoProducto, precioDe } from "@/lib/catalogo-proveedores";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await getServerSession(authOptions))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { aplicar } = (await req.json().catch(() => ({}))) as { aplicar?: boolean };

  // Lo que se oculta: bolsones, fuera de rubro y la categoría Supermercado. Nunca lo que va en un combo nuevo.
  const activos = await prisma.comboItem.findMany({ where: { combo: { activo: true, slug: { notIn: COMBOS_A_DESACTIVAR } } }, select: { codigo: true } });
  const enCombos = new Set([...COMBOS_PROVEEDORES.flatMap((c) => c.items.map((i) => i.codigo)), ...activos.map((i) => i.codigo)]);
  const visibles = await prisma.product.findMany({ where: { visible: true }, select: { codigo: true, producto: true, presentacion: true, categoria: true } });
  const ocultar = visibles.filter(
    (p) => !enCombos.has(p.codigo) && (OCULTAR.presentacion.test(`${p.presentacion} ${p.producto}`) || OCULTAR.producto.test(p.producto) || OCULTAR.categorias.includes(p.categoria)),
  );

  const resumen = {
    productosNuevos: PRODUCTOS_PROVEEDORES.map((p) => ({ codigo: p.codigo, producto: `${p.producto} ${p.presentacion}`, costo: p.costo, precio: precioDe(p) })),
    combos: COMBOS_PROVEEDORES.map((c) => c.slug),
    combosApagados: COMBOS_A_DESACTIVAR,
    ocultar: ocultar.length,
    ejemplosOcultos: ocultar.slice(0, 15).map((p) => `${p.producto} ${p.presentacion}`),
  };
  if (!aplicar) return NextResponse.json({ prueba: true, ...resumen });

  for (const p of PRODUCTOS_PROVEEDORES) {
    const precio = precioDe(p);
    const datos = {
      producto: p.producto,
      marca: p.marca,
      presentacion: p.presentacion,
      categoria: p.categoria,
      formato: p.marca.startsWith("Sin marca") ? "Fraccionado" : "Envasado",
      costo: p.costo,
      precioPublico: precio,
      margenPct: margenPct(precio, p.costo),
      contenido: p.contenido,
      unidad: p.unidad,
      pesoBrutoG: p.pesoBrutoG ?? null,
      pesoEstimado: false,
      estado: "ACTIVO" as const,
      visible: true,
      ocultoMotivo: null,
      nichos: p.nichos ?? [],
      objetivos: p.objetivos ?? [],
      porQueLoElegimos: p.porQueLoElegimos ?? null,
    };
    const previo = await prisma.product.findUnique({ where: { codigo: p.codigo } });
    // La foto propia (generada con el estilo de los anuncios) manda; si no hay, queda la que tenía.
    const foto = fotoProducto(p.codigo) ?? previo?.fotoUrl ?? null;
    const oculto = OCULTOS_PROPIOS.includes(p.codigo);
    await prisma.product.upsert({
      where: { codigo: p.codigo },
      create: { codigo: p.codigo, ...datos, visible: !oculto, fotoUrl: foto, fotos: foto ? [foto] : [] },
      update: { ...datos, visible: !oculto, ocultoMotivo: oculto ? "Sin stock en el proveedor" : null, fotoUrl: foto, fotos: foto ? [foto] : previo?.fotos ?? [] },
    });
    if (!previo || Number(previo.costo) !== p.costo || Number(previo.precioPublico) !== precio) {
      await prisma.priceHistory.create({ data: { codigo: p.codigo, costo: p.costo, precioPublico: precio, origen: "proveedor" } });
    }
  }

  for (const c of COMBOS_PROVEEDORES) {
    const datos = { nombre: c.nombre, tipo: "COMBO" as const, descuentoPct: c.descuentoPct, activo: true, destacado: Boolean(c.destacado) };
    const combo = await prisma.combo.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...datos, fotoUrl: fotoCombo(c.slug) }, update: { ...datos, fotoUrl: fotoCombo(c.slug) } });
    await prisma.comboItem.deleteMany({ where: { comboId: combo.id } });
    await prisma.comboItem.createMany({ data: c.items.map((i) => ({ comboId: combo.id, codigo: i.codigo, cantidad: i.cantidad })) });
  }
  await prisma.combo.updateMany({ where: { slug: { in: COMBOS_A_DESACTIVAR } }, data: { activo: false } });
  await prisma.product.updateMany({ where: { codigo: { in: ocultar.map((p) => p.codigo) } }, data: { visible: false, ocultoMotivo: OCULTAR.motivo } });

  revalidatePath("/", "layout");
  return NextResponse.json({ aplicado: true, ...resumen });
}
