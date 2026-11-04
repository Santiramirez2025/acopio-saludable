// Ventas reconciliadas por período. «Creados» y «pagados» son cortes distintos: un pedido del lunes pagado el martes
// suma como creado el lunes y como cobrado el martes. El origen es el que guardó el pedido; sin dato queda «desconocido».

export type FilaVenta = {
  id: number;
  estado: string;
  total: number;
  costoProductos: number;
  costoEnvioReal: number;
  comisionPago: number;
  costoPackaging: number;
  origen: string | null;
  telefono: string;
  createdAt: Date;
  pagadoAt: Date | null;
};

const clave = (tel: string) => tel.replace(/\D/g, "").slice(-10);
const dia = (d: Date) => new Date(d.getTime() - 3 * 3_600_000).toISOString().slice(0, 10); // hora argentina
const redondo = (n: number) => Math.round(n);

/** Pedido hecho en el checkout de la web. Los del bot guardan «whatsapp…»; sin origen no se puede afirmar que sea web. */
export function esPedidoWeb(origen: string | null): boolean {
  const o = (origen ?? "").trim();
  return !!o && !/^whatsapp\b/i.test(o);
}

export function grupoOrigen(origen: string | null): string {
  const o = (origen ?? "").trim();
  if (!o) return "desconocido";
  const m = o.match(/anuncio:\s*(.+)/i);
  if (m) return `anuncio: ${m[1].trim().slice(0, 40)}`;
  return o.split(" · ")[0].slice(0, 40);
}

export function resumirVentas(filas: FilaVenta[], todos: { id: number; telefono: string; createdAt: Date }[], desde: Date, dias: number) {
  // El primer pedido no cancelado no se puede saber sin los estados de todos: «nuevo» = sin pedido anterior, cancelado o no.
  const primero = new Map<string, number>();
  for (const t of [...todos].sort((a, b) => a.id - b.id)) {
    const k = clave(t.telefono);
    if (k.length >= 8 && !primero.has(k)) primero.set(k, t.id);
  }
  const creados = filas.filter((f) => f.createdAt >= desde);
  const validos = creados.filter((f) => f.estado !== "CANCELADO");
  const pagados = filas.filter((f) => f.pagadoAt && f.pagadoAt >= desde && f.estado !== "CANCELADO");
  const suma = (xs: FilaVenta[]) => redondo(xs.reduce((s, f) => s + f.total, 0));
  const contribucion = (f: FilaVenta) => f.total - f.costoProductos - f.costoEnvioReal - f.comisionPago - f.costoPackaging;

  const porOrigen = new Map<string, { creados: number; facturado: number; pagados: number; cobrado: number }>();
  const fila = (o: string) => porOrigen.get(o) ?? { creados: 0, facturado: 0, pagados: 0, cobrado: 0 };
  for (const f of validos) {
    const g = grupoOrigen(f.origen);
    const r = fila(g);
    r.creados++;
    r.facturado += redondo(f.total);
    porOrigen.set(g, r);
  }
  for (const f of pagados) {
    const g = grupoOrigen(f.origen);
    const r = fila(g);
    r.pagados++;
    r.cobrado += redondo(f.total);
    porOrigen.set(g, r);
  }

  const porDia = new Map<string, { creados: number; facturado: number; pagados: number; cobrado: number }>();
  const diaDe = (d: string) => porDia.get(d) ?? { creados: 0, facturado: 0, pagados: 0, cobrado: 0 };
  for (const f of validos) {
    const k = dia(f.createdAt);
    const r = diaDe(k);
    r.creados++;
    r.facturado += redondo(f.total);
    porDia.set(k, r);
  }
  for (const f of pagados) {
    const k = dia(f.pagadoAt as Date);
    const r = diaDe(k);
    r.pagados++;
    r.cobrado += redondo(f.total);
    porDia.set(k, r);
  }

  const esNuevo = (f: FilaVenta) => primero.get(clave(f.telefono)) === f.id;
  const conTel = validos.filter((f) => clave(f.telefono).length >= 8);
  return {
    dias,
    desde: desde.toISOString(),
    creados: { pedidos: validos.length, facturado: suma(validos), cancelados: creados.length - validos.length, clientesNuevos: conTel.filter(esNuevo).length, clientesRepiten: conTel.filter((f) => !esNuevo(f)).length, sinTelefono: validos.length - conTel.length },
    pagados: { pedidos: pagados.length, cobrado: suma(pagados), contribucion: redondo(pagados.reduce((s, f) => s + contribucion(f), 0)) },
    abiertosSinPago: (() => {
      const a = validos.filter((f) => !f.pagadoAt);
      return { pedidos: a.length, total: suma(a) };
    })(),
    porOrigen: [...porOrigen.entries()].sort((a, b) => b[1].cobrado - a[1].cobrado || b[1].creados - a[1].creados).map(([origen, v]) => ({ origen, ...v })),
    porDia: [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([fecha, v]) => ({ fecha, ...v })),
    nota: "creados y pagados son cortes distintos. Contribución: total − costos guardados en el pedido; depende de los costos cargados, los mixes sin receta medida pueden estar subestimados. abiertosSinPago: solo los creados en el período.",
  };
}
