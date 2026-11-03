import { prisma } from "./prisma";
import { leerDiasCorte } from "./corte";
import { leerTabla } from "./envios/tabla";

export async function leerConfig() {
  const s = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  // Columna nueva (mínimo en zona propia): se lee aparte hasta que el cliente de Prisma la conozca.
  const nuevas = s as { compraMinimaPropia?: unknown; envioBajoMinimo?: unknown };
  const [propia, bajoMinimo] =
    nuevas.compraMinimaPropia !== undefined && nuevas.envioBajoMinimo !== undefined
      ? [nuevas.compraMinimaPropia, nuevas.envioBajoMinimo]
      : await prisma.$queryRaw<{ propia: unknown; bajo: unknown }[]>`SELECT "compraMinimaPropia" AS propia, "envioBajoMinimo" AS bajo FROM "Setting" WHERE "id" = 1`.then((r) => [r[0]?.propia, r[0]?.bajo]);
  return {
    compraMinima: Number(s.compraMinima),
    compraMinimaPropia: Number(propia ?? s.compraMinima),
    // Envío fijo en la zona propia por debajo del mínimo; 0 = mínimo obligatorio (comportamiento anterior).
    envioBajoMinimo: Math.max(0, Number(bajoMinimo ?? 0) || 0),
    margenMinimoPct: Number(s.margenMinimoPct),
    descuentoTransferenciaPct: Number(s.descuentoTransferenciaPct),
    recargoPrecioPct: Number(s.recargoPrecioPct),
    recargoSugeridoPct: Number(s.recargoSugeridoPct),
    corteDias: leerDiasCorte(s.corteDias),
    corteHora: s.corteHora,
    comisionPagoPct: Number(s.comisionPagoPct),
    costoPackaging: Number(s.costoPackaging),
    envioGratisDesde: s.envioGratisDesde === null ? null : Number(s.envioGratisDesde),
    whatsapp: s.whatsapp,
    emailContacto: s.emailContacto,
    transferenciaDatos: s.transferenciaDatos,
    cpOrigen: s.cpOrigen,
    entregaPropiaActiva: s.entregaPropiaActiva,
    plazoEntregaPropia: s.plazoEntregaPropia,
    cpEntregaPropia: s.cpEntregaPropia,
    tabla: leerTabla(s.tablaEnvios),
    tablaEnviosRevisada: s.tablaEnviosRevisada,
  };
}

export type Config = Awaited<ReturnType<typeof leerConfig>>;
