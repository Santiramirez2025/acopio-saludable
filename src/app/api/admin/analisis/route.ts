// Radiografía del negocio para replantear el catálogo: qué se vendió, qué preguntó la gente y qué
// tiene La Granja hoy. Solo administrador. GET ?parte=pedidos|whatsapp|catalogo|lagranja|harinar
import { esAdmin } from "@/lib/admin-acceso";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { proveedorDe } from "@/lib/proveedores";
import { filasDePdf } from "@/lib/listas-pdf-leer";
import { parsearLista } from "@/lib/listas-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const n = (d: unknown) => Math.round(Number(d) || 0);

const TEMAS: [string, RegExp][] = [
  ["nuez", /nuez|nueces/], ["almendra", /almendr/], ["cajú", /caj[uú]|castañ/], ["mix", /\bmix\b/], ["pasas", /pasa/],
  ["dátiles", /d[aá]til/], ["semillas", /semilla|ch[ií]a|lino|girasol|zapallo|s[eé]samo/], ["avena", /avena/], ["granola", /granola/],
  ["maní", /man[ií]\b|man[ií] /], ["sin tacc", /tacc|cel[ií]ac|gluten/], ["harinas", /harina/], ["miel", /\bmiel\b/],
  ["ciruelas", /ciruela/], ["pan dulce/navidad", /pan dulce|navid|fiesta|regalo/], ["despensa/combo", /despensa|combo|alacena/],
  ["keto/proteína", /keto|prote/], ["legumbres", /lenteja|garbanzo|poroto/], ["cacao/chocolate", /cacao|chocolate/],
  ["precio", /precio|cu[aá]nto|sale|vale/], ["envío", /env[ií]o|llega|mandan|domicilio/], ["mercado libre", /mercado ?libre|\bml\b/],
  ["tarjeta/cuotas", /tarjeta|cuota|cr[eé]dito/], ["transferencia", /transfer/], ["retiro/local", /retir|local|direcci[oó]n|d[oó]nde est/],
  ["mayorista/negocio", /mayor|negocio|revend|kiosco|dietética|dietetica/],
];

async function pedidos() {
  const os0 = await prisma.order.findMany({ include: { items: true }, orderBy: { id: "asc" } });
  const origenes = await prisma.$queryRaw<{ id: number; origen: string | null }[]>`SELECT "id", "origen" FROM "Order"`.catch(() => []);
  const os = os0.map((o) => ({ ...o, origen: origenes.find((x) => x.id === o.id)?.origen ?? null }));
  const validos = os.filter((o) => o.estado !== "CANCELADO");
  const productos = new Map<string, { veces: number; unidades: number; ventas: number; margen: number; proveedor: string }>();
  const combos = new Map<string, number>();
  for (const o of validos)
    for (const i of o.items) {
      const k = `${i.producto} ${i.presentacion}`.slice(0, 60);
      const p = productos.get(k) ?? { veces: 0, unidades: 0, ventas: 0, margen: 0, proveedor: proveedorDe({ producto: i.producto, codigo: i.codigo }) };
      p.veces++;
      p.unidades += i.cantidad;
      p.ventas += n(i.precioUnitario) * i.cantidad;
      p.margen += (n(i.precioUnitario) - n(i.costoUnitario)) * i.cantidad;
      productos.set(k, p);
      if (i.comboSlug) combos.set(i.comboSlug, (combos.get(i.comboSlug) ?? 0) + 1);
    }
  return {
    total: os.length,
    porEstado: Object.fromEntries([...new Set(os.map((o) => o.estado))].map((e) => [e, os.filter((o) => o.estado === e).length])),
    facturado: validos.reduce((s, o) => s + n(o.total), 0),
    margen: validos.reduce((s, o) => s + n(o.total) - n(o.costoProductos) - n(o.costoEnvioReal) - n(o.comisionPago) - n(o.costoPackaging), 0),
    ticket: validos.length ? Math.round(validos.reduce((s, o) => s + n(o.total), 0) / validos.length) : 0,
    ciudades: Object.entries(validos.reduce<Record<string, number>>((a, o) => ((a[o.ciudad] = (a[o.ciudad] ?? 0) + 1), a), {})),
    origen: Object.entries(validos.reduce<Record<string, number>>((a, o) => ((a[(o.origen ?? "sin dato").slice(0, 30)] = (a[(o.origen ?? "sin dato").slice(0, 30)] ?? 0) + 1), a), {})),
    pago: Object.entries(validos.reduce<Record<string, number>>((a, o) => ((a[o.medioPago] = (a[o.medioPago] ?? 0) + 1), a), {})),
    combos: [...combos.entries()],
    productos: [...productos.entries()].sort((a, b) => b[1].veces - a[1].veces).slice(0, 40).map(([k, v]) => [k, v.veces, v.unidades, v.ventas, v.margen, v.proveedor]),
  };
}

