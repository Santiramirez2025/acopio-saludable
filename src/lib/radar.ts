// Radar de Instagram: lo puro (sin red ni base).
//
// Vigila publicaciones de cuentas grandes de la zona (noticias, turismo, gastronomía) y avisa
// a Santiago por WhatsApp apenas publican, con un comentario listo para pegar. Comentar en los
// primeros minutos de un post grande es lo que más visibilidad orgánica da. El comentario lo
// publica Santiago desde su celular: Instagram castiga que lo haga un programa.

export type Publicacion = { id: string; username: string; seguidores: number | null; caption: string; permalink: string; timestamp: string; likes: number | null; comentarios: number | null };

/** Ventana en la que vale la pena comentar: después el post ya juntó los comentarios de arriba. */
export const VENTANA_MIN = 45;
/** Avisos por día como máximo, para que sean pocos y valgan la pena. */
export const TOPE_DIA = 10;

/** Horario de avisos en Argentina: de 9 a 22. */
export function enHorario(ahora = new Date()): boolean {
  const h = Number(ahora.toLocaleString("en-US", { timeZone: "America/Argentina/Cordoba", hour: "numeric", hour12: false }));
  return h >= 9 && h < 22;
}

export function minutosDesde(ts: string, ahora = new Date()): number {
  return (ahora.getTime() - new Date(ts).getTime()) / 60_000;
}

/** Las publicaciones nuevas que todavía están en la ventana, de la más reciente a la más vieja. */
export function nuevas(pubs: Publicacion[], vistos: Set<string>, ahora = new Date()): Publicacion[] {
  return pubs.filter((p) => !vistos.has(p.id) && minutosDesde(p.timestamp, ahora) >= 0 && minutosDesde(p.timestamp, ahora) <= VENTANA_MIN).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/** El aviso que le llega a Santiago. */
export function textoAviso(p: Publicacion, comentario: string, ahora = new Date()): string {
  const min = Math.max(1, Math.round(minutosDesde(p.timestamp, ahora)));
  const seg = p.seguidores ? ` (${p.seguidores >= 1000 ? `${Math.round(p.seguidores / 100) / 10} mil` : p.seguidores} seguidores)` : "";
  return [
    `🎯 Momento para comentar: @${p.username}${seg} publicó hace ${min} min.`,
    p.caption ? `«${p.caption.replace(/\s+/g, " ").slice(0, 140)}${p.caption.length > 140 ? "…" : ""}»` : "",
    "",
    "Copiá y comentá desde @acopio.saludable:",
    comentario,
    "",
    p.permalink,
  ].filter((l, i) => l || i === 2 || i === 5).join("\n");
}

/** Instrucciones para escribir el comentario. */
export function pedidoComentario(p: Publicacion): string {
  return [
    "Escribí UN comentario de Instagram para que lo publique la cuenta @acopio.saludable (dietética online de Villa Carlos Paz: frutos secos, despensa y combos con entrega a domicilio) en esta publicación de otra cuenta.",
    "Reglas: español rioplatense, una o dos frases, máximo 180 caracteres, cálido y genuino, que aporte algo al tema del post (un dato, una opinión, un buen deseo, una pregunta). Nada de vender ni de «seguinos», sin hashtags y con a lo sumo un emoji. Respondé solo NO_COMENTAR si el post es de una tragedia, un accidente o algo triste; si es algo personal o familiar (un cumpleaños, hijos, chicos, una fiesta privada, un bebé); o si es política o polémica. Una marca comentando la vida privada de alguien queda mal.",
    `Cuenta: @${p.username}`,
    `Publicación: ${p.caption.slice(0, 1200) || "(sin texto)"}`,
    "Devolvé solo el comentario, sin comillas.",
  ].join("\n");
}
