// Atender un mensaje entrante, venga de WhatsApp, Messenger o Instagram.
//
// Los tres canales llegan por webhooks distintos pero se atienden igual: se guarda el mensaje
// (el id de Meta es clave primaria, así una reentrega no se contesta dos veces), se respeta si
// una persona tomó la charla o si el prospecto pidió la baja, y contesta el mismo vendedor.
// Lo único que cambia por canal es cómo se manda la respuesta.

import { PAGO_AL_RECIBIR } from "./politica";
import { conPresentacion } from "./whatsapp-saludo";
import { zonaDeLugar } from "./envio-zona";
import { detectar, esRespuestaAutomatica, pidePersona } from "./asistente";
import { buscarEnCatalogo, comboDelAnuncio, type Accion, type EnvioCotizado, type Respuesta } from "./asistente-catalogo";
import { cotizarEnvioChat } from "./envio-chat";
import { argumentoCombo } from "./combos-tema";
import { responderComoVendedor, vendedorActivo, type Turno } from "./vendedor";
import { enviarSaliente, enviarTexto, marcarLeido, paraWhatsapp } from "./whatsapp-cloud";
import { ordenarParaVer, primerNombre, leerToque, pagaAlRecibir, planDeNada, planSinApuro, soloAgradece, tieneDireccion, planTrae, planVer, planWhatsapp, postergaCompra, quiereVer, textoParaPanel, type PedidoArmado, type Saliente, listaDeProductos } from "./whatsapp-interactivo";
import { enlacePedido, leerPedido } from "./pedido-enlace";
import { lugarDelHistorial, sumarLineas } from "./pedido-charla";
import { combosTienda, cotizarCarrito } from "./tienda";
import { completarEntrega, crearPedidoWhatsapp, numeroPedido } from "./pedidos";
import { dioPorCerrada } from "./whatsapp-recordatorio";
import { AVISOS_WHATSAPP, avisarSantiago } from "./avisos";
import { fotosOportunas } from "./galeria";
import { esPedidoWeb, leerPedidoWeb, resolverPedidoWeb } from "./pedido-web";
import { catalogo } from "./asistente-catalogo";
import { leerConfig } from "./config";
import { pesos, renglonCombo } from "./precios";
import { urlSitio } from "./sitio";
import { canalDe, enviarMeta, marcarVistoMeta } from "./meta-mensajes";
import { cambiarEstado, estadoDe, guardarPedido, respuestasRecientes, historialDe, pedidoGuardado, ultimoDelCliente, registrarAnuncio, registrarEntrante, registrarSalida } from "./whatsapp-memoria";
import { contextoProspecto, darDeBaja, datosProspecto, enviarProspecto, esBaja } from "./whatsapp-prospectos";
import { derivacion } from "./derivacion";
import { AVISO_SUPLEMENTOS } from "./sitio";
import { NOMBRE_MEDIO, respuestaMedio } from "./whatsapp-media";
import { describirFotoConMotivo } from "./ver-foto";
import { transcribirAudio } from "./oir-audio";
import { aplicarComprobante, leerComprobante, type ResultadoComprobante } from "./comprobante";
import { completarDireccion, direccionDeUbicacion, leerDireccionDeFoto } from "./direccion-cliente";
import { REALES } from "./galeria";
import { prisma } from "./prisma";
import { MARCA_PROVEEDOR } from "./whatsapp-proveedores";
import { telefonoFin } from "./telefono";
import { sinPerfecto } from "./sin-perfecto";

const SALUD =
  "Entiendo, y qué bueno que te estés cuidando 💚 Sobre salud no te puedo aconsejar, eso lo ve mejor tu médico o nutricionista. " +
  "Lo que sí puedo es contarte qué productos son sin azúcar agregada y pasarte precios. ¿Querés que te los pase?";

const DERIVADO = "Dale, en un rato te escribe alguien del equipo por acá para coordinarlo. Atendemos de lunes a sábado, de 8 a 20 h.";

// Un identificador no va entero a los logs: con los últimos cuatro alcanza para seguir una charla.
const ESPERA_RAFAGA_MS = 4000;

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
  toque?: string | null; // id del botón o fila que tocó, en WhatsApp
  tipo: string;
  guardar?: string; // lo que queda en la charla, si no es el texto (foto, audio, reacción)
  silencioso?: boolean; // reacción o sticker: se guarda y no se contesta
  anuncio?: { id: string | null; titulo: string | null; texto: string | null; ctwaClid: string | null } | null;
};

const limpiarSaliente = (m: Saliente): Saliente =>
  m.tipo === "texto" ? { ...m, texto: sinPerfecto(m.texto) } : m.tipo === "botones" || m.tipo === "lista" || m.tipo === "cta" ? { ...m, cuerpo: sinPerfecto(m.cuerpo) } : m;

async function responder(clave: string, texto0: string): Promise<boolean> {
  const texto = sinPerfecto(texto0);
  const enviado = await enviarPorCanal(clave, texto);
  console.log("chat: envío", { canal: canalDe(clave), de: cola(clave), enviado });
  if (enviado) await registrarSalida(clave, "bot", texto);
  return enviado;
}

/** El mismo envío de texto, para quien escribe fuera de una charla entrante (seguimientos de Marcos). */
export const responderTexto = responder;

/** Manda una tanda de mensajes de WhatsApp en orden y deja cada uno en el panel. */
async function responderWhatsapp(clave: string, salientes0: Saliente[]): Promise<void> {
  for (const m of salientes0.map(limpiarSaliente)) {
    const enviado = await enviarSaliente(clave, m);
    console.log("chat: envío", { canal: "whatsapp", tipo: m.tipo, de: cola(clave), enviado });
    if (enviado) await registrarSalida(clave, "bot", textoParaPanel(m));
  }
}

/** El pedido armado, cotizado por el servidor: los precios nunca salen del modelo. Con el envío si ya se sabe la zona. */
async function pedidoDe(lineas: { tipo: "producto" | "combo"; id: string; cantidad: number }[], envio?: EnvioCotizado | null): Promise<PedidoArmado | null> {
  if (!lineas.length) return null;
  const cfg = await leerConfig();
  // Si ya se sabe que entrega en Carlos Paz, rige el mínimo de la zona propia. Si todavía no se sabe la zona,
  // también: la mayoría es de Carlos Paz y decirle «te faltan $10.000» cuando ya llega le corta la compra
  // (pasó con Vilma). Si después resulta de otra zona, al cotizar el envío rige el mínimo general.
  const cot = await cotizarCarrito(lineas, !envio || (envio.propia && envio.costo === 0) ? cfg.compraMinimaPropia : undefined);
  if (!cot.lineas.length) return null;
  return {
    camino: enlacePedido(lineas),
    renglones: cot.lineas.filter((l) => l.disponible).map((l) => `${l.cantidad > 1 ? `${l.cantidad} x ` : ""}${l.nombre} — ${pesos(l.subtotal)}`),
    total: pesos(cot.subtotal),
    conTransferencia: cot.conTransferencia ? pesos(cot.conTransferencia) : null,
    falta: cot.falta > 0 ? pesos(cot.falta) : null,
    envio: envio
      ? {
          ...envio,
          totalConEnvio: envio.costo !== null && envio.costo > 0 ? pesos(cot.subtotal + envio.costo) : null,
          transferenciaConEnvio:
            cot.conTransferencia && cfg.descuentoTransferenciaPct > 0 ? `${pesos(cot.conTransferencia + (envio.costo ?? 0))}${envio.costo === null ? " + envío" : ""}` : null,
        }
      : null,
  };
}