async function whatsapp() {
  const cs = await prisma.$queryRaw<{ telefono: string; anuncioTitulo: string | null; prospecto: string | null; pedido: string | null }[]>`SELECT "telefono", "anuncioTitulo", "prospecto", "pedido" FROM "WhatsappConversacion"`;
  const ms = await prisma.$queryRaw<{ telefono: string; texto: string }[]>`SELECT "telefono", "texto" FROM "WhatsappMensaje" WHERE "de" = 'cliente'`;
  const temas: Record<string, number> = {};
  const porCharla = new Map<string, string>();
  for (const m of ms) porCharla.set(m.telefono, `${porCharla.get(m.telefono) ?? ""} ${m.texto.toLowerCase()}`);
  for (const t of porCharla.values()) for (const [nombre, re] of TEMAS) if (re.test(t)) temas[nombre] = (temas[nombre] ?? 0) + 1;
  const anuncios: Record<string, number> = {};
  for (const c of cs) if (c.anuncioTitulo) anuncios[c.anuncioTitulo.slice(0, 40)] = (anuncios[c.anuncioTitulo.slice(0, 40)] ?? 0) + 1;
  return {
    charlas: cs.length,
    deClientes: cs.filter((c) => !c.prospecto).length,
    prospectos: cs.filter((c) => c.prospecto).length,
    conPedidoArmado: cs.filter((c) => c.pedido).length,
    mensajesCliente: ms.length,
    temasPorCharla: Object.entries(temas).sort((a, b) => b[1] - a[1]),
    anuncios: Object.entries(anuncios).sort((a, b) => b[1] - a[1]).slice(0, 12),
  };
}

async function catalogo() {
  const ps = await prisma.product.findMany({ where: { estado: "ACTIVO", visible: true }, select: { codigo: true, producto: true, marca: true, presentacion: true, categoria: true, precioPublico: true, costo: true, vendidos: true } });
  const por: Record<string, number> = {};
  for (const p of ps) {
    const pr = proveedorDe(p);
    por[pr] = (por[pr] ?? 0) + 1;
  }
  const propios = ps.filter((p) => proveedorDe(p) !== "distrimay").map((p) => [p.codigo, `${p.producto} ${p.presentacion}`.slice(0, 50), n(p.precioPublico), n(p.costo), p.vendidos]);
  const masVendidos = ps.sort((a, b) => b.vendidos - a.vendidos).slice(0, 20).map((p) => [p.codigo, `${p.producto} ${p.presentacion}`.slice(0, 45), p.vendidos, proveedorDe(p)]);
  return { activos: ps.length, porProveedor: por, masVendidos, propios };
}

async function lagranja() {
  const home = await fetch("https://lagranjadelcentro.com.ar/", { signal: AbortSignal.timeout(20_000) }).then((r) => r.text()).catch(() => "");
  const m = home.match(/href="([^"]*lista-precios-web\/[^"]+\.pdf)"/i);
  if (!m) return { error: "sin link" };
  const url = new URL(m[1].replace(/&amp;/g, "&"), "https://lagranjadelcentro.com.ar/").toString();
  const buf = await fetch(url, { signal: AbortSignal.timeout(60_000) }).then((r) => r.arrayBuffer());
  const { filas } = await filasDePdf(new Uint8Array(buf));
  const lista = parsearLista(filas);
  return { archivo: decodeURIComponent(url.split("/").pop() ?? ""), renglones: lista.length, lista: lista.map((r) => [r.codigo, r.nombre.slice(0, 48), r.precio]) };
}

/** Harinar vs La Granja por kilo, y qué se compra en cada uno (ver lib/harinar.ts). */
async function harinar() {
  const harinarLib = await import("@/lib/harinar");
  const { listaHarinar, comparar, COMPRAR_EN_HARINAR } = harinarLib;
  const [vivo, g] = await Promise.all([listaHarinar(), lagranja()]);
  const enVivo = vivo.length > 0;
  const h = enVivo ? vivo : harinarLib.PRECIOS_REFERENCIA.lista;
  const lista = "lista" in g ? (g.lista as [string, string, number][]) : [];
  const comparacion = comparar(h, lista);
  return { comprarEnHarinar: COMPRAR_EN_HARINAR, productosHarinar: h.length, preciosHarinar: enVivo ? "en vivo" : `de referencia del ${harinarLib.PRECIOS_REFERENCIA.fecha}: Pediwa no deja leer el catálogo desde el servidor; si cambian, pedile a Santiago la lista nueva`, lectura: harinarLib.estadoLectura, listaGranja: "archivo" in g ? g.archivo : null, comparacion, alertas: comparacion.filter((c) => c.alerta) };
}

export async function GET(req: Request) {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parte = new URL(req.url).searchParams.get("parte");
  const f = { pedidos, whatsapp, catalogo, lagranja, harinar }[parte ?? ""];
  if (!f) return NextResponse.json({ error: "parte = pedidos | whatsapp | catalogo | lagranja | harinar" }, { status: 400 });
  return NextResponse.json(await f());
}
