// Gráficos del panel en SVG, sin librerías. Colores de serie validados para daltonismo (azul y naranja);
// el texto va siempre en tinta neutra y cada gráfico tiene su tabla al lado o debajo.

const AZUL = "#2a78d6";
const NARANJA = "#eb6834";
const pesosCortos = (n: number) => (n >= 1e6 ? `$ ${(n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M` : n >= 1000 ? `$ ${Math.round(n / 1000).toLocaleString("es-AR")} mil` : `$ ${Math.round(n).toLocaleString("es-AR")}`);
const pesosLargos = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const fechaCorta = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

function techo(max: number): number {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 2.5, 5, 10].map((k) => k * p).find((v) => v >= max)!;
}

/** Ventas por día: una sola serie, barras finas ancladas a la base. */
export function BarrasPorDia({ datos }: { datos: { dia: string; ventas: number; pedidos: number }[] }) {
  const W = 760, H = 220, izq = 64, der = 8, arriba = 10, abajo = 24;
  const max = techo(Math.max(...datos.map((d) => d.ventas), 0));
  const ancho = (W - izq - der) / Math.max(1, datos.length);
  const barra = Math.max(2, Math.min(28, ancho - 2));
  const y = (v: number) => arriba + (H - arriba - abajo) * (1 - v / max);
  const cada = Math.ceil(datos.length / 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ventas por día" className="w-full">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={izq} x2={W - der} y1={y(max * f)} y2={y(max * f)} stroke="#e7e5e4" strokeWidth={1} />
          <text x={izq - 6} y={y(max * f) + 4} textAnchor="end" fontSize={11} fill="#78716c">{pesosCortos(max * f)}</text>
        </g>
      ))}
      {datos.map((d, i) => {
        const x = izq + i * ancho + (ancho - barra) / 2;
        const alto = Math.max(d.ventas > 0 ? 2 : 0, H - abajo - y(d.ventas));
        const r = Math.min(4, barra / 2, alto);
        return (
          <g key={d.dia} className="group">
            {/* zona de hover más grande que la barra */}
            <rect x={izq + i * ancho} y={arriba} width={ancho} height={H - arriba - abajo} fill="transparent">
              <title>{`${fechaCorta(d.dia)}: ${pesosLargos(d.ventas)} en ${d.pedidos} ${d.pedidos === 1 ? "pedido" : "pedidos"}`}</title>
            </rect>
            {alto > 0 && (
              <path d={`M${x},${H - abajo} v${-(alto - r)} q0,${-r} ${r},${-r} h${barra - 2 * r} q${r},0 ${r},${r} v${alto - r} z`} fill={AZUL} className="pointer-events-none group-hover:opacity-70" />
            )}
            {i % cada === 0 && <text x={izq + i * ancho + ancho / 2} y={H - 7} textAnchor="middle" fontSize={11} fill="#78716c">{fechaCorta(d.dia)}</text>}
          </g>
        );
      })}
      <line x1={izq} x2={W - der} y1={H - abajo} y2={H - abajo} stroke="#a8a29e" strokeWidth={1} />
    </svg>
  );
}

/** Historial de costo y precio de un producto. Escalonado: un precio vale hasta el siguiente cambio. */
export function LineasHistorial({ puntos }: { puntos: { fecha: Date; costo: number; precio: number }[] }) {
  if (puntos.length < 2) return <p className="text-sm text-stone-500">Todavía hay un solo registro: el gráfico aparece cuando cambie el precio o el costo.</p>;
  const W = 520, H = 200, izq = 62, der = 70, arriba = 12, abajo = 24;
  const t0 = puntos[0].fecha.getTime();
  const t1 = Math.max(Date.now(), puntos[puntos.length - 1].fecha.getTime());
  const valores = puntos.flatMap((p) => [p.costo, p.precio]);
  const min = Math.min(...valores), max = Math.max(...valores);
  const margen = (max - min || max || 1) * 0.15;
  const lo = Math.max(0, min - margen), hi = max + margen;
  const x = (t: number) => izq + ((W - izq - der) * (t - t0)) / Math.max(1, t1 - t0);
  const y = (v: number) => arriba + (H - arriba - abajo) * (1 - (v - lo) / (hi - lo));
  const escalera = (campo: "costo" | "precio") => puntos.map((p, i) => (i === 0 ? `M${x(p.fecha.getTime())},${y(p[campo])}` : `H${x(p.fecha.getTime())} V${y(p[campo])}`)).join(" ") + ` H${x(t1)}`;
  const ultimo = puntos[puntos.length - 1];
  const fecha = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "numeric", timeZone: "America/Argentina/Cordoba" });
  // Si las dos etiquetas finales quedan pegadas, se separan.
  let yPrecio = y(ultimo.precio), yCosto = y(ultimo.costo);
  if (Math.abs(yPrecio - yCosto) < 14) { yPrecio -= 7; yCosto += 7; }
  const series = [["precio", "Precio público", AZUL, yPrecio], ["costo", "Costo", NARANJA, yCosto]] as const;
  return (
    <div>
      <div className="mb-1 flex gap-4 text-xs text-stone-600">
        {series.map(([, nombre, color]) => (
          <span key={nombre} className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: color }} />{nombre}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Historial de costo y precio público" className="w-full">
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g key={v}>
            <line x1={izq} x2={W - der} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth={1} />
            <text x={izq - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#78716c">{pesosCortos(v)}</text>
          </g>
        ))}
        <text x={izq} y={H - 6} fontSize={11} fill="#78716c">{fecha(puntos[0].fecha)}</text>
        <text x={W - der} y={H - 6} textAnchor="end" fontSize={11} fill="#78716c">hoy</text>
        {series.map(([campo, nombre, color, yEtiqueta]) => (
          <g key={campo}>
            <path d={escalera(campo)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
            {puntos.map((p) => (
              <circle key={p.fecha.getTime()} cx={x(p.fecha.getTime())} cy={y(p[campo])} r={4} fill={color} stroke="#fff" strokeWidth={2}>
                <title>{`${nombre} desde el ${fecha(p.fecha)}: ${pesosLargos(p[campo])}`}</title>
              </circle>
            ))}
            <text x={W - der + 6} y={yEtiqueta + 4} fontSize={11} fill="#44403c">{pesosCortos(ultimo[campo])}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
