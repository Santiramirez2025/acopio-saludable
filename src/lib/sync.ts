import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Prisma, PriceSyncItem } from "@prisma/client";
import { prisma } from "./prisma";
import { margenPct } from "./precios";
import { clasificarNichos, clasificarObjetivos, detectarUnidad, motivoOculto } from "./clasificar";
import { urlsDesdeCampoPhotos } from "./fotos";
import { calcularDiff, sanearEntrantes, type Entrante } from "./sync-diff";

const ZONA = "America/Argentina/Cordoba";
export const diaLocal = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: ZONA }); // AAAA-MM-DD

/** ¿Ya se sincronizó hoy (hora de Córdoba)? Mientras no, el panel muestra el aviso. */
export async function sincronizadoHoy(): Promise<boolean> {
  const ultima = await prisma.priceSync.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  return !!ultima && diaLocal(ultima.createdAt) === diaLocal(new Date());
}

// ---------- Token del marcador ----------

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Genera un token nuevo (invalida el anterior). Se guarda solo el hash; el token en claro se muestra una vez. */
export async function generarTokenSync(): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await prisma.setting.update({ where: { id: 1 }, data: { syncTokenHash: hash(token) } });
  return token;
}

export async function tokenSyncValido(token: string | null): Promise<boolean> {
  if (!token) return false;
  const cfg = await prisma.setting.findUnique({ where: { id: 1 }, select: { syncTokenHash: true } });
  if (!cfg?.syncTokenHash) return false;
  const a = Buffer.from(hash(token));
  const b = Buffer.from(cfg.syncTokenHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- Aplicación ----------

type Tx = Prisma.TransactionClient;

async function aplicarItem(tx: Tx, i: Pick<PriceSyncItem, "codigo" | "tipo" | "costoNuevo" | "precioNuevo">) {
  if (i.tipo === "CAMBIO") {
    const costo = Number(i.costoNuevo);
    const precioPublico = Number(i.precioNuevo);
    await tx.product.update({ where: { codigo: i.codigo }, data: { costo, precioPublico, margenPct: margenPct(precioPublico, costo) } });
    await tx.priceHistory.create({ data: { codigo: i.codigo, costo, precioPublico, origen: "sync" } });
  } else if (i.tipo === "DESAPARECIDO") {
    await tx.product.updateMany({ where: { codigo: i.codigo, estado: "ACTIVO" }, data: { estado: "SIN_STOCK" } });
  } else if (i.tipo === "REAPARECIDO") {
    await tx.product.updateMany({ where: { codigo: i.codigo, estado: "SIN_STOCK" }, data: { estado: "ACTIVO" } });
  }
}

async function crearNuevo(tx: Tx, e: Entrante, costo: number, precioPublico: number) {
  const datos = { producto: e.producto, presentacion: e.presentacion ?? "", categoria: e.categoria || "Sin categoría", formato: "Sin definir", contenido: null };
  const fotos = urlsDesdeCampoPhotos(e.fotos);
  const motivo = motivoOculto(datos);
  await tx.product.create({
    data: {
      codigo: e.codigo,
      ...datos,
      marca: "Sin definir",
      costo,
      precioPublico,
      margenPct: margenPct(precioPublico, costo),
      unidad: detectarUnidad(datos.presentacion, null),
      nichos: clasificarNichos(datos),
      objetivos: clasificarObjetivos(datos),
      estado: "BORRADOR", // los productos nuevos nunca se publican solos
      visible: motivo === null,
      ocultoMotivo: motivo,
      fotoUrl: fotos[0] ?? null,
      fotos,
    },
  });
  await tx.priceHistory.create({ data: { codigo: e.codigo, costo, precioPublico, origen: "sync" } });
}

export type ResumenSync = { id: number; recibidos: number; descartados: number; aplicados: number; pendientes: number; nuevos: number; desaparecidos: number; sinCambios: number; avisos: string[] };

/** Recibe una lectura de precios, calcula el diff, aplica lo que corresponde y deja pendiente el resto. */
export async function registrarSync(args: { origen: string; modo: unknown; completo: unknown; items: unknown }): Promise<ResumenSync> {
  const { items: entrantes, descartados } = sanearEntrantes(args.items);
  if (!entrantes.length) throw new Error("La actualización no trae productos válidos");
  const modo = entrantes.some((e) => e.costo !== null) ? "costos" : "publicos";
  const cfg = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const actuales = (await prisma.product.findMany({ select: { codigo: true, producto: true, costo: true, precioPublico: true, estado: true, fotoUrl: true } })).map((p) => ({
    ...p,
    costo: Number(p.costo),
    precioPublico: Number(p.precioPublico),
  }));
  const { items, avisos } = calcularDiff(actuales, entrantes, { umbralAutoPct: Number(cfg.umbralAutoPct), completo: args.completo === true });
  if (descartados) avisos.push(`${descartados} filas descartadas por código o precio inválido (o repetidas).`);
  const porCodigo = new Map(entrantes.map((e) => [e.codigo, e]));
  const sinFoto = new Set(actuales.filter((a) => !a.fotoUrl).map((a) => a.codigo));

  const sync = await prisma.$transaction(
    async (tx) => {
      const s = await tx.priceSync.create({ data: { origen: args.origen, modo, completo: args.completo === true, recibidos: entrantes.length, nota: avisos.join(" ") || null } });
      const ahora = new Date();
      for (const i of items) {
        if (i.estado === "APLICADO") {
          if (i.tipo === "NUEVO") await crearNuevo(tx, porCodigo.get(i.codigo)!, i.costoNuevo!, i.precioNuevo!);
          else await aplicarItem(tx, { codigo: i.codigo, tipo: i.tipo, costoNuevo: i.costoNuevo as never, precioNuevo: i.precioNuevo as never });
        }
      }
      if (items.length) await tx.priceSyncItem.createMany({ data: items.map((i) => ({ ...i, syncId: s.id, resueltoAt: i.estado === "APLICADO" ? ahora : null })) });
      // De paso: fotos para productos que no tenían.
      for (const e of entrantes) {
        if (!sinFoto.has(e.codigo)) continue;
        const fotos = urlsDesdeCampoPhotos(e.fotos);
        if (fotos.length) await tx.product.update({ where: { codigo: e.codigo }, data: { fotoUrl: fotos[0], fotos } });
      }
      return s;
    },
    { timeout: 120000, maxWait: 20000 },
  );
  const cuenta = (f: (i: (typeof items)[number]) => boolean) => items.filter(f).length;
  const conCambio = new Set(items.filter((i) => i.tipo !== "REAPARECIDO").map((i) => i.codigo));
  return {
    id: sync.id,
    recibidos: entrantes.length,
    descartados,
    aplicados: cuenta((i) => i.tipo === "CAMBIO" && i.estado === "APLICADO"),
    pendientes: cuenta((i) => i.estado === "PENDIENTE"),
    nuevos: cuenta((i) => i.tipo === "NUEVO"),
    desaparecidos: cuenta((i) => i.tipo === "DESAPARECIDO"),
    sinCambios: entrantes.filter((e) => !conCambio.has(e.codigo)).length,
    avisos,
  };
}

export function textoResumen(r: ResumenSync): string {
  return `${r.recibidos} productos leídos: ${r.aplicados} cambios aplicados, ${r.pendientes} esperan tu aprobación, ${r.nuevos} nuevos en borrador, ${r.desaparecidos} desaparecidos, ${r.sinCambios} sin cambios.`;
}

/** Aprueba o rechaza cambios pendientes. */
export async function resolverPendientes(syncId: number, ids: number[] | "todos", aprobar: boolean): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      const items = await tx.priceSyncItem.findMany({ where: { syncId, estado: "PENDIENTE", ...(ids === "todos" ? {} : { id: { in: ids } }) } });
      for (const i of items) {
        if (aprobar) {
          // Si el producto ya no existe (se borró a mano), el cambio se descarta en silencio.
          const existe = await tx.product.findUnique({ where: { codigo: i.codigo }, select: { codigo: true } });
          if (existe) await aplicarItem(tx, i);
        }
        await tx.priceSyncItem.update({ where: { id: i.id }, data: { estado: aprobar ? "APLICADO" : "RECHAZADO", resueltoAt: new Date() } });
      }
      return items.length;
    },
    { timeout: 120000, maxWait: 20000 },
  );
}
