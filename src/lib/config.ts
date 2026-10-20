import { prisma } from "./prisma";
import { leerDiasCorte } from "./corte";
import { leerTabla } from "./envios/tabla";

export async function leerConfig() {
  const s = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  // Columna nueva (mínimo en zona propia): se lee aparte hasta que el cliente de Prisma la conozca.
  const propia = (s as { compraMinimaPropia?: unknown }).compraMinimaPropia ?? (await prisma.$queryRaw<{ v: unknown }[]>`SELECT "compraMinimaPropia" AS v FROM "Setting" WHERE "id" = 1`)[0]?.v;
  return {
    compraMinima: Number(s.compraMinima),
    compraMinimaPropia: Number(propia ?? s.compraMinima),
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
