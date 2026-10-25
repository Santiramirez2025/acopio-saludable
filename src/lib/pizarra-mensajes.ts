// Pizarra de mensajes: todo lo que entra por WhatsApp, Messenger e Instagram, en vivo, para la oficina y la TV.
// Arriba lo que espera a Santiago; después lo que está por cobrarse o cerrarse; después lo que atiende el bot.
import { etapaDe, teEspera, type Etapa } from "./bandeja";

export type CharlaPizarra = {
  clave: string;
  nombre: string | null;
  estado: "bot" | "persona";
  noLeidos: number;
  ultimo: Date;
  etapa: Etapa;
  espera: boolean;
  pedido: string | null;
  anuncio: string | null;
  mensajes: { de: "cliente" | "bot" | "persona"; texto: string; fecha: Date }[];
  ventanaCerrada: boolean;
};

export type PizarraMensajes = { charlas: CharlaPizarra[]; hoy: number; esperan: number; sinLeer: number; actualizado: string };

const ORDEN: Record<Etapa, number> = { cobrar: 1, cerrar: 2, consulta: 3, cliente: 4, negocio: 5, fria: 6 };

export async function pizarraMensajes(horas = 48, max = 18): Promise<PizarraMensajes> {
  const { listarConversaciones, mensajesDe } = await import("./whatsapp-memoria");
  const ahora = new Date();
  const todas = await listarConversaciones(120);
  const recientes = todas.filter((c) => ahora.getTime() - new Date(c.ultimoMensaje).getTime() < horas * 3_600_000 && !c.baja);
  const elegidas = recientes
    .map((c) => ({ c, etapa: etapaDe(c, ahora), espera: teEspera(c) }))
    .sort((a, b) => Number(b.espera) - Number(a.espera) || ORDEN[a.etapa] - ORDEN[b.etapa] || +new Date(b.c.ultimoMensaje) - +new Date(a.c.ultimoMensaje))
    .slice(0, max);
  const charlas = await Promise.all(
    elegidas.map(async ({ c, etapa, espera }) => {
      const ms = (await mensajesDe(c.telefono, 4)).reverse();
      const ultimoCliente = [...ms].reverse().find((m) => m.de === "cliente")?.fecha;
      return {
        clave: c.telefono,
        nombre: c.nombre,
        estado: c.estado,
        noLeidos: c.noLeidos,
        ultimo: new Date(c.ultimoMensaje),
        etapa,
        espera,
        pedido: c.pedido ?? null,
        anuncio: c.anuncioTitulo ?? null,
        mensajes: ms.map((m) => ({ de: m.de, texto: m.texto, fecha: new Date(m.fecha) })),
        ventanaCerrada: Boolean(ultimoCliente && ahora.getTime() - new Date(ultimoCliente).getTime() > 24 * 3_600_000),
      } satisfies CharlaPizarra;
    }),
  );
  const dia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
  return {
    charlas,
    hoy: recientes.filter((c) => dia(new Date(c.ultimoMensaje)) === dia(ahora)).length,
    esperan: recientes.filter((c) => teEspera(c)).length,
    sinLeer: recientes.reduce((s, c) => s + c.noLeidos, 0),
    actualizado: ahora.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Cordoba", hour: "2-digit", minute: "2-digit" }),
  };
}
