import { prisma } from "./prisma";
import { leerTabla } from "./envios/tabla";

export async function leerConfig() {
  const s = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return {
    compraMinima: Number(s.compraMinima),
    margenMinimoPct: Number(s.margenMinimoPct),
    descuentoTransferenciaPct: Number(s.descuentoTransferenciaPct),
    recargoSugeridoPct: Number(s.recargoSugeridoPct),
    comisionPagoPct: Number(s.comisionPagoPct),
    costoPackaging: Number(s.costoPackaging),
    envioGratisDesde: s.envioGratisDesde === null ? null : Number(s.envioGratisDesde),
    whatsapp: s.whatsapp,
    emailContacto: s.emailContacto,
    transferenciaDatos: s.transferenciaDatos,
    cpOrigen: s.cpOrigen,
    entregaPropiaActiva: s.entregaPropiaActiva,
    cpEntregaPropia: s.cpEntregaPropia,
    tabla: leerTabla(s.tablaEnvios),
    tablaEnviosRevisada: s.tablaEnviosRevisada,
  };
}

export type Config = Awaited<ReturnType<typeof leerConfig>>;