const lineasDeAcciones = (acciones?: Accion[]) => (acciones ?? []).map((a) => ({ tipo: a.clase, id: a.id, cantidad: a.cantidad }));
const lineasDeCamino = (camino: string) => leerPedido(camino.replace(/^\/carrito\?p=/, ""));

/** Tocó «Mercado Pago»: recién ahí va el link, dentro de un botón y explicado. Sin pasar por el modelo. */
async function cobrarConLink(clave: string, camino: string): Promise<void> {
  await responderWhatsapp(clave, await planCobroLink(camino));
}

/** El mensaje con el botón «Pagar mi pedido». Separado para que el simulador muestre lo mismo. */
export async function planCobroLink(camino: string): Promise<Saliente[]> {
  const cot = await cotizarCarrito(leerPedido(camino.replace(/^\/carrito\?p=/, "")));
  return [
    {
      tipo: "cta",
      cuerpo: `¡Buenísimo! 🙌 Te dejo el pedido armado${cot.subtotal ? ` (${pesos(cot.subtotal)})` : ""} en nuestra web. Ahí ponés el código postal, ves el envío y pagás con Mercado Pago, que es seguro. Cualquier duda me escribís por acá.`,
      texto: "Pagar mi pedido",
      url: `${urlSitio()}${camino}`,
      pie: "acopiosaludable.com",
    },
  ];
}

/** Tocó «Transferencia»: total con descuento, datos para transferir y la charla pasa a una persona. */
/**
 * Cerró la venta: Transferencia o Pago al recibir. Se crea el pedido en el panel (con lista de compra
 * a Distrimay), se le avisa a Santiago y el vendedor le pide nombre, dirección y horario para entregar.
 */
/** Pagar al recibir solo en la zona de entrega sin cargo (Carlos Paz y alrededores). */
function recibeEnZonaPropia(lugar: string | undefined | null): boolean {
  return Boolean(lugar) && zonaDeLugar(String(lugar), null)?.tipo === "propia";
}

async function cerrarVenta(
  clave: string,
  nombre: string | null,
  medio: "TRANSFERENCIA" | "AL_RECIBIR",
  camino: string,
  envio: { costo: number | null; lugar: string } | null,
  direccion?: string,
): Promise<void> {
  const cfg = await leerConfig();
  // Doble toque o un botón viejo: si ya hizo un pedido hace un rato, no se crea otro (antes salían dos AS-… distintos).
  const fin = telefonoFin(clave);
  const reciente = (await prisma.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - 2 * 3_600_000) }, estado: { not: "CANCELADO" } }, orderBy: { id: "desc" }, take: 30 })).find((o) => telefonoFin(o.telefono) === fin);
  if (reciente) {
    console.log("chat: ya tiene pedido reciente, no se duplica", cola(clave), reciente.id);
    await responder(clave, `Tu pedido ya está hecho: es el ${numeroPedido(reciente.id)} por ${pesos(Number(reciente.total))}. Si querés cambiar algo, decime qué y lo ajusto.`);
    return;
  }
  const lineas = leerPedido(camino.replace(/^\/carrito\?p=/, ""));
  let pedido;
  try {
    pedido = await crearPedidoWhatsapp({ lineas, medioPago: medio, nombre: nombre ?? "", telefono: clave, envio: envio ?? { lugar: "A confirmar", costo: null } });
  } catch (e) {
    console.error("chat: no se pudo crear el pedido", cola(clave), e);
    await responder(clave, "¡Genial! Ya le paso tu pedido a Santiago y te escribe enseguida para coordinar.");
    await avisarSantiago("Venta por WhatsApp sin pedido", `No se pudo crear el pedido de ${nombre ?? clave} (${clave}). Revisá la charla en el panel.`);
    await cambiarEstado(clave, "persona");
    return;
  }
  const total = pesos(Number(pedido.total));
  const envioTxt = envio?.costo === 0 ? "con envío sin cargo" : envio?.costo ? "con el envío incluido" : "más el envío, que te confirmo";
  // Ya pasó la dirección: no se le vuelve a pedir nada. Se confirma y listo.
  if (direccion) await completarEntrega(pedido.id, { direccion });
  const partes = direccion
    ? [
        medio === "TRANSFERENCIA"
          ? `¡Listo${nombre ? `, ${nombre.split(/\s+/)[0]}` : ""}! Tu pedido es el ${numeroPedido(pedido.id)}: ${total} ${envioTxt}${cfg.descuentoTransferenciaPct > 0 ? `, ya con el ${cfg.descuentoTransferenciaPct}% de descuento por transferencia` : ""}. Va a ${direccion.slice(0, 120)}: apenas se acredita la transferencia, sale en el próximo reparto 🙌`
          : `¡Listo${nombre ? `, ${nombre.split(/\s+/)[0]}` : ""}! Tu pedido es el ${numeroPedido(pedido.id)}: ${total} ${envioTxt}. Te llega a ${direccion.slice(0, 120)} en ${cfg.plazoEntregaPropia} y lo pagás ahí, en efectivo o por transferencia 🙌`,
        medio === "TRANSFERENCIA" && cfg.transferenciaDatos ? `Los datos para transferir:\n${cfg.transferenciaDatos}\nMandame el comprobante por acá.` : "Si tenés un horario que te quede mejor, decime y lo anoto.",
      ]
    : medio === "TRANSFERENCIA"
      ? [
          `¡Listo! Tu pedido es el ${numeroPedido(pedido.id)}: ${total} ${envioTxt}${cfg.descuentoTransferenciaPct > 0 ? `, ya con el ${cfg.descuentoTransferenciaPct}% de descuento por transferencia` : ""}.`,
          cfg.transferenciaDatos ? `Los datos para transferir:\n${cfg.transferenciaDatos}` : "",
          "Para mandártelo pasame en un mensaje: nombre y apellido, dirección (calle, número y barrio) y en qué horario te queda bien recibirlo. Cuando transfieras, mandame el comprobante por acá 🙌",
        ]
      : [
          `¡Listo! Tu pedido es el ${numeroPedido(pedido.id)}: ${total} ${envioTxt}. Lo pagás cuando lo recibís, en efectivo o por transferencia.`,
          "Para llevártelo pasame en un mensaje: nombre y apellido, dirección (calle, número y barrio) y en qué horario te queda bien recibirlo 🙌",
        ];
  await responderWhatsapp(clave, [{ tipo: "texto", texto: partes.filter(Boolean).join("\n\n") }]);
  // La charla queda atada al pedido: lo que mande ahora (dirección, horario) se guarda ahí.
  await guardarPedido(clave, `orden:${pedido.id}`);
}

