// Prospección por WhatsApp, solo para el administrador.
//
// GET                              → estado de las plantillas en Meta (pendiente, aprobada, rechazada).
// POST { accion: "plantillas", solo? } → da de alta las plantillas (o solo esa) para que Meta las revise.
// POST { accion: "borrar", nombres } → borra plantillas de alojamientos por nombre.
// POST { accion: "enviar", lista } → manda la plantilla a cada número de la lista, de a uno.
//
// El envío se saltea a quien ya se le escribió y a quien pidió no recibir más. Con
// { forzar: true } se puede repetir a propósito (por ejemplo, la prueba a tu propio número).

import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { crearPlantillaAviso } from "@/lib/avisos";
import { crearPlantillaComprobante } from "@/lib/comprobante-envio";
import { avisarReparto, crearPlantillaReparto, crearPlantillaRepartoHoy } from "@/lib/aviso-reparto";
import { crearPlantillaSeguimiento, plantillaSeguimiento } from "@/lib/seguimiento";
import { registrarSalida } from "@/lib/whatsapp-memoria";
import { planReprogramar, telefonosDeLista } from "@/lib/reprogramar";
import { planReparto, telefonosReparto } from "@/lib/reparto-plan";
import { prisma } from "@/lib/prisma";
import { correrReactivacion, crearPlantillaReactivacion } from "@/lib/reactivacion";
import { correrRecompra, crearPlantillaRecompra } from "@/lib/recompra";
import { correrRegalo, crearPlantillaRegalo, topeRegalo } from "@/lib/regalo-recetas";
import { avisarViajeCordoba, crearPlantillaViaje } from "@/lib/viaje-cordoba";
import { leerConfig } from "@/lib/config";
import { zonaPagaDe } from "@/lib/envios/tabla";
import { cargarSemilla, correrOrganico, leccionesActivas, type Semilla } from "@/lib/organico";
import { crearPlantillaPedidoProveedor, crearPlantillaProveedor, enviarPedidoProveedor, enviarProveedor } from "@/lib/whatsapp-proveedores";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { borrarPlantilla, crearPlantillas, enviarProspecto, estadoPlantillas, type ResultadoEnvio } from "@/lib/whatsapp-prospectos";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TOPE = 60; // por llamada: entra en el tiempo de una función y se ve el resultado tanda por tanda

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await estadoPlantillas());
}

