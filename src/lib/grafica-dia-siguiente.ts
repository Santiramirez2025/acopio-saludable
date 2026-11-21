// Gráfica del día siguiente (Santiago, 21/11): «los clientes que no le vendimos, al día siguiente le mandamos una
// gráfica para ver si le vendemos otra cosa… no podemos dejar contactos en frío. Todos los de ayer que no vendimos,
// hoy le tenés que mandar una gráfica para venderles».
//
// A quién: escribió entre 10 y 23 h atrás (la ventana de 24 h de WhatsApp sigue abierta, así que va como foto con
// texto, sin plantilla), no compró, no está en manos de una persona, no dijo que no y no recibió ya esta gráfica.
// Qué: UN mensaje (foto con el texto abajo): la promo de la semana si hay; si no, el Trío. Una sola vez por persona
// por semana. Lo que pase después lo sigue el vendedor si contesta. La reactivación (20 h a 6 días, con plantilla)
// y el seguimiento de carritos no le escriben a quien ya recibió esta gráfica después de su último mensaje.

import { prisma } from "./prisma";
import { primerNombre } from "./whatsapp-interactivo";
import { enviarSaliente } from "./whatsapp-cloud";
import { leerPromo, promoVigente } from "./promo-semanal";
import { imagenCombo } from "./galeria";
import { urlSitio } from "./sitio";

const TOPE = 40;
// «Yo no pedí nada, hay un error» (Nilda, 20/11) también es un no.
const NO_QUIERE = /no ped[ií]|un error|me confund|no soy de|no estoy en la zona|no gracias|no,? gracias|no me interesa|no quiero|no me escrib|no me manden|dame de baja|baja|no estoy interesad|ya compr[eé]|equivocad/i;

type Candidato = { telefono: string; nombre: string | null; ultimo: string | null };

export async function candidatosGrafica(): Promise<Candidato[]> {
  const filas = await prisma.$queryRaw<Candidato[]>`
    SELECT c."telefono", c."nombre",
           (SELECT m."texto" FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente' ORDER BY m."fecha" DESC LIMIT 1) AS "ultimo"
    FROM "WhatsappConversacion" c
    WHERE c."baja" = false AND c."prospecto" IS NULL AND c."telefono" ~ '^[0-9]+$' AND c."estado" <> 'persona'
      AND (SELECT max(m."fecha") FROM "WhatsappMensaje" m WHERE m."telefono" = c."telefono" AND m."de" = 'cliente')
          BETWEEN now() - interval '23 hours' AND now() - interval '10 hours'
      -- No compró (ni tiene un pedido en curso) en los últimos 10 días.
      AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10) = right(c."telefono", 10)
                        AND o."estado" <> 'CANCELADO' AND (o."createdAt" > now() - interval '10 days' OR o."estado" <> 'ENTREGADO'))
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" n WHERE n."telefono" = c."telefono" AND n."id" LIKE 'promo-no.%')
      -- Esta gráfica, una vez por semana.
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" g WHERE g."telefono" = c."telefono" AND g."id" LIKE 'graf.%' AND g."fecha" > now() - interval '7 days')
      -- Si una persona del equipo le escribió en las últimas 12 h, la charla la lleva esa persona.
      AND NOT EXISTS (SELECT 1 FROM "WhatsappMensaje" h WHERE h."telefono" = c."telefono" AND h."de" = 'persona' AND h."fecha" > now() - interval '12 hours')
    ORDER BY c."ultimoMensaje" DESC
    LIMIT ${TOPE}`;
  return filas.filter((f: Candidato) => !NO_QUIERE.test(f.ultimo ?? ""));
}

export async function piezaDelDia(): Promise<{ url: string; texto: (nombre: string) => string; nombre: string } | null> {
  const promo = await leerPromo().catch(() => null);
  if (promo && promoVigente(promo) && promo.imagen) {
    return {
      url: promo.imagen,
      nombre: "promo de la semana",
      texto: (n) => `¡Hola${n ? ` ${n}` : ""}! Te escribe Nico, de Acopio 🙂 Te dejo la promo de la semana: ${promo.titulo}. En Carlos Paz te lo llevamos a tu casa y lo pagás cuando te llega. ¿Te guardo uno?`,
    };
  }
  const trio = imagenCombo("trio-de-frutos-secos");
  if (!trio) return null;
  return {
    url: `${urlSitio()}${trio}`,
    nombre: "Trío",
    texto: (n) => `¡Hola${n ? ` ${n}` : ""}! Te escribe Nico, de Acopio 🙂 El más pedido de la semana es el Trío: 1 kg de mix con cajú y girasol, 1 de dátiles y 1 de pasas, $24.000. En Carlos Paz te lo llevamos sin cargo y lo pagás cuando te llega. ¿Te lo anoto?`,
  };
}

export async function correrGraficaDiaSiguiente(opts: { simular?: boolean } = {}): Promise<{ enviados: string[]; fallidos: number; pieza?: string; candidatos?: number }> {
  const pieza = await piezaDelDia();
  const lista = await candidatosGrafica();
  if (!pieza) return { enviados: [], fallidos: 0, candidatos: lista.length };
  if (opts.simular) return { enviados: lista.map((c) => c.nombre ?? c.telefono.slice(-4)), fallidos: 0, pieza: pieza.nombre, candidatos: lista.length };
  const enviados: string[] = [];
  let fallidos = 0;
  for (const c of lista) {
    const texto = pieza.texto(primerNombre(c.nombre) ?? "");
    if (await enviarSaliente(c.telefono, { tipo: "imagen", url: pieza.url, pie: texto })) {
      const id = `graf.${c.telefono}.${Date.now()}`;
      await prisma.$executeRaw`INSERT INTO "WhatsappMensaje" ("id", "telefono", "de", "texto") VALUES (${id}, ${c.telefono}, 'bot', ${`[Foto] ${texto}`})`;
      enviados.push(c.nombre ?? c.telefono.slice(-4));
    } else fallidos++;
    await new Promise((r) => setTimeout(r, 400));
  }
  return { enviados, fallidos, pieza: pieza.nombre, candidatos: lista.length };
}