export async function atender(e: Entrada): Promise<void> {
  const canal = canalDe(e.clave);
  let texto = e.texto !== null ? e.texto.trim().slice(0, 1200) : `[${e.tipo}]`;
  const nuevo = await registrarEntrante(e.idMensaje, e.clave, e.nombre, (e.guardar ?? texto).slice(0, 1200));
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

  // Una reacción o un sticker: queda en el panel y no se contesta.
  if (e.silencioso) return;

  // Santiago le escribe al número de Acopio: le contesta su asistente (pedidos, cobros, boletas), no el vendedor.
  if (canal === "whatsapp" && e.clave === AVISOS_WHATSAPP && process.env.ASISTENTE_SANTIAGO !== "0") {
    let dicho = e.texto ?? "";
    const audio = /^\[audio·([^\]\s]+)\]/.exec(e.guardar ?? "")?.[1];
    if (audio) {
      const r = await transcribirAudio(audio);
      dicho = r.texto ? `(audio) ${r.texto}` : "(mandó un audio que no se pudo transcribir)";
      if (r.texto) await prisma.$executeRaw`UPDATE "WhatsappMensaje" SET "texto" = "texto" || ${` 🎤 «${r.texto}»`} WHERE "id" = ${e.idMensaje}`.catch(() => null);
    }
    const media = /^\[(?:foto|archivo)·([^\]\s]+)\]/.exec(e.guardar ?? "")?.[1] ?? null;
    const { atenderSantiago } = await import("./asistente-santiago");
    await atenderSantiago(e.clave, dicho, media).catch((x) => console.error("asistente de Santiago falló", x));
    return;
  }

  // Una persona tomó la charla: el bot no se mete. El mensaje queda guardado y suma no leídos.
  if ((await estadoDe(e.clave)) === "persona") {
    console.log("chat: en manos de una persona, el bot se calla", cola(e.clave));
    return;
  }

  // Un dueño de empresa que viene por el equipo de agentes (anuncio o /agentes): lo atiende Marcos,
  // que vende el sistema, no el vendedor de la dietética. Una vez marcado, toda la charla es de Marcos.
  const prospecto = await datosProspecto(e.clave);
  {
    const { MARCA_SISTEMA, pareceLeadSistema, marcarLeadSistema, atenderLeadSistema } = await import("./vendedor-sistema");
    const yaEs = prospecto.prospecto === MARCA_SISTEMA;
    if (yaEs || (e.texto !== null && pareceLeadSistema(texto, ref?.titulo ?? ref?.texto))) {
      if (!yaEs) await marcarLeadSistema(e.clave);
      if (e.texto === null) {
        const audio = /^\[audio·([^\]\s]+)\]/.exec(e.guardar ?? "")?.[1];
        const r = audio ? await transcribirAudio(audio) : { texto: null };
        if (r.texto) await prisma.$executeRaw`UPDATE "WhatsappMensaje" SET "texto" = ${`(audio) ${r.texto}`} WHERE "id" = ${e.idMensaje}`.catch(() => null);
        else if (e.tipo !== "image") return;
      }
      await atenderLeadSistema(e.clave, e.nombre ?? null, e.idMensaje, responder).catch((x) => console.error("Marcos falló", x));
      return;
    }
  }
  // Prospecto que dice que no: se le da de baja, se le agradece una vez y nunca más.
  // Un proveedor: no le habla el vendedor. Queda para Santiago y le llega el aviso.
  if (prospecto.prospecto === MARCA_PROVEEDOR) {
    await avisarSantiago(`Proveedor: ${prospecto.negocio ?? e.clave}`, `📦 ${prospecto.negocio ?? e.nombre ?? e.clave} contestó:\n${(e.guardar ?? texto).slice(0, 300)}\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
    return;
  }
  if (prospecto.baja) {
    console.log("chat: dado de baja, no se contesta", cola(e.clave));
    return;
  }
  if (prospecto.prospecto && e.texto !== null && esBaja(texto)) {
    await darDeBaja(e.clave);
    await responder(e.clave, "Listo, no le escribimos más. ¡Gracias por responder y que tengan una buena temporada!");
    return;
  }
  // El negocio nos deriva al dueño o a quien compra: si manda el número, se le escribe a esa persona
  // con el mismo mensaje; si solo avisa que lo va a pasar, se le pide. Nunca se le vende al que deriva.
  if (prospecto.prospecto && e.texto !== null) {
    const d = derivacion(texto);
    if (d) {
      if (d.telefono) {
        const r = await enviarProspecto(d.telefono, `${prospecto.negocio ?? e.nombre ?? ""}${d.nombre ? ` (${d.nombre})` : ""}`.trim(), prospecto.prospecto, true);
        await responder(e.clave, r.ok ? `¡Gracias! Le escribo ${d.nombre ? `a ${d.nombre}` : "directo"} ahora mismo. Buen día.` : `¡Gracias! Le escribo ${d.nombre ? `a ${d.nombre}` : "a ese número"} en un rato. Buen día.`);
        if (!r.ok) await avisarSantiago("Derivación sin enviar", `🏪 ${prospecto.negocio ?? e.clave} pasó el contacto ${d.nombre ?? ""} ${d.telefono} pero no se pudo escribir (${r.motivo ?? "error"}).\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
      } else {
        await responder(e.clave, `¡Gracias! Pasame el número${d.nombre ? ` de ${d.nombre}` : ""} y le escribo directo, así no te molesto más por acá.`);
      }
      return;
    }
  }

  // Audio, foto sin texto, video, archivo: el vendedor no lo puede leer. Se le pide que lo escriba
  // y le llega el aviso a Santiago, que lo puede escuchar o ver en el panel.

  // Una foto sin texto (la captura del anuncio, un producto): el vendedor la mira y sigue la charla.
  if (e.texto === null && e.tipo === "image") {
    const id = /^\[foto·(\d+)\]/.exec(e.guardar ?? "")?.[1];
    const r = id ? await describirFotoConMotivo(id) : { texto: null, motivo: "sin id" };
    const vista = r.texto;
    if (!vista) {
      console.log("chat: no se pudo ver la foto", cola(e.clave), r.motivo);
      // Sin vista igual se sigue la charla con lo que venía diciendo (no un «contame qué buscás» suelto).
      texto = "[Mandó una foto: no la pudiste ver. Si por lo que venía hablando se entiende qué es, seguí con eso; si no, pedile en una frase el nombre o la marca del producto.]";
    }
    if (vista) {
      texto = `[Mandó una foto: ${vista}]`;
      console.log("chat: foto descripta", cola(e.clave), vista.slice(0, 80));
      // Un comprobante: se lee el monto y, si coincide con su pedido, el pago queda registrado.
      if (id && /comprobante|transferencia|pago|mercado pago/i.test(vista)) {
        const r = await procesarComprobante(e.clave, e.nombre, id);
        if (r) {
          texto = r;
          await anotarEnMensaje(e.idMensaje, r);
        }
      }
      // Una captura de Maps o algo con su dirección: si su pedido no tiene dirección, se carga sola.
      if (id && /mapa|maps|ubicaci|direcci|calle|domicilio/i.test(vista)) {
        const dir = await leerDireccionDeFoto(id).catch(() => null);
        const cod = dir ? await completarDireccion(e.clave, dir).catch(() => null) : null;
        if (dir && cod) {
          texto = `[Mandó una captura con su dirección: ${dir}. Ya quedó cargada en su pedido ${cod}: confirmale en una frase que la tenemos.]`;
          await anotarEnMensaje(e.idMensaje, `[dirección cargada en ${cod}: ${dir}]`);
        }
      }
    }
  }
  // Un audio: se transcribe y entra a la charla como texto. Si no se pudo (sin clave, falló), se le pide que lo escriba, como antes.
  if (e.texto === null && e.tipo === "audio") {
    const id = /^\[audio·([^\]\s]+)\]/.exec(e.guardar ?? "")?.[1];
    const r = id ? await transcribirAudio(id) : { texto: null, motivo: "sin id" };
    if (r.texto) {
      texto = `[Mandó un audio que dice: «${r.texto}»]`;
      console.log("chat: audio transcripto", cola(e.clave), r.texto.slice(0, 80));
      // Queda en el mensaje del cliente, así Santiago lo lee en el panel sin escucharlo y el vendedor lo ve en el historial.
      await prisma.$executeRaw`UPDATE "WhatsappMensaje" SET "texto" = "texto" || ${` 🎤 «${r.texto}»`} WHERE "id" = ${e.idMensaje}`.catch(() => null);
    } else console.log("chat: no se pudo oír el audio", cola(e.clave), r.motivo);
  }
  // Un archivo (casi siempre el comprobante en PDF): el vendedor sigue la charla sabiendo qué es,
  // en vez de un «contame qué buscás» suelto, y a Santiago le llega el aviso para revisarlo.
  if (e.texto === null && e.tipo === "document") {
    const nombre = (e.guardar ?? "").replace(/^\[archivo·[^\]\s]+\]\s?/, "").trim().slice(0, 80);
    const idDoc = /^\[archivo·([^\]\s]+)\]/.exec(e.guardar ?? "")?.[1];
    const leido = idDoc ? await procesarComprobante(e.clave, e.nombre, idDoc) : null;
    if (leido) {
      texto = leido;
      await anotarEnMensaje(e.idMensaje, leido);
    }
    else texto = `[Mandó un archivo${nombre ? ` «${nombre}»` : ""}. No lo podés abrir. Si venían hablando de pagar, transferir o del comprobante, es el comprobante: agradecé y decile que Santiago lo revisa y le confirma por acá (no confirmes el pago vos). Si no, seguí con lo que venían hablando.]`;
    if (!leido) await avisarSantiago("Mandó un archivo", `📎 ${e.nombre ?? e.clave} mandó un archivo${nombre ? ` (${nombre})` : ""}: si es un comprobante, revisá la transferencia y pasá el pedido a Pagado.\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
  }
  // Ráfaga: «Hola» + «quiero precios», o la foto del comprobante + «ahí te lo mandé». Lo de arriba (leer el
  // comprobante, la dirección, el audio) ya se hizo; ahora se espera un momento y, si entró otro mensaje
  // después de este, contesta ese (que ve todo en el historial) y este se calla.
  if (e.texto === null) {
    await new Promise((r) => setTimeout(r, 4000));
    const masNuevo = await ultimoDelCliente(e.clave).catch(() => null);
    if (masNuevo && masNuevo !== e.idMensaje) {
      console.log("chat: llegó otro mensaje enseguida, contesta ese", cola(e.clave));
      return;
    }
  }
  if (e.texto === null && texto.startsWith("[") && !texto.startsWith("[Mandó una foto:") && !texto.startsWith("[Mandó un audio que dice:") && !texto.startsWith("[Mandó un archivo") && !/^\[Mandó (el|un) comprobante/.test(texto)) {
    await responder(e.clave, respuestaMedio(e.tipo));
    const que = NOMBRE_MEDIO[e.tipo as keyof typeof NOMBRE_MEDIO] ?? e.tipo;
    await avisarSantiago(`Mandó ${que}`, `📎 ${e.nombre ?? e.clave} mandó ${que === "foto" ? "una foto" : `un ${que}`}. Miralo en el panel:\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
    return;
  }
  if (!texto) return;

  // Mandó su ubicación de WhatsApp: si su pedido no tiene dirección, queda cargada (el reparto usa el mapa).
  const ubic = e.texto ? direccionDeUbicacion(e.texto) : null;
  if (ubic) await completarDireccion(e.clave, ubic).catch(() => null);

  // Del otro lado contestó un bot (el «gracias por comunicarte» de un hotel): no se le contesta y
  // no se avisa a nadie. La charla sigue en manos del vendedor: cuando escriba una persona, la atiende.
  if (esRespuestaAutomatica(texto)) {
    console.log("chat: respuesta automática, no se contesta", cola(e.clave));
    return;
  }
  // Freno de bucles: 40 mensajes en 10 minutos es que algo se trabó. Se calla en silencio y retoma
  // solo a las RETOMA_HORAS (antes le llegaba un aviso a Santiago por cada una y molestaba).
  if ((await respuestasRecientes(e.clave, 10)) >= 40) {
    console.log("chat: demasiados mensajes seguidos, se pausa", cola(e.clave));
    await cambiarEstado(e.clave, "persona");
    return;
  }

  // Código de la tarjeta que va en cada pedido: el vendedor lo reconoce y Santiago aplica el 10%.
  // Pide que lo llamen: eso solo lo puede hacer Santiago. Le llega el aviso con el número para llamar.
  if (/\b(llam(ar|ame|ás|as|en|arte|arme|en)|me (podés|podes|puede) llamar|hablar por tel)/i.test(texto)) {
    await avisarSantiago("Pide que lo llamen", `📞 ${e.nombre ?? e.clave} pide que lo llamen: +${e.clave}\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
  }
  // Solo el código (en mayúsculas o «código vuelvo»): «ya vuelvo» no es el descuento.
  if (/\bVUELVO\b/.test(texto) || /c[oó]digo\s+vuelvo/i.test(texto)) {
    await avisarSantiago("Código VUELVO", `🎟️ ${e.nombre ?? e.clave} usó el código VUELVO (10% en su segunda compra). Aplicalo al pedido:\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
  }

  if (detectar(texto) === "salud") {
    await responder(e.clave, `${SALUD}\n\n${AVISO_SUPLEMENTOS}`);
    return;
  }

  // La gente escribe en ráfagas: «Hola», «¿hay almendras?», «para casa». Se espera un momento y,
  // si llegó otro mensaje después de este, se deja que conteste ese, que ya ve toda la ráfaga.
  // Antes se contestaba cada uno por separado: tres respuestas casi iguales seguidas, como un robot.
  if (!e.toque) {
    await new Promise((r) => setTimeout(r, ESPERA_RAFAGA_MS));
    const ultimo = await ultimoDelCliente(e.clave);
    if (ultimo && ultimo !== e.idMensaje) {
      console.log("chat: llegó otro después, contesta ese", cola(e.clave));
      return;
    }
  }

  // Botones que no necesitan al modelo: cobrar es un paso fijo, no una charla.
  const toque = canal === "whatsapp" ? leerToque(e.toque) : null;
  if (toque?.tipo === "pagar") return cobrarConLink(e.clave, toque.camino);
  if (toque?.tipo === "transferencia") return cerrarVenta(e.clave, e.nombre, "TRANSFERENCIA", toque.camino, toque.envio);
  // Un botón viejo de «Pago al recibir» fuera de Carlos Paz y alrededores se cierra por transferencia: se cobra antes de salir.
  if (toque?.tipo === "recibir") return cerrarVenta(e.clave, e.nombre, PAGO_AL_RECIBIR && recibeEnZonaPropia(toque.envio?.lugar) ? "AL_RECIBIR" : "TRANSFERENCIA", toque.camino, toque.envio);

  // «Pago aquí» con el pedido armado: se cierra al recibir, sin preguntar zona (pagar al recibir
  // es solo en Carlos Paz y alrededores). Si en el mismo mensaje viene la dirección, queda anotada.
  const guardado = canal === "whatsapp" ? await pedidoGuardado(e.clave) : null;
  // Solo si el último envío que le dijimos no es de otra zona (Córdoba capital, correo): ahí lo ve el vendedor.
  const ultimoEnvio = [...(await historialDe(e.clave, 9))].reverse().find((h) => h.de === "acopio" && /Envío a [^:]+:/.test(h.texto))?.texto.match(/Envío a ([^:]+):/)?.[1];
  if (PAGO_AL_RECIBIR && guardado?.startsWith("/carrito?p=") && pagaAlRecibir(texto) && (ultimoEnvio ? recibeEnZonaPropia(ultimoEnvio) : false)) {
    const direccion = tieneDireccion(texto) ? texto.replace(/\b(pago|abono)[^.]*\.?/gi, "").replace(/\s+/g, " ").trim().slice(0, 160) : undefined;
    console.log("chat: paga al recibir, se cierra sin preguntar zona", cola(e.clave));
    return cerrarVenta(e.clave, e.nombre, "AL_RECIBIR", guardado, { costo: 0, lugar: "Villa Carlos Paz" }, direccion || undefined);
  }

  // El historial se lee sin el mensaje recién guardado: el vendedor lo recibe aparte.
  const historial = (await historialDe(e.clave, 9)).slice(0, -1);
  const inicio = Date.now();
  const p = await pensar({
    pedidoGuardado: guardado,
    canal,
    texto,
    toque,
    historial,
    anuncio: ref ? { titulo: ref.titulo, texto: ref.texto } : null,
    nombre: e.nombre,
    negocio: prospecto.prospecto ? contextoProspecto(prospecto.prospecto, prospecto.negocio) : "",
  });
  console.log("chat: respuesta armada", { canal, de: cola(e.clave), conIA: p.conIA, ms: Date.now() - inicio, derivar: p.derivar, tipos: p.salientes.map((x) => x.tipo) });

  // Dice «agendado» pero no hay pedido creado (no llegó al mínimo o no eligió cómo pagar): a Lilita le
  // pasó eso y el pedido nunca llegó al panel. Que Santiago se entere y lo cierre a mano.
  const dichoAhora = p.salientes.map((x) => textoParaPanel(x)).join(" ");
  if (!guardado?.startsWith("orden:") && dioPorCerrada(dichoAhora) && (await primeraVezHoy(`aviso-cerrar-${e.clave}`))) {
    await avisarSantiago(
      `Venta por cerrar: ${e.nombre ?? e.clave}`,
      `🛒 El vendedor le dijo a ${e.nombre ?? e.clave} que el pedido queda agendado, pero no hay pedido creado en el panel (falta llegar al mínimo o elegir cómo paga). Revisalo: ${urlSitio()}/admin/whatsapp?c=${e.clave}`,
    ).catch((err) => console.error("aviso de venta por cerrar falló", err));
  }

  if (p.derivar) {
    await responder(e.clave, DERIVADO);
    await cambiarEstado(e.clave, "persona");
    await avisarSantiago("Charla para vos", `💬 ${e.nombre ?? "Alguien"} (${e.clave}) quiere hablar con una persona.\nÚltimo mensaje: «${texto.slice(0, 200)}»\n${urlSitio()}/admin/whatsapp?c=${e.clave}`);
    return;
  }
  // Mientras se pensaba la respuesta llegó otro mensaje (un botón, la ubicación): contesta ese, que ve todo.
  // Si no, salían dos respuestas casi iguales seguidas (Nancy, 26/10).
  const masNuevo = await ultimoDelCliente(e.clave).catch(() => null);
  if (masNuevo && masNuevo !== e.idMensaje) {
    console.log("chat: llegó otro mientras pensaba, contesta ese", cola(e.clave));
    if (p.guardarPedido) await guardarPedido(e.clave, p.guardarPedido);
    return;
  }
  if (canal === "whatsapp") {
    await responderWhatsapp(e.clave, p.salientes);
    if (p.guardarPedido) await guardarPedido(e.clave, p.guardarPedido);
    // Ya pasó los datos de entrega: el aviso le llegó a Santiago, pero la charla sigue con el vendedor,
    // que contesta las dudas de posventa («¿venden algo más?») sin volver a vender ni a pedir datos.
    void p.aPersona;
    return;
  }
  const salida = paraWhatsapp(p.respuesta);
  if (salida) await responder(e.clave, salida);
}