export async function POST(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let cuerpo: { accion?: unknown; lista?: unknown; forzar?: unknown; cantidad?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (cuerpo.accion === "plantillas") return NextResponse.json(await crearPlantillas(typeof (cuerpo as { solo?: unknown }).solo === "string" ? (cuerpo as { solo: string }).solo : undefined));
  if (cuerpo.accion === "plantilla-proveedor") return NextResponse.json(await crearPlantillaProveedor());
  if (cuerpo.accion === "proveedor") {
    const o = cuerpo as { telefono?: unknown; negocio?: unknown };
    return NextResponse.json(await enviarProveedor(String(o.telefono ?? ""), String(o.negocio ?? "")));
  }
  if (cuerpo.accion === "plantilla-pedido-proveedor") return NextResponse.json(await crearPlantillaPedidoProveedor());
  if (cuerpo.accion === "pedido-proveedor") {
    const o = cuerpo as { telefono?: unknown; nombre?: unknown; dia?: unknown; pedido?: unknown };
    return NextResponse.json(await enviarPedidoProveedor(String(o.telefono ?? ""), String(o.nombre ?? ""), String(o.dia ?? ""), String(o.pedido ?? "")));
  }
  if (cuerpo.accion === "plantilla-aviso") return NextResponse.json(await crearPlantillaAviso());
  if (cuerpo.accion === "plantilla-seguimiento") return NextResponse.json(await crearPlantillaSeguimiento());
  if (cuerpo.accion === "plantilla-reactivacion") return NextResponse.json(await crearPlantillaReactivacion());
  if (cuerpo.accion === "reactivacion") return NextResponse.json(await correrReactivacion());
  if (cuerpo.accion === "plantilla-recompra") return NextResponse.json(await crearPlantillaRecompra());
  if (cuerpo.accion === "plantilla-viaje") return NextResponse.json(await crearPlantillaViaje());
  if (cuerpo.accion === "viaje-cordoba") {
    const c = cuerpo as { telefonos?: unknown; cuando?: unknown };
    const telefonos = Array.isArray(c.telefonos) ? c.telefonos.filter((t): t is string => typeof t === "string") : [];
    if (!telefonos.length || typeof c.cuando !== "string" || !c.cuando.trim()) return NextResponse.json({ error: "faltan telefonos o cuando" }, { status: 400 });
    const cfgViaje = await leerConfig();
    return NextResponse.json(await avisarViajeCordoba(telefonos, c.cuando.trim().slice(0, 40), zonaPagaDe(cfgViaje.tabla)?.precio ?? null));
  }
  if (cuerpo.accion === "plantilla-regalo") return NextResponse.json(await crearPlantillaRegalo());
  // Regalo de recetas a clientes: sin `forzar: true` solo dice a quién le llegaría. Por tandas: `cantidad` (20 por defecto, 40 como mucho).
  if (cuerpo.accion === "regalo") return NextResponse.json(await correrRegalo(cuerpo.forzar !== true, topeRegalo(cuerpo.cantidad)));
  if (cuerpo.accion === "recompra") return NextResponse.json(await correrRecompra());
  // Captación orgánica: cargar negocios a la lista, correr el día ahora, ver las lecciones.
  if (cuerpo.accion === "semilla") return NextResponse.json(await cargarSemilla(Array.isArray(cuerpo.lista) ? (cuerpo.lista as Semilla[]) : []));
  if (cuerpo.accion === "organico") return NextResponse.json(await correrOrganico({ cantidad: typeof cuerpo.cantidad === "number" ? cuerpo.cantidad : undefined }));
  if (cuerpo.accion === "lecciones") return NextResponse.json(await leccionesActivas());
  if (cuerpo.accion === "plantilla-reparto") return NextResponse.json(await crearPlantillaReparto());
  if (cuerpo.accion === "plantilla-reparto-hoy") return NextResponse.json(await crearPlantillaRepartoHoy());
  if (cuerpo.accion === "reparto") {
    // 25/11 (seguridad): respeta el bloqueo y la baja, normaliza, no repite y frena montos sin «$» (como reprogramar).
    const tels = telefonosReparto(cuerpo.lista);
    const filas = tels.length
      ? await prisma.$queryRaw<{ telefono: string }[]>`SELECT "telefono" FROM "WhatsappConversacion" WHERE "baja" = true AND "telefono" = ANY(${tels})`
      : [];
    const plan = planReparto(cuerpo.lista, new Set(filas.map((f: { telefono: string }) => f.telefono)));
    const r: Record<string, unknown> = {};
    for (const o of plan.enviar) r[o.pedido] = await avisarReparto(o.telefono, o.nombre, o.pedido, o.hora, o.texto);
    for (const k of Object.keys(plan.salteados)) r[k] = null;
    return NextResponse.json({ ...r, salteados: plan.salteados });
  }
  // 23/11: reprogramar pedidos con la ventana de 24 h cerrada (feriado, se pasó el reparto al martes).
  // Plantilla acopio_seguimiento_v1: «Te lo guardamos y te lo podemos llevar el {{2}}. ¿Lo agendamos?».
  if (cuerpo.accion === "reprogramar") {
    // 24/11 (seguridad): respeta el bloqueo y la baja (como viaje-cordoba y los crons), normaliza y no repite.
    const tels = telefonosDeLista(cuerpo.lista);
    const filas = tels.length
      ? await prisma.$queryRaw<{ telefono: string }[]>`SELECT "telefono" FROM "WhatsappConversacion" WHERE "baja" = true AND "telefono" = ANY(${tels})`
      : [];
    const plan = planReprogramar(cuerpo.lista, new Set(filas.map((f: { telefono: string }) => f.telefono)));
    const r: Record<string, boolean> = {};
    for (const o of plan.enviar) {
      const ok = await plantillaSeguimiento(o.telefono, o.nombre, o.dia);
      if (ok) await registrarSalida(o.telefono, "persona", `[Plantilla reprogramar] ${o.pedido}: te lo llevamos el ${o.dia}`).catch(() => undefined);
      r[o.pedido || o.telefono.slice(-4)] = ok;
    }
    for (const k of Object.keys(plan.salteados)) r[k] = false;
    return NextResponse.json({ ...r, salteados: plan.salteados });
  }
  if (cuerpo.accion === "plantilla-comprobante") return NextResponse.json(await crearPlantillaComprobante());

  if (cuerpo.accion === "borrar") {
    const nombres = Array.isArray((cuerpo as { nombres?: unknown }).nombres) ? ((cuerpo as { nombres: unknown[] }).nombres).slice(0, 10).map(String) : [];
    const salida: Record<string, unknown> = {};
    for (const n of nombres) salida[n] = await borrarPlantilla(n);
    return NextResponse.json(salida);
  }

  if (cuerpo.accion === "enviar") {
    const lista = Array.isArray(cuerpo.lista) ? cuerpo.lista.slice(0, TOPE) : [];
    if (!lista.length) return NextResponse.json({ error: "La lista está vacía" }, { status: 400 });
    const resultados: ResultadoEnvio[] = [];
    for (const it of lista) {
      const o = (it ?? {}) as Record<string, unknown>;
      resultados.push(await enviarProspecto(String(o.telefono ?? ""), String(o.negocio ?? ""), String(o.rubro ?? ""), cuerpo.forzar === true));
      await new Promise((r) => setTimeout(r, 400)); // sin ráfagas: Meta mira el ritmo
    }
    return NextResponse.json({
      enviados: resultados.filter((r) => r.ok).length,
      salteados: resultados.filter((r) => !r.ok).length,
      resultados,
    });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
