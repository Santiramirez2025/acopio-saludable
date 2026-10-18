import { prisma } from "@/lib/prisma";
import { codigoAmigo } from "@/lib/repetir";
import { PCT_RECOMENDACION, codigoDeOrigen, emailClave, marcaPremio, premiosUsados, telefonoClave } from "@/lib/recomendacion";

export type Beneficio = { pct: number; tipo: "bienvenida" | "premio" | null; texto: string | null; marca: string | null };

const NINGUNO: Beneficio = { pct: 0, tipo: null, texto: null, marca: null };
const VALIDOS = ["PAGADO", "EN_COMPRA", "PREPARADO", "ENVIADO", "ENTREGADO"];

type Fila = { id: number; token: string; telefono: string; email: string; estado: string; origen: string | null };

/**
 * Qué beneficio por recomendación tiene esta persona en el pedido que está por hacer.
 * - Premio: ya compró antes y algún amigo compró con su link (pedido pagado o entregado) sin premio usado.
 * - Bienvenida: es su primera compra y llegó con el link de otra persona.
 * Nunca se suman: quien ya compró no tiene bienvenida.
 */
export async function beneficioRecomendacion(a: { telefono?: string; email?: string; origen?: string | null }): Promise<Beneficio> {
  const tel = telefonoClave(a.telefono);
  const mail = emailClave(a.email);
  if (tel.length < 8 && !mail.includes("@")) return NINGUNO;
  const filas = await prisma.$queryRaw<Fila[]>`SELECT "id", "token", "telefono", "email", "estado"::text AS "estado", "origen" FROM "Order" WHERE "estado"::text <> 'CANCELADO'`;
  const esSuyo = (f: Fila) => (tel.length >= 8 && telefonoClave(f.telefono) === tel) || (mail.includes("@") && emailClave(f.email) === mail);
  const suyos = filas.filter(esSuyo);

  if (suyos.length) {
    const codigos = new Set(suyos.map((f) => codigoAmigo(f.token)));
    const usados = premiosUsados(suyos.map((f) => f.origen));
    const amigo = filas.find((f) => !esSuyo(f) && VALIDOS.includes(f.estado) && codigos.has(codigoDeOrigen(f.origen) ?? "") && !usados.has(f.id));
    return amigo
      ? { pct: PCT_RECOMENDACION, tipo: "premio", texto: `Premio por recomendar (${PCT_RECOMENDACION}%)`, marca: marcaPremio(amigo.id) }
      : NINGUNO;
  }

  const codigo = codigoDeOrigen(a.origen);
  if (!codigo) return NINGUNO;
  const recomendo = filas.some((f) => codigoAmigo(f.token) === codigo);
  return recomendo ? { pct: PCT_RECOMENDACION, tipo: "bienvenida", texto: `Bienvenida por recomendación (${PCT_RECOMENDACION}%)`, marca: "bienvenida-amigo" } : NINGUNO;
}
