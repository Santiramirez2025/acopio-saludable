import { prisma } from "./prisma";

export async function leerConfig() {
  const s = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return {
    compraMinima: Number(s.compraMinima),
    margenMinimoPct: Number(s.margenMinimoPct),
    descuentoTransferenciaPct: Number(s.descuentoTransferenciaPct),
    comisionPagoPct: Number(s.comisionPagoPct),
    costoPackaging: Number(s.costoPackaging),
    envioGratisDesde: s.envioGratisDesde === null ? null : Number(s.envioGratisDesde),
  };
}
