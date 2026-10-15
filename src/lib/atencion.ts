// Atender un mensaje entrante, venga de WhatsApp, Messenger o Instagram.
//
// Los tres canales llegan por webhooks distintos pero se atienden igual: se guarda el mensaje
// (el id de Meta es clave primaria, así una reentrega no se contesta dos veces), se respeta si
// una persona tomó la charla o si el prospecto pidió la baja, y contesta el mismo vendedor.
// Lo único que cambia por canal es cómo se manda la respuesta.

import { detectar } from "./asistente";
import { buscarEnCatalogo } from "./asistente-catalogo";
import { responderComoVendedor, vendedorActivo } from "./vendedor";
import { enviarTexto, marcarLeido, paraWhatsapp } from "./whatsapp-cloud";
import { canalDe, enviarMeta, marcarVistoMeta } from "./meta-mensajes";
import { cambiarEstado, estadoDe, historialDe, registrarAnuncio, registrarEntrante, registrarSalida } from "./whatsapp-memoria";
import { contextoProspecto, darDeBaja, datosProspecto, esBaja } from "./whatsapp-prospectos";
import { AVISO_SUPLEMENTOS } from "./sitio";

const SALUD =
  "Eso no te lo puedo responder: no damos indicaciones de salud ni de consumo. Para eso consultá a tu médico o nutricionista. " +
  "Si querés, te paso el producto con su presentación y precio.";

const DERIVADO = "Dale, te contesta una persona del equipo por acá mismo. Atendemos de lunes a sábado, de 8 a 20 h. Mientras tanto, si querés, contame qué necesitás así ya lo tiene a mano.";

// Un identificador no va entero a los logs: con los últimos cuatro alcanza para seguir una charla.
export const cola = (n: string) => `…${n.slice(-4)}`;

/** Manda un texto por el canal que corresponda a la charla. */
export async function enviarPorCanal(clave: string, texto: string): Promise<boolean> {
  return canalDe(clave) === "whatsapp" ? enviarTexto(clave, texto) : enviarMeta(clave, texto);
}

export type Entrada = {
  clave: string; // teléfono, o fb./ig. + id
  idMensaje: string;
  nombre: string | null;
  texto: string | null; // null: no es texto ni botón (audio, foto, sticker...)
  tipo: string;
  anuncio?: { id: string | null; titulo: string | null; texto: string | null; ctwaClid: string | null } | null;
};

async function responder(clave: string, texto: string): Promise<boolean> {
  const enviado = await enviarPorCanal(clave, texto);
  console.log("chat: envío", { canal: canalDe(clave), de: cola(clave), enviado });
  if (enviado) await registrarSalida(clave, "bot", texto);
  return enviado;
}

export async function atender(e: Entrada): Promise<void> {
  const canal = canalDe(e.clave);
  const texto = e.texto !== null ? e.texto.trim().slice(0, 400) : `[${e.tipo}]`;
  const nuevo = await registrarEntrante(e.idMensaje, e.clave, e.nombre, texto);
  if (!nuevo) {
    console.log("chat: repetido, se ignora", e.idMensaje);
    return;
  }
  if (canal === "whatsapp") await marcarLeido(e.idMensaje);
  else await marcarVistoMeta(e.clave);

  const ref = e.anuncio;
  if (ref && (ref.id || ref.ctwaClid)) {
    await registrarAnuncio(e.clave, { anuncioId: ref.id, titulo: ref.titulo ?? ref.texto?.slice(0, 120) ?? null, ctwaClid: ref.ctwaClid });
    console.log("chat: viene de un anuncio", { canal, de: cola(e.clave), anuncio: ref.id });
  }

  // Una persona tomó la charla: el bot no se mete. El mensaje queda guardado y suma no leídos.
  if ((await estadoDe(e.clave)) === "persona") {
    console.log("chat: en manos de una persona, el bot se calla", cola(e.clave));
    return;
  }

  // Prospecto que dice que no: se le da de baja, se le agradece una vez y nunca más.
  const prospecto = await datosProspecto(e.clave);
  if (prospecto.baja) {
    console.log("chat: dado de baja, no se contesta", cola(e.clave));
    return;
  }
  if (prospecto.prospecto && e.texto !== null && esBaja(texto)) {
    await darDeBaja(e.clave);
    await responder(e.clave, "Perfecto, no le escribimos más. ¡Gracias por responder y que tengan una buena temporada!");
    return;
  }

  if (e.texto === null) {
    await responder(e.clave, "Por ahora te leo solo mensajes de texto. Escribime qué estás buscando y te paso precio y link.");
    return;
  }
  if (!texto) return;

  if (detectar(texto) === "salud") {
    await responder(e.clave, `${SALUD}\n\n${AVISO_SUPLEMENTOS}`);
    return;
  }

  // El historial se lee sin el mensaje recién guardado: el vendedor lo recibe aparte.
  const historial = (await historialDe(e.clave, 9)).slice(0, -1);
  const inicio = Date.now();
  // Lo que prometió el anuncio y quién es el negocio van pegados al mensaje y no a las
  // instrucciones, para no romper el caché del prompt.
  const anuncio = ref && (ref.titulo || ref.texto) ? `<anuncio>La persona tocó un anuncio que decía: ${[ref.titulo, ref.texto].filter(Boolean).join(" — ").slice(0, 300)}. Arrancá por ahí.</anuncio>\n\n` : "";
  const negocio = prospecto.prospecto ? contextoProspecto(prospecto.prospecto, prospecto.negocio) : "";
  const r = vendedorActivo() ? await responderComoVendedor(`${negocio}${anuncio}${texto}`, historial, null, "whatsapp") : null;
  const respuesta = r ?? (await buscarEnCatalogo(texto));
  // Pedir una persona deriva siempre, conteste la IA o el motor de reglas. Y el texto es fijo:
  // el modelo tiende a prometer "el link de arriba" u otras cosas que acá no existen.
  const derivar = Boolean(respuesta.derivar) || detectar(texto) === "humano";
  const salida = derivar ? DERIVADO : paraWhatsapp(respuesta);
  console.log("chat: respuesta armada", { canal, de: cola(e.clave), conIA: Boolean(r), ms: Date.now() - inicio, largo: salida.length, derivar });
  if (!salida) return;

  await responder(e.clave, salida);
  if (derivar) await cambiarEstado(e.clave, "persona");
}