export type Pensado = { salientes: Saliente[]; respuesta: Respuesta; derivar: boolean; conIA: boolean; guardarPedido?: string; aPersona?: boolean };

/**
 * Qué contestar, sin mandar nada ni tocar la base de mensajes. Lo usa atender() y lo usa el
 * simulador del panel, así lo que se prueba es exactamente lo que recibe el cliente.
 */
const normalizar = (t: string) => t.toLowerCase().replace(/\[.*?\]/g, "").replace(/[^a-záéíóúñ0-9$]+/g, " ").trim();

export async function pensar(c: {
  canal: ReturnType<typeof canalDe>;
  texto: string;
  toque: ReturnType<typeof leerToque>;
  historial: Turno[];
  anuncio: { titulo: string | null; texto: string | null } | null;
  nombre: string | null;
  negocio: string;
  pedidoGuardado?: string | null;
}): Promise<Pensado> {
  // Tocó su zona (Carlos Paz, Córdoba Capital) con el pedido ya armado: envío y botones de pago, sin modelo.
  if (c.toque?.tipo === "zona" && c.pedidoGuardado) {
    const lineas = lineasDeCamino(c.pedidoGuardado);
    const previo = await pedidoDe(lineas);
    const envio = await cotizarEnvioChat(c.toque.lugar, null, previo ? Number(previo.total.replace(/[^\d,]/g, "").replace(",", ".")) : 0);
    const pedido = envio ? await pedidoDe(lineas, envio) : null;
    if (pedido) {
      const texto = `¡Buenísimo! ${envio!.detalle} Te dejo el resumen 👇`;
      return { salientes: planWhatsapp({ texto }, pedido), respuesta: { texto }, derivar: false, conIA: false, guardarPedido: pedido.camino };
    }
  }
  // «Lo veo tranquila y te escribo»: se le da tiempo. Nada de armarle el pedido ni ponerle las zonas.
  // «Gracias» solo: se contesta corto y sin volver a ofrecer.
  // Lo que mandó seguido antes de este mensaje, sin respuesta nuestra en el medio. «¿Con quién confirmo lo del maní?» + «?»
  // es una pregunta, no un gracias: los atajos miran toda la ráfaga, no solo el último mensaje.
  const rafaga: string[] = [];
  for (let i = c.historial.length - 1; i >= 0 && c.historial[i].de === "yo"; i--) rafaga.unshift(c.historial[i].texto);
  const todoGracias = [...rafaga, c.texto].every((t) => soloAgradece(t));
  const preguntaAbierta = rafaga.some((t) => t.includes("?") || /^(con quien|cuando|donde|como|cuanto|que|cual)\b/i.test(t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^[¿¡\s]+/, "")));
  if (!c.toque && c.historial.length && todoGracias) {
    // Si ya le dijimos «de nada» y vuelve a agradecer (o reacciona), no se contesta otra vez lo mismo.
    const ultimoNuestro = [...c.historial].reverse().find((h) => h.de === "acopio")?.texto ?? "";
    const salientes = /^¡De nada/.test(ultimoNuestro) ? [] : planDeNada(c.nombre);
    return { salientes, respuesta: { texto: salientes[0] ? textoParaPanel(salientes[0]) : "" }, derivar: false, conIA: false };
  }
  if (!c.toque && !preguntaAbierta && postergaCompra(c.texto)) {
    const yaMandoReal = c.historial.some((h) => h.de === "acopio" && h.texto.includes("Así llega tu pedido"));
    const salientes = planSinApuro(c.nombre, urlSitio(), yaMandoReal ? undefined : `${urlSitio()}${REALES[0] ? "/img/galeria/real-asi-llega.jpg" : ""}`);
    return { salientes, respuesta: { texto: textoParaPanel(salientes[0]) }, derivar: false, conIA: false };
  }
  // «Ver los productos»: se muestran, sin preguntar ni gastar el modelo. Primero los que vendemos, después por precio.
  if (quiereVer(c.texto)) {
    const cfgArg = await leerConfig();
    const combos = ordenarParaVer((await combosTienda({ activo: true, tipo: "COMBO" })).filter((x) => x.disponible))
      .map((x) => ({ slug: x.slug, nombre: x.nombre, precio: pesos(Math.round(x.precio)), argumento: argumentoCombo(x, cfgArg.descuentoTransferenciaPct, pesos).corto }));
    if (combos.length) return { salientes: planVer(combos, `${urlSitio()}/combos`), respuesta: { texto: "" }, derivar: false, conIA: false };
  }

  // «¿Qué trae?» de un combo: la lista completa, fija, sin gastar el modelo.
  if (c.toque?.tipo === "trae") {
    const combo = (await combosTienda({ slug: c.toque.slug, tipo: "COMBO" }))[0];
    if (combo?.disponible) {
      const salientes = planTrae({
        slug: combo.slug,
        nombre: combo.nombre,
        precio: pesos(Math.round(combo.precio)),
        argumento: argumentoCombo(combo, (await leerConfig()).descuentoTransferenciaPct, pesos).transferencia ?? "",
        renglones: combo.items.map(({ producto, cantidad }) => renglonCombo(producto, cantidad)),
      });
      return { salientes, respuesta: { texto: "" }, derivar: false, conIA: false };
    }
  }

  // Lo que prometió el anuncio, quién es y qué tocó van pegados al mensaje y no a las
  // instrucciones, para no romper el caché del prompt.
  const textoAnuncio = c.anuncio ? [c.anuncio.titulo, c.anuncio.texto].filter(Boolean).join(" — ").slice(0, 300) : "";
  const combo = textoAnuncio ? await comboDelAnuncio(textoAnuncio) : null;
  const anuncio = textoAnuncio
    ? `<anuncio>Tocó un anuncio que decía: ${textoAnuncio}.${
        combo
          ? ` Es el combo slug ${combo.slug} «${combo.nombre}», hoy a ${pesos(Math.round(combo.precio))} (lista ${pesos(Math.round(combo.precioLista))}), trae: ${combo.items.map((i) => `${i.cantidad} x ${i.producto.producto} ${i.producto.presentacion}`).join(", ")}.`
          : ""
      } Si su mensaje es una pregunta (dirección, envío, pago, un producto), contestala PRIMERO en una frase y recién después ofrecé lo del anuncio. Si no pregunta nada concreto, arrancá por el anuncio: qué trae y por qué conviene, y ofrecé dejárselo listo.</anuncio>\n\n`
    : "";
  const cliente = c.nombre ? `<cliente>${primerNombre(c.nombre) ? `Se llama ${primerNombre(c.nombre)}` : `Su perfil de WhatsApp dice «${c.nombre.slice(0, 40)}» (no es un nombre de persona: no lo llames así)`}${c.historial.length ? " (ya lo saludaste: no lo saludes de nuevo)" : ""}.</cliente>\n` : "";
  const eligio =
    c.toque?.tipo === "quiero"
      ? `<eligio>Tocó «Lo quiero» en el ${c.toque.clase} ${c.toque.clase === "combo" ? "slug" : "codigo"} ${c.toque.id}. Agregalo YA con agregar_al_pedido (junto con lo que ya había elegido antes) y en una frase ofrecé sumar algo chico o dejarlo listo para pagar.</eligio>\n`
      : "";
  // Venta ya cerrada: lo que mande ahora (dirección, horario) va al pedido.
  const ordenId = c.pedidoGuardado?.startsWith("orden:") ? Number(c.pedidoGuardado.slice(6)) || undefined : undefined;
  // En qué anda el pedido: si ya salió o ya lo recibió, no se le habla de agendar ni de «te avisamos cuando salga».
  const orden = ordenId ? await prisma.order.findUnique({ where: { id: ordenId }, select: { estado: true, nombre: true, calle: true, ciudad: true, notas: true } }).catch(() => null) : null;
  const estadoOrden = orden?.estado ?? null;
  // Lo que ya nos dio: no se le vuelve a pedir (a Nancy se le pidió el nombre dos veces el 26/10).
  const tieneCalle = Boolean(orden?.calle && orden.calle.trim().length > 4 && !/a confirmar/i.test(orden.calle));
  const horario = orden?.notas?.match(/Horario:\s*([^·]+)/i)?.[1]?.trim();
  const yaTenemos = orden
    ? ` Datos que YA tenemos: nombre ${orden.nombre}${tieneCalle ? `, dirección ${orden.calle}, ${orden.ciudad}` : ", FALTA la dirección"}${horario ? `, horario ${horario}` : ""}. No vuelvas a pedir lo que ya está; si falta algo, pedí solo eso y una sola vez. Si pregunta cuándo se lo llevan: entregamos en 24 a 48 h hábiles (domingos no hay reparto); el día del reparto le avisamos a la mañana y el chico del reparto le escribe para coordinar el horario. No prometas un día ni una hora exactos.`
    : "";
  const enQueAnda =
    estadoOrden === "ENTREGADO"
      ? " YA LO RECIBIÓ: si agradece o comenta, agradecé corto y cálido y nada más. No digas que está agendado, no ofrezcas avisar cuando salga y no mandes fotos de cómo llega."
      : estadoOrden === "ENVIADO"
        ? " Ya está en el reparto de hoy: el chico del reparto le escribe para coordinar. No digas que está agendado ni ofrezcas avisar cuando salga."
        : estadoOrden === "CANCELADO"
          ? " Ese pedido se canceló."
          : "";
  const cerrado = ordenId
    ? `<pedido_cerrado>Ya cerró la compra (pedido ${numeroPedido(ordenId)}).${enQueAnda}${yaTenemos} Si te pasa nombre, dirección, referencia u horario, guardalos con datos_de_entrega. No le vuelvas a ofrecer productos salvo que los pida.</pedido_cerrado>\n`
    : "";
  // El carrito de la web llega armado: se carga exacto, sin IA y sin ofrecer otra cosa.
  const web = esPedidoWeb(c.texto) && !ordenId ? await armarPedidoWeb(c.texto, Boolean(c.historial.some((h) => h.de === "acopio"))) : null;
  const r = web ?? (vendedorActivo() ? await responderComoVendedor(`${c.negocio}${cliente}${anuncio}${cerrado}${eligio}${c.texto}`, c.historial, null, "whatsapp", { ordenId }) : null);

  let respuesta: Respuesta;
  if (r) respuesta = r;
  else {
    // Sin IA (caída o sin clave): el buscador, pero dicho como lo diría una persona.
    const b = await buscarEnCatalogo(c.texto);
    respuesta = b.fichas?.length
      ? { ...b, texto: "¡Hola! Te paso lo que tengo de eso, tocá el que te interese y lo sumamos a tu pedido 👇", enlaces: undefined, opciones: ["Ver combos", "Hablar con Santiago"] }
      : { texto: "¡Hola! Contame qué estás buscando y te paso precio al toque. Tenemos frutos secos, semillas, harinas sin TACC, cereales y combos armados.", opciones: ["Frutos secos", "Ver combos", "Sin TACC"] };
  }

  // Vino del anuncio de un combo y todavía no lo eligió: la respuesta lleva la tarjeta del combo,
  // con «Lo quiero» a un toque. Sin esto, el texto lo ofrecía pero no había botón para tomarlo.
  // Solo si el texto habla del combo: si contestó precios por kilo y preguntó otra cosa, la tarjeta
  // pisaba la pregunta con botones que no tenían nada que ver.
  const nombraCombo = combo ? normalizar(respuesta.texto).includes(normalizar(combo.nombre).split(" ")[0]) : false;
  if (combo && nombraCombo && !respuesta.fichas?.length && !respuesta.acciones?.length) {
    respuesta = {
      ...respuesta,
      fichas: [{ href: `/combos/${combo.slug}`, nombre: `Combo ${combo.nombre}`, detalle: "Trae: combo", precio: pesos(Math.round(combo.precio)), foto: combo.fotoUrl }],
    };
  }

  // Pedir una persona deriva siempre, conteste la IA o el buscador.
  const derivar = Boolean(respuesta.derivar) || pidePersona(c.texto);
  // Primera respuesta de la charla: se presenta como asistente con IA, sin cortar la venta.
  if (!derivar && respuesta.texto && !c.historial.some((h) => h.de === "acopio")) respuesta = { ...respuesta, texto: conPresentacion(respuesta.texto) };
  // El pedido: el que acaba de armar, o el guardado si recién ahora cotizó el envío.
  // Lo nuevo se suma a lo que ya tenía guardado (a Julieta el mix cervecero le borró el resto del pedido);
  // solo se arma de nuevo si el vendedor dijo que quitó o cambió algo.
  const previas = c.pedidoGuardado ? lineasDeCamino(c.pedidoGuardado) : [];
  const nuevas = respuesta.acciones?.length ? lineasDeAcciones(respuesta.acciones) : [];
  const lineas = nuevas.length ? (respuesta.reemplazaPedido ? nuevas : sumarLineas(previas, nuevas)) : respuesta.envio && previas.length ? previas : [];
  // Si ya dijo de dónde es, el envío sale solo: no se le vuelve a preguntar la ciudad.
  const lugarSabido = respuesta.envio ? null : lugarDelHistorial(c.historial);
  const envio = respuesta.envio ?? (lineas.length && lugarSabido ? await cotizarEnvioChat(lugarSabido, null, 0).catch(() => null) : null) ?? undefined;
  if (!respuesta.envio && envio) respuesta = { ...respuesta, envio };
  const pedido = await pedidoDe(lineas, envio);
  // Imágenes en el momento justo (duda, combo nombrado, producto cotizado, pedido agendado), sin saturar.
  if (c.canal === "whatsapp" && !web && !derivar && !respuesta.fotos?.length && !listaDeProductos(c.texto).length && estadoOrden !== "ENTREGADO" && estadoOrden !== "ENVIADO") {
    const combos = [
      ...(respuesta.acciones ?? []).filter((a) => a.clase === "combo").map((a) => a.id),
      ...(respuesta.fichas ?? []).map((f) => f.href.match(/^\/combos\/(.+)$/)?.[1]).filter((x): x is string => Boolean(x)),
    ];
    const oportunas = fotosOportunas({ entrante: c.texto, respuesta: respuesta.texto, combos, historial: c.historial });
    if (oportunas.length) respuesta = { ...respuesta, fotos: oportunas.map((f) => ({ url: `${urlSitio()}${f.url}`, pie: f.pie })) };
  }
  let salientes = derivar ? [{ tipo: "texto" as const, texto: DERIVADO }] : planWhatsapp(respuesta, pedido);
  // Sin repetir: si el resumen del pedido o la pregunta de la zona ya salieron en los últimos
  // mensajes, no se mandan de nuevo. A Juan le llegó tres veces lo mismo y eso molesta.
  const recientes = c.historial.slice(-6).filter((h) => h.de === "acopio").map((h) => normalizar(h.texto));
  const repetido = (s: Saliente) => {
    const t = normalizar(textoParaPanel(s));
    return recientes.some((h) => h === t || (t.length > 60 && (h.includes(t) || t.includes(h))));
  };
  if (salientes.length > 1) {
    const sinRepetir = salientes.filter((s) => !repetido(s));
    if (sinRepetir.length) salientes = sinRepetir;
  }
  return { salientes, respuesta, derivar, conIA: Boolean(r), guardarPedido: pedido?.camino, aPersona: Boolean(r?.entregaGuardada) };
}




