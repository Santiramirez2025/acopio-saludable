// Corrige costos (y si se pide, precio o nombre) de productos ya cargados, sin tocar nada más.
// POST { items: [{ codigo, costo?, precioPublico?, producto?, visible? }] }. Registra el cambio en el historial.
// `visible:false` oculta un producto (p. ej. un duplicado) sin borrarlo; `visible:true` lo vuelve a mostrar.

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { margenPct } from "@/lib/precios";
import { COMBOS_PROVEEDORES, PRODUCTOS_PROVEEDORES, fotoCombo, precioDe } from "@/lib/catalogo-proveedores";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { items?: { codigo?: string; costo?: number; precioPublico?: number; producto?: string; crear?: boolean; fotoDe?: string; visible?: boolean }[] };
  const salida: Record<string, unknown> = {};
  // Descuento de un combo: { combos: [{ slug, descuentoPct }] }. Sirve para mantener el precio del combo cuando sube un producto.
  for (const c of ((b as { combos?: { slug?: string; descuentoPct?: number; crear?: boolean }[] }).combos ?? []).slice(0, 20)) {
    const slug = String(c.slug ?? "");
    const pct = Number(c.descuentoPct);
    if (!slug || !Number.isFinite(pct) || pct < 0 || pct > 60) { salida[`combo:${slug}`] = "descuento inválido"; continue; }
    // Un combo del catálogo propio que todavía no existe: se crea desde la definición, con sus productos.
    const existente = c.crear ? await prisma.combo.findUnique({ where: { slug }, include: { items: true } }) : null;
    if (c.crear && (!existente || !existente.items.length)) {
      const d = COMBOS_PROVEEDORES.find((x) => x.slug === slug);
      if (!d) { salida[`combo:${slug}`] = "no está en el catálogo propio"; continue; }
      const faltan = (await prisma.product.findMany({ where: { codigo: { in: d.items.map((i) => i.codigo) } }, select: { codigo: true } })).map((p) => p.codigo);
      const sinCargar = d.items.filter((i) => !faltan.includes(i.codigo)).map((i) => i.codigo);
      if (sinCargar.length) { salida[`combo:${slug}`] = `faltan cargar los productos: ${sinCargar.join(", ")} (mandalos en items con crear:true)`; continue; }
      const combo = existente ?? (await prisma.combo.create({ data: { slug, nombre: d.nombre, tipo: "COMBO", descuentoPct: pct, activo: true, destacado: Boolean(d.destacado), fotoUrl: fotoCombo(slug) } }));
      await prisma.comboItem.createMany({ data: d.items.map((i) => ({ comboId: combo.id, codigo: i.codigo, cantidad: i.cantidad })) });
      salida[`combo:${slug}`] = { creado: true, descuentoPct: pct };
      continue;
    }
    const r = await prisma.combo.updateMany({ where: { slug }, data: { descuentoPct: pct } });
    salida[`combo:${slug}`] = r.count ? { descuentoPct: pct } : "no existe";
  }
  for (const it of (b.items ?? []).slice(0, 100)) {
    const codigo = String(it.codigo ?? "");
    let previo = await prisma.product.findUnique({ where: { codigo } });
    // Un producto del catálogo propio que todavía no está cargado: se crea desde la definición (foto copiada de `fotoDe`).
    if (!previo && it.crear) {
      const d = PRODUCTOS_PROVEEDORES.find((p) => p.codigo === codigo);
      if (!d) { salida[codigo] = "no está en el catálogo propio"; continue; }
      const modelo = it.fotoDe ? await prisma.product.findUnique({ where: { codigo: String(it.fotoDe) } }) : null;
      const precio = precioDe(d);
      previo = await prisma.product.create({
        data: {
          codigo, producto: d.producto, marca: d.marca, presentacion: d.presentacion, categoria: d.categoria, formato: "Fraccionado",
          costo: d.costo, precioPublico: precio, margenPct: margenPct(precio, d.costo), contenido: d.contenido, unidad: d.unidad, pesoBrutoG: d.pesoBrutoG ?? null,
          pesoEstimado: false, estado: "ACTIVO", visible: true, nichos: d.nichos ?? [], objetivos: d.objetivos ?? [], porQueLoElegimos: d.porQueLoElegimos ?? null,
          fotoUrl: modelo?.fotoUrl ?? null, fotos: modelo?.fotos ?? [],
        },
      });
      await prisma.priceHistory.create({ data: { codigo, costo: d.costo, precioPublico: precio, origen: "manual" } });
    }
    if (!previo) { salida[codigo] = "no existe"; continue; }
    const costo = Number.isFinite(it.costo) && Number(it.costo) >= 0 ? Number(it.costo) : Number(previo.costo);
    const precioPublico = Number.isFinite(it.precioPublico) && Number(it.precioPublico) > 0 ? Number(it.precioPublico) : Number(previo.precioPublico);
    const producto = typeof it.producto === "string" && it.producto.trim() ? it.producto.trim().slice(0, 120) : previo.producto;
    await prisma.$transaction([
      prisma.product.update({
        where: { codigo },
        data: {
          costo, precioPublico, producto, margenPct: margenPct(precioPublico, costo),
          ...(typeof it.visible === "boolean" ? { visible: it.visible, ocultoMotivo: it.visible ? null : "Duplicado u oculto por compras" } : {}),
        },
      }),
      ...(costo !== Number(previo.costo) || precioPublico !== Number(previo.precioPublico)
        ? [prisma.priceHistory.create({ data: { codigo, costo, precioPublico, origen: "manual" } })]
        : []),
    ]);
    salida[codigo] = { costo: [Number(previo.costo), costo], precio: [Number(previo.precioPublico), precioPublico], margen: margenPct(precioPublico, costo), ...(typeof it.visible === "boolean" ? { visible: it.visible } : {}) };
  }
  // Que la tienda y el bot muestren enseguida el precio nuevo (y no el de la página cacheada).
  revalidatePath("/", "layout");
  return NextResponse.json(salida);
}
