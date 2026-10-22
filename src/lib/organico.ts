// Captación orgánica diaria, sin que Santiago haga nada.
//
// Cada mañana (cron): 1) mira qué pasó con los negocios ya contactados (contestaron, se interesaron,
// compraron), 2) escribe a unos pocos negocios nuevos eligiendo el rubro que más responde,
// 3) lee las charlas de ayer y saca lecciones concretas que entran a las instrucciones del vendedor,
// 4) le manda a Santiago un resumen de una pantalla.
//
// La lista de negocios se carga desde el panel (semilla de Google Maps) y se reabastece sola si hay
// GOOGLE_PLACES_KEY (búsqueda por rubro y localidad).

import { prisma } from "./prisma";
import { avisarSantiago } from "./avisos";
import { analizarCharlas } from "./aprendizaje";
import { estadoTexto } from "./salud";
import { enviarProspecto } from "./whatsapp-prospectos";
import { demanda, diasHasta, proximaTemporada, temporadaActual } from "./temporada";
import { bloqueLecciones, celular, elegirHoy, parecidas, POR_DIA, type Candidato, type Resultado } from "./organico-reglas";

const MODELO = process.env.VENDEDOR_MODELO || "claude-haiku-5-5";
const MAX_LECCIONES = 8;

export type Semilla = { telefono: string; negocio: string; rubro: string; localidad?: string | null; placeId?: string | null; rating?: number | null; resenas?: number | null };

/** Carga negocios a la lista (del panel o de Google). No pisa a los que ya están. */
export async function cargarSemilla(lista: Semilla[], origen = "semilla"): Promise<{ nuevos: number; descartados: number }> {
  let nuevos = 0;
  let descartados = 0;
  for (const s of lista.slice(0, 500)) {
    const tel = celular(s.telefono);
    const negocio = (s.negocio ?? "").trim().slice(0, 60);
    if (!tel || !negocio || !s.rubro) {
      descartados++;
      continue;
    }
    const n = await prisma.$executeRaw`
      INSERT INTO "Prospecto" ("telefono", "negocio", "rubro", "localidad", "placeId", "rating", "resenas", "origen")
      VALUES (${tel}, ${negocio}, ${s.rubro}, ${s.localidad ?? null}, ${s.placeId ?? null}, ${s.rating ?? null}, ${s.resenas ?? null}, ${origen})
      ON CONFLICT ("telefono") DO NOTHING`;
    if (n > 0) nuevos++;
    else descartados++;
  }
  return { nuevos, descartados };
}