/** Arma el pedido que viene de la web tal cual. Si algo no se encuentra, igual arma el resto y lo dice. */
async function armarPedidoWeb(texto: string, yaSaludo: boolean): Promise<Respuesta | null> {
  const lineas = leerPedidoWeb(texto);
  if (!lineas.length) return null;
  const [productos, combos] = await Promise.all([catalogo(), combosTienda({ activo: true, tipo: "COMBO" })]);
  const { elegidos, faltan } = resolverPedidoWeb(lineas, productos, combos);
  if (!elegidos.length) return null;
  const total = elegidos.reduce((s, e) => s + e.precio, 0);
  const acciones: Accion[] = elegidos.map((e) => ({ tipo: "agregar", clase: e.clase, id: e.id, nombre: e.nombre, cantidad: e.cantidad, precio: pesos(e.precio) }));
  const falta = faltan.length ? ` No encontré ${faltan.join(" y ")} con el precio de hoy: ¿lo cambiamos por otro o seguimos sin eso?` : "";
  return {
    texto: `${yaSaludo ? "¡Listo!" : "¡Hola! Listo,"} ya te armé el pedido de la web tal cual (${elegidos.length} ${elegidos.length === 1 ? "producto" : "productos"}, ${pesos(total)}).${falta} ¿De qué ciudad sos así te digo el envío?`,
    acciones,
    reemplazaPedido: true,
  };
}


/** Lee un comprobante y lo aplica al pedido. Devuelve la nota para el vendedor (o null si no era un comprobante). */
async function procesarComprobante(clave: string, nombre: string | null, mediaId: string): Promise<string | null> {
  const c = await leerComprobante(mediaId).catch(() => null);
  if (!c?.esComprobante) return null;
  const r: ResultadoComprobante = await aplicarComprobante(clave, c).catch(() => ({ tipo: "sin-pedido" as const, monto: c.monto }));
  const quien = nombre ?? clave;
  const monto = r.monto ? pesos(r.monto) : "un monto que no se lee";
  console.log("chat: comprobante", cola(clave), r.tipo, r.monto);
  if (r.tipo === "registrado") {
    await avisarSantiago("Pago por comprobante", `💸 ${quien} mandó el comprobante por ${monto}: coincide con el pedido ${r.codigo} y lo marqué pagado (no hay que cobrarle). Fijate que se haya acreditado.\n${urlSitio()}/admin/whatsapp?c=${clave}`);
    return `[Mandó el comprobante de pago por ${monto}. Ya quedó registrado en su pedido ${r.codigo}: agradecé en una frase y decile que quedó todo listo, que no tiene que abonar nada al recibir. No pidas nada más.]`;
  }
  if (r.tipo === "revisar") {
    await avisarSantiago("Comprobante para revisar", `🧾 ${quien} mandó un comprobante por ${monto}, pero el pedido ${r.codigo} debe ${pesos(r.debe)}. Revisalo antes de cobrar.\n${urlSitio()}/admin/whatsapp?c=${clave}`);
    return `[Mandó un comprobante por ${monto}, pero su pedido ${r.codigo} es de ${pesos(r.debe)}. Agradecé y decile que Santiago lo revisa y le confirma por acá. No confirmes el pago vos.]`;
  }
  await avisarSantiago("Comprobante sin pedido", `🧾 ${quien} mandó un comprobante por ${monto} y no tiene un pedido abierto. Revisalo.\n${urlSitio()}/admin/whatsapp?c=${clave}`);
  return `[Mandó un comprobante por ${monto}. Agradecé y decile que Santiago lo revisa y le confirma por acá.]`;
}