/** Si hay clave de Google, busca negocios nuevos por rubro y localidad y los suma a la lista. */
export async function reabastecer(): Promise<number> {
  const clave = process.env.GOOGLE_PLACES_KEY;
  if (!clave) return 0;
  const [{ n }] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "Prospecto" WHERE "estado" = 'nuevo'`;
  if (Number(n) >= POR_DIA * 5) return 0; // todavía hay lista para una semana
  const busquedas = [
    ["dietética", "dietética Villa Carlos Paz"], ["dietética", "dietética Córdoba capital"], ["gimnasio", "gimnasio Villa Carlos Paz"],
    ["cafetería", "cafetería Villa Carlos Paz"], ["cafetería", "cafetería de especialidad Córdoba"], ["hotel", "hotel Villa Carlos Paz"],
    ["cabañas / complejo", "cabañas Villa Carlos Paz"], ["dietética", "dietética Cosquín La Falda"], ["dietética", "dietética Alta Gracia"],
  ];
  const semilla: Semilla[] = [];
  for (const [rubro, q] of busquedas) {
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "content-type": "application/json", "X-Goog-Api-Key": clave, "X-Goog-FieldMask": "places.id,places.displayName,places.nationalPhoneNumber,places.formattedAddress,places.rating,places.userRatingCount" },
        body: JSON.stringify({ textQuery: q, languageCode: "es", regionCode: "AR", pageSize: 20 }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const j = (await res.json()) as { places?: { id: string; displayName?: { text?: string }; nationalPhoneNumber?: string; formattedAddress?: string; rating?: number; userRatingCount?: number }[] };
      for (const p of j.places ?? []) {
        semilla.push({ telefono: p.nationalPhoneNumber ?? "", negocio: p.displayName?.text ?? "", rubro, localidad: (p.formattedAddress ?? "").split(",").slice(-3, -2)[0]?.trim() ?? null, placeId: p.id, rating: p.rating ?? null, resenas: p.userRatingCount ?? null });
      }
    } catch (e) {
      console.error("orgánico: Google falló", q, e);
    }
  }
  return (await cargarSemilla(semilla, "google")).nuevos;
}

/** Actualiza el estado de los contactados según lo que pasó en la charla. */
export async function medir(): Promise<{ respondieron: number; interesados: number; clientes: number }> {
  // Contestó: hay un mensaje del cliente después del envío.
  const r1 = await prisma.$executeRaw`
    UPDATE "Prospecto" p SET "estado" = 'respondio'
    WHERE p."estado" = 'enviado'
      AND EXISTS (SELECT 1 FROM "WhatsappMensaje" m WHERE m."telefono" = p."telefono" AND m."de" = 'cliente' AND m."fecha" > p."enviado")`;
  // Se interesó: tocó el botón de precios o pidió más.
  const r2 = await prisma.$executeRaw`
    UPDATE "Prospecto" p SET "estado" = 'interesado'
    WHERE p."estado" IN ('enviado', 'respondio')
      AND EXISTS (SELECT 1 FROM "WhatsappMensaje" m WHERE m."telefono" = p."telefono" AND m."de" = 'cliente' AND m."fecha" > p."enviado"
                  AND m."texto" ~* '(pasame|pas[aá] ?me|precios?|lista|muestra|dale|s[ií],?$|^s[ií]\\b|me interesa|cu[aá]nto)')`;
  const r3 = await prisma.$executeRaw`
    UPDATE "Prospecto" p SET "estado" = 'cliente'
    WHERE p."estado" IN ('enviado', 'respondio', 'interesado')
      AND EXISTS (SELECT 1 FROM "Order" o WHERE right(regexp_replace(o."telefono", '[^0-9]', '', 'g'), 10) = right(p."telefono", 10) AND o."createdAt" > p."enviado")`;
  await prisma.$executeRaw`
    UPDATE "Prospecto" p SET "estado" = 'baja'
    WHERE p."estado" <> 'baja' AND EXISTS (SELECT 1 FROM "WhatsappConversacion" c WHERE c."telefono" = p."telefono" AND c."baja")`;
  return { respondieron: r1, interesados: r2, clientes: r3 };
}

async function resultadosPorRubro(): Promise<Resultado[]> {
  const filas = await prisma.$queryRaw<{ rubro: string; enviados: bigint; respondieron: bigint }[]>`
    SELECT "rubro", count(*) FILTER (WHERE "estado" <> 'nuevo' AND "estado" <> 'fallo') AS enviados,
           count(*) FILTER (WHERE "estado" IN ('respondio', 'interesado', 'cliente')) AS respondieron
    FROM "Prospecto" GROUP BY "rubro"`;
  return filas.map((f) => ({ rubro: f.rubro, enviados: Number(f.enviados), respondieron: Number(f.respondieron) }));
}

/** Escribe a los negocios de hoy. */
export async function contactar(cantidad = POR_DIA): Promise<{ enviados: { negocio: string; rubro: string }[]; fallidos: number }> {
  const candidatos = await prisma.$queryRaw<Candidato[]>`
    SELECT p."telefono", p."negocio", p."rubro", p."localidad", p."rating", p."resenas" FROM "Prospecto" p
    WHERE p."estado" = 'nuevo'
      AND NOT EXISTS (SELECT 1 FROM "WhatsappConversacion" c WHERE c."telefono" = p."telefono" AND (c."contactado" IS NOT NULL OR c."baja"))
    LIMIT 400`;
  const elegidos = elegirHoy(candidatos, await resultadosPorRubro(), cantidad);
  const enviados: { negocio: string; rubro: string }[] = [];
  let fallidos = 0;
  for (const c of elegidos) {
    const r = await enviarProspecto(c.telefono, c.negocio, c.rubro);
    if (r.ok) {
      await prisma.$executeRaw`UPDATE "Prospecto" SET "estado" = 'enviado', "enviado" = now(), "motivo" = NULL WHERE "telefono" = ${c.telefono}`;
      enviados.push({ negocio: c.negocio, rubro: c.rubro });
    } else {
      await prisma.$executeRaw`UPDATE "Prospecto" SET "estado" = 'fallo', "motivo" = ${r.motivo ?? "error"} WHERE "telefono" = ${c.telefono}`;
      fallidos++;
    }
    await new Promise((r) => setTimeout(r, 1500)); // sin ráfagas: Meta mira el ritmo
  }
  return { enviados, fallidos };
}

export type Leccion = { texto: string; evidencia: string | null };

/** Lecciones activas, para el vendedor. */
export async function leccionesActivas(canal = "vendedor"): Promise<Leccion[]> {
  return prisma.$queryRaw<Leccion[]>`SELECT "texto", "evidencia" FROM "Aprendizaje" WHERE "activo" AND "canal" = ${canal} ORDER BY "fecha" DESC LIMIT ${MAX_LECCIONES}`;
}

let cacheLecciones: { texto: string; hasta: number } | null = null;
/** Para las instrucciones del vendedor: el bloque de lecciones, con caché de 10 minutos para no ir a la base en cada mensaje. */
export async function bloqueLeccionesVendedor(): Promise<string> {
  if (cacheLecciones && cacheLecciones.hasta > Date.now()) return cacheLecciones.texto;
  const texto = bloqueLecciones(await leccionesActivas().catch(() => []));
  cacheLecciones = { texto, hasta: Date.now() + 10 * 60_000 };
  return texto;
}

/** Lee las charlas de ayer y saca hasta 3 lecciones nuevas, concretas, que no repitan las que ya tiene. */
export async function aprender(): Promise<Leccion[]> {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return [];
  const a = await analizarCharlas(1);
  const conMovimiento = a.charlas.filter((c) => c.mensajesCliente >= 2);
  if (conMovimiento.length < 3) return [];
  const previas = await leccionesActivas();
  const rubros = await resultadosPorRubro();
  const compraron = conMovimiento.filter((c) => c.etapa === "compró");
  const perdidas = conMovimiento.filter((c) => c.etapa !== "compró" && !c.enManosDePersona).slice(0, 25);
  const material = [
    `Embudo de ayer: ${a.embudo.charlas} charlas, ${a.embudo.soloUnMensaje} de un solo mensaje, ${a.embudo.oferta} con oferta, ${a.embudo.pedidoArmado} con pedido armado, ${a.embudo.fueAPagar} fueron a pagar, ${a.embudo.compraron} compraron.`,
    `Prospección a negocios por rubro: ${rubros.map((r) => `${r.rubro} ${r.respondieron}/${r.enviados}`).join(", ") || "sin datos"}.`,
    "",
    "CHARLAS QUE COMPRARON:",
    ...compraron.slice(0, 8).map((c) => `• ${c.quien} (${c.anuncio ?? "sin anuncio"}): ${c.charla.join(" | ")}`),
    "",
    "CHARLAS QUE SE PERDIERON (tenían interés y no cerraron):",
    ...perdidas.map((c) => `• ${c.quien} (${c.anuncio ?? "sin anuncio"}, llegó a «${c.etapa}»): ${c.charla.join(" | ")}`),
    "",
    "LECCIONES QUE YA TIENE EL VENDEDOR (no las repitas):",
    ...previas.map((l) => `- ${l.texto}`),
  ].join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 700,
      system:
        "Sos el entrenador de un vendedor por WhatsApp de Acopio Saludable (frutos secos y mixes, Villa Carlos Paz; entrega sin cargo y pago al recibir en la zona; combos como la Despensa de 4 kilos). " +
        "Leés las charlas de ayer y sacás lecciones CONCRETAS y ACCIONABLES para que el vendedor venda más mañana: qué frase o movida hizo comprar, en qué momento exacto se perdieron las charlas y qué tendría que haber dicho. " +
        "Nada genérico («sé amable», «hacé seguimiento»): cada lección es una regla que se puede aplicar en el próximo mensaje, en rioplatense, de vos, máximo 30 palabras, con la evidencia en pocas palabras (cuántas charlas lo muestran). " +
        "Si ayer no hubo nada claro, devolvé lista vacía: una lección mala es peor que ninguna. Respondé SOLO JSON: {\"lecciones\":[{\"texto\":\"...\",\"evidencia\":\"...\"}]} con 0 a 3 lecciones.",
      messages: [{ role: "user", content: material.slice(0, 60_000) }],
    }),
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("orgánico: aprender falló", res?.status);
    return [];
  }
  const j = (await res.json()) as { content?: { text?: string }[] };
  const txt = (j.content ?? []).map((b) => b.text ?? "").join("");
  let lecciones: Leccion[] = [];
  try {
    const m = /\{[\s\S]*\}/.exec(txt);
    lecciones = (JSON.parse(m ? m[0] : txt).lecciones ?? []) as Leccion[];
  } catch {
    return [];
  }
  const nuevas: Leccion[] = [];
  for (const l of lecciones.slice(0, 3)) {
    const texto = String(l.texto ?? "").trim().slice(0, 240);
    if (texto.length < 15 || previas.some((p) => parecidas(p.texto, texto)) || nuevas.some((p) => parecidas(p.texto, texto))) continue;
    const evidencia = l.evidencia ? String(l.evidencia).slice(0, 120) : null;
    await prisma.$executeRaw`INSERT INTO "Aprendizaje" ("canal", "texto", "evidencia") VALUES ('vendedor', ${texto}, ${evidencia})`;
    nuevas.push({ texto, evidencia });
  }
  // Las más viejas salen: el vendedor lee como mucho MAX_LECCIONES, y lo que no se renovó ya está en las reglas.
  await prisma.$executeRaw`
    UPDATE "Aprendizaje" SET "activo" = false WHERE "canal" = 'vendedor' AND "activo"
      AND "id" NOT IN (SELECT "id" FROM "Aprendizaje" WHERE "canal" = 'vendedor' AND "activo" ORDER BY "fecha" DESC LIMIT ${MAX_LECCIONES})`;
  cacheLecciones = null;
  return nuevas;
}

export type Corrida = { medido: Awaited<ReturnType<typeof medir>>; reabastecidos: number; contactados: { negocio: string; rubro: string }[]; fallidos: number; lecciones: Leccion[]; rubros: Resultado[] };

/** La corrida diaria completa. */
export async function correrOrganico(opciones: { avisar?: boolean; cantidad?: number } = {}): Promise<Corrida> {
  const medido = await medir();
  const reabastecidos = await reabastecer().catch(() => 0);
  const { enviados, fallidos } = await contactar(opciones.cantidad);
  const lecciones = await aprender().catch((e) => {
    console.error("orgánico: aprender", e);
    return [] as Leccion[];
  });
  const rubros = await resultadosPorRubro();
  const [{ n: quedan }] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "Prospecto" WHERE "estado" = 'nuevo'`;
  // Lo que más pide la gente esta semana (de los mensajes de clientes) y la fecha que se viene.
  const textos = await prisma.$queryRaw<{ texto: string }[]>`SELECT "texto" FROM "WhatsappMensaje" WHERE "de" = 'cliente' AND "fecha" > now() - interval '7 days' LIMIT 5000`;
  const pedido = demanda(textos.map((t) => t.texto)).slice(0, 6);
  const temp = temporadaActual();
  const prox = proximaTemporada();
  const sistema = await estadoTexto().catch(() => "");
  if (opciones.avisar !== false) {
    const texto = [
      `🌱 Captación de hoy`,
      enviados.length ? `Escribimos a ${enviados.length} negocios: ${enviados.map((e) => `${e.negocio} (${e.rubro})`).join(", ")}.` : "Hoy no se escribió a ningún negocio nuevo (lista vacía o Meta rechazó).",
      fallidos ? `${fallidos} números no tenían WhatsApp.` : "",
      `Desde ayer: ${medido.respondieron} contestaron, ${medido.interesados} pidieron precios, ${medido.clientes} compraron.`,
      `Qué rubro responde: ${rubros.filter((r) => r.enviados).map((r) => `${r.rubro} ${r.respondieron}/${r.enviados}`).join(" · ") || "todavía sin datos"}.`,
      pedido.length ? `Lo más pedido esta semana: ${pedido.map((p) => `${p.que} (${p.veces})`).join(", ")}.` : "",
      temp ? `🎄 Temporada: ${temp.nombre}${diasHasta(temp) > 0 ? `, faltan ${diasHasta(temp)} días` : ""}. Combos destacados en la tienda y el vendedor los ofrece primero.` : "",
      prox && prox.empiezaEn <= 21 ? `📅 En ${prox.empiezaEn} días empieza ${prox.t.nombre}: hay que preparar combos y contenido.` : "",
      lecciones.length ? `Lecciones nuevas para el vendedor:\n${lecciones.map((l) => `• ${l.texto}`).join("\n")}` : "Sin lecciones nuevas (ayer no hubo un patrón claro).",
      sistema ? `Tareas automáticas (última corrida):\n${sistema}` : "",
      Number(quedan) < POR_DIA * 2 ? `⚠️ Quedan ${quedan} negocios en la lista: cargá más o poné GOOGLE_PLACES_KEY para que se reabastezca sola.` : "",
    ].filter(Boolean).join("\n");
    await avisarSantiago("Captación de hoy", texto);
  }
  return { medido, reabastecidos, contactados: enviados, fallidos, lecciones, rubros };
}