/** Deja escrito en el mensaje del cliente qué se sacó de su foto o archivo: así el próximo mensaje (y el panel) lo ve. */
async function anotarEnMensaje(idMensaje: string, nota: string): Promise<void> {
  const corta = nota.replace(/^\[|\]$/g, "").replace(/:\s*agradecé[\s\S]*$|\. Agradecé[\s\S]*$/i, "").slice(0, 200);
  await prisma.$executeRaw`UPDATE "WhatsappMensaje" SET "texto" = "texto" || ${` 🧾 «${corta}»`} WHERE "id" = ${idMensaje}`.catch(() => null);
}


/** true la primera vez en el día para esa clave (un aviso por charla por día, no uno por respuesta). */
async function primeraVezHoy(clave: string): Promise<boolean> {
  const ya = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "CronCorrida" WHERE "nombre" = ${clave} AND "fecha" > now() - interval '20 hours'`.catch(() => [{ n: 0 }]);
  if ((ya[0]?.n ?? 0) > 0) return false;
  await prisma.$executeRaw`INSERT INTO "CronCorrida" ("nombre", "ok", "detalle") VALUES (${clave}, true, 'aviso')`.catch(() => undefined);
  return true;
}

/**
 * El vendedor retoma una charla que estaba en manos de una persona (o de un agente) y contesta el último
 * mensaje del cliente si quedó sin respuesta. Lo usa «Devolvérsela al vendedor» en el panel.
 */
export async function retomarCharla(clave: string): Promise<boolean> {
  await cambiarEstado(clave, "bot");
  const ultimos = await prisma.$queryRaw<{ de: string; texto: string }[]>`SELECT "de", "texto" FROM "WhatsappMensaje" WHERE "telefono" = ${clave} AND "texto" NOT LIKE '[reacción%' ORDER BY "fecha" DESC LIMIT 1`;
  if (ultimos[0]?.de !== "cliente") return false;
  const texto = ultimos[0].texto.slice(0, 400);
  const guardado = await pedidoGuardado(clave);
  const historial = (await historialDe(clave, 10)).slice(0, -1);
  const conv = await prisma.$queryRaw<{ nombre: string | null; anuncioTitulo: string | null }[]>`SELECT "nombre", "anuncioTitulo" FROM "WhatsappConversacion" WHERE "telefono" = ${clave}`;
  const p = await pensar({ canal: canalDe(clave), texto, toque: null, historial, anuncio: conv[0]?.anuncioTitulo ? { titulo: conv[0].anuncioTitulo, texto: null } : null, nombre: conv[0]?.nombre ?? null, negocio: "", pedidoGuardado: guardado });
  if (p.derivar) return false;
  if (canalDe(clave) === "whatsapp") {
    await responderWhatsapp(clave, p.salientes);
    if (p.guardarPedido) await guardarPedido(clave, p.guardarPedido);
  } else {
    const salida = paraWhatsapp(p.respuesta);
    if (salida) await responder(clave, salida);
  }
  return true;
}
