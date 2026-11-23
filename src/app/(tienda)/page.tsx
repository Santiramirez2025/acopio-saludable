import type { Metadata } from "next";
import { InstalarApp } from "@/components/InstalarApp";
import { GONDOLAS } from "@/lib/gondolas";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { leerConfig } from "@/lib/config";
import { AVISO_SIN_TACC, WHERE_SIN_TACC, wherePublicado } from "@/lib/filtros-producto";
import { combosTienda, productosTienda, type ComboTienda, type ProductoTienda } from "@/lib/tienda";
import { NICHOS, OBJETIVOS } from "@/lib/taxonomia";
import { pesos, precioPorUnidadSuelta } from "@/lib/precios";
import { umbralZona, zonaSinMinimo } from "@/lib/minimo-zona";
import { Foto } from "@/components/Foto";
import { BotonCargarPedido } from "@/components/Carrito";
import { DestacadoComboInicio, DestacadoInicio } from "@/components/DestacadoInicio";
import { atajoCombo, DESTACADO_PRODUCTO, DESTACADO_SI_FALTA, elegirDestacado, KIT_SEMANAL } from "@/lib/destacado-inicio";
import { totalTransferencia } from "@/lib/combos-tema";
import { pctTransferenciaCombo } from "@/lib/precio-fijo";
import { DibujoNutri } from "@/components/Nutri";
import { BandaSeccion, BotonVer, ListaCombo, RielProductos, RielSellado, TarjetaCombo, TituloSeccion } from "@/components/Tienda";
import { promosDeLaSemana } from "@/lib/promo-proveedor";
import { ofertasDelProveedor } from "@/lib/ofertas";
import { vidrieraDeStock } from "@/lib/en-stock";
import { POR_ENCARGO } from "@/lib/catalogo-encargo";
import { diasHasta, temporadaActual } from "@/lib/temporada";

// Portadas propias de las góndolas; las demás usan la foto de un producto.

export const metadata: Metadata = { alternates: { canonical: "/" } };

// El mix de la casa (orden de Santiago 4/11): va en la primera pantalla, con precio y para pedir de una.
// Si el mix está sin stock (falta almendra), va el Trío del desayuno (orden de Laura 10/11); si tampoco, las pasas.

export default async function Home() {
  const cfg = await leerConfig();
  const publicado = wherePublicado(cfg.margenMinimoPct);
  const [alfajores, sinTacc, totalSinTacc, ganchos, combos, pedidos, portadas, conteos, vendibles, ofertas, candidatos, deEncargo] = await Promise.all([
    // Las cajas primero y las más baratas adelante: el gancho es cuánto sale el alfajor suelto.
    productosTienda({ where: { AND: [WHERE_SIN_TACC, { producto: { contains: "alfajor", mode: "insensitive" } }, { fotoUrl: { not: null } }] }, orderBy: [{ precioPublico: "asc" }], take: 4 }),
    productosTienda({ where: { AND: [WHERE_SIN_TACC, { fotoUrl: { not: null } }] }, take: 8 }),
    prisma.product.count({ where: { AND: [publicado, WHERE_SIN_TACC] } }),
    productosTienda({ where: { gancho: true }, take: 60 }),
    combosTienda({ tipo: "COMBO", activo: true }),
    combosTienda({ tipo: "PEDIDO_NICHO", activo: true }),
    prisma.product.findMany({ where: { AND: [publicado, { fotoUrl: { not: null } }] }, distinct: ["categoria"], orderBy: [{ categoria: "asc" }, { gancho: "desc" }, { vendidos: "desc" }, { precioPublico: "desc" }], select: { categoria: true, fotoUrl: true } }),
    prisma.product.groupBy({ by: ["categoria"], where: publicado, _count: true, orderBy: { _count: { categoria: "desc" } } }),
    prisma.product.findMany({ where: { AND: [publicado, { comboItems: { some: { combo: { tipo: "PEDIDO_NICHO" } } } }] }, select: { codigo: true } }),
    ofertasDelProveedor(8),
    productosTienda({ where: { codigo: { in: [DESTACADO_PRODUCTO, DESTACADO_SI_FALTA] } } }),
    // Una vidriera variada de lo nuevo por encargo: uno por góndola primero.
    productosTienda({ where: { codigo: { in: [...POR_ENCARGO] } }, take: 80 }),
  ]);
  const nuevos = (() => {
    const vistos = new Set<string>();
    const primero = deEncargo.filter((p) => p.fotoUrl && !vistos.has(p.categoria) && vistos.add(p.categoria));
    return [...primero, ...deEncargo.filter((p) => p.fotoUrl && !primero.includes(p))].slice(0, 12);
  })();
  // Banda «Ofertas y promociones» (23/11): primero lo que de verdad bajó de precio («Promo semanal», con el
  // precio de antes tachado) y después lo que el proveedor tiene en promo esta semana y nosotros publicamos
  // («Destacado de la semana»: el sello de promo solo va si nuestro precio bajó).
  const enPromo = await promosDeLaSemana().catch(() => []);
  const dePromo = enPromo.length ? await productosTienda({ where: { codigo: { in: enPromo.map((x) => x.codigo) }, fotoUrl: { not: null } }, take: 12 }) : [];
  const banda = [
    ...ofertas.map((o) => ({ ...o, sello: "promo" as const })),
    ...dePromo.filter((p) => !ofertas.some((o) => o.codigo === p.codigo)).map((p) => ({ ...p, sello: "destacado" as const })),
  ].slice(0, 8);
  const destacado = elegirDestacado<ProductoTienda, ComboTienda>(candidatos, combos);
  const atajo = atajoCombo(combos);
  // Las cajas de alfajores van al lado del kit; las tapitas ya están adentro del kit.
  const cajasAlfajor = alfajores.filter((p) => p.codigo !== "LG-NATUZEN-TAPAS").slice(0, 3);
  const kitAlfajores = combos.find((c) => c.slug === "kit-alfajores-sin-tacc" && c.disponible !== false) ?? null;
  const seVende = new Set(vendibles.map((v) => v.codigo));
  // Los destacados son lo que tenemos en mano: uno por producto, con foto, y lo que más se vende primero.
  const vidriera = (() => { const v = vidrieraDeStock(ganchos, true); return (v.length >= 4 ? v : ganchos).slice(0, 8); })();
  // El precio más bajo por alfajor suelto entre las cajas: es el número del aviso de la promo.
  const alfajorDesde = Math.min(...alfajores.map((p) => precioPorUnidadSuelta(p.precio, p.presentacion) ?? p.precio));
  const disponibles = combos.filter((c) => c.disponible);
  // La fecha que se viene (Navidad, verano...): sus combos van arriba de todo mientras dura.
  const temporada = temporadaActual();
  const deTemporada = temporada ? temporada.slugs.map((s) => disponibles.find((c) => c.slug === s)).filter((c): c is (typeof disponibles)[number] => Boolean(c)) : [];
  const faltanDias = temporada ? diasHasta(temporada) : 0;
  const portada = new Map(portadas.map((p) => [p.categoria, p.fotoUrl]));
  const categorias = conteos.filter((c) => c.categoria !== "Sin categoría");
  const pasos = [
    ["Elegí", "Por rubro, por objetivo o buscando lo que necesitás."],
    zonaSinMinimo(cfg)
      ? ["Sumá lo que quieras", `En Carlos Paz y la zona no hay compra mínima: envío ${pesos(cfg.envioBajoMinimo)} y pagás al recibir. Al resto del país, compra mínima de ${pesos(cfg.compraMinima)}.`]
      : [`Llegá a ${pesos(cfg.compraMinima)}`, "Es la compra mínima. El medidor te va diciendo cuánto falta."],
    ["Recibilo", cfg.entregaPropiaActiva ? `En Carlos Paz y el sur de Punilla te lo llevamos en ${cfg.plazoEntregaPropia}. Al resto del país, por correo en 3 a 9 días hábiles.` : "Lo compramos para vos y te lo enviamos por correo a todo el país en 3 a 9 días hábiles."],
  ];

  return (
    <div className="space-y-9 md:space-y-12">
      <section className="fondo-oscuro relative isolate -mx-4 -mt-5 overflow-hidden bg-acopio-900 px-4 pb-6 pt-4 text-white md:mx-0 md:mt-0 md:rounded-3xl md:px-10 md:py-12">
        {/* En el celular la foto va de fondo, bien oscurecida para que el texto se lea. */}
        <Image src="/img/portadas/hero.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-25 lg:hidden" />
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
          <div className="min-w-0">
            <h1 className="text-balance font-display text-[clamp(30px,9vw,38px)] font-extrabold leading-none tracking-tight sm:text-6xl">
              Llená tu despensa de una sola vez.
            </h1>
            {/* 14/11 (Santiago: «para la primera impresión son muchos botones, te puede marear»): una frase, una
                propuesta (el Kit semanal) y una sola salida al catálogo. Rubros, sin TACC y herramientas van más abajo. */}
            <p className="mt-3 max-w-md text-[15px] text-white/80 sm:text-[17px]">
              Frutos secos, semillas y dietética fraccionados en el día.{" "}
              {zonaSinMinimo(cfg) ? <>En Carlos Paz te lo llevamos por {pesos(cfg.envioBajoMinimo)} y lo pagás al recibir.</> : cfg.entregaPropiaActiva ? <>En Carlos Paz te lo llevamos en {cfg.plazoEntregaPropia}.</> : <>Envíos a todo el país.</>}
            </p>
            {destacado?.tipo === "producto" && <DestacadoInicio p={destacado.p} etiqueta={destacado.esLaCasa ? "El mix de la casa" : "El más vendido"} />}
            {destacado?.tipo === "combo" && (
              <DestacadoComboInicio
                c={destacado.c}
                etiqueta={destacado.c.slug === "kit-semanal" ? "Para toda la semana" : "Combo de la semana"}
                transferencia={pctTransferenciaCombo(destacado.c.slug, cfg.descuentoTransferenciaPct) > 0 ? totalTransferencia(destacado.c.precio, cfg.descuentoTransferenciaPct) : null}
              />
            )}
            <Link href="/catalogo" className="mt-4 inline-flex min-h-[48px] items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline">
              Ver todo el catálogo <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="relative hidden aspect-[4/3] w-full overflow-hidden rounded-3xl lg:block" aria-hidden="true">
            <Image src="/img/portadas/hero.webp" alt="" fill priority sizes="480px" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Los atajos: lo que antes eran 12 botones en la portada, en cuatro tarjetas claras. */}
      <nav aria-label="Atajos" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          // Tomi 21/11: el atajo iba fijo al Kit semanal y daba 404 cuando faltaba el mix de semillas.
          ...(atajo ? [{ href: `/combos/${atajo.slug}`, t: atajo.slug === KIT_SEMANAL ? "Kit semanal" : atajo.nombre.split(" · ")[0], d: atajo.slug === KIT_SEMANAL ? "Desayuno y colación de la semana" : "El combo de la semana", e: "🧺" }] : []),
          { href: "/combos", t: "Combos", d: "Ahorrás llevando el pack", e: "🎁" },
          { href: "/sin-tacc", t: "Sin TACC", d: `${totalSinTacc} productos rotulados`, e: "🌾" },
          { href: "/novedades", t: "Nuevos", d: "Por encargo, en 24-48 hs", e: "✨" },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex min-h-[72px] items-center gap-3 rounded-2xl bg-white p-3 shadow-ficha hover:bg-acopio-50">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-acopio-100 text-2xl" aria-hidden="true">{a.e}</span>
            <span className="min-w-0">
              <span className="block font-display text-base font-bold leading-tight">{a.t}</span>
              <span className="block text-xs leading-snug text-stone-600">{a.d}</span>
            </span>
          </Link>
        ))}
      </nav>

      {temporada && deTemporada.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-[#7a1f1f] to-acopio-900 p-4 sm:p-6">
          <div className="fondo-oscuro mb-3 text-white">
            <span className="chip bg-sol text-acopio-900">{temporada.nombre}{faltanDias > 0 && faltanDias <= 60 ? ` · faltan ${faltanDias} días` : ""}</span>
            <h2 className="mt-2 text-balance font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{temporada.titulo}</h2>
            <p className="mt-1 max-w-2xl text-[15px] text-white/80">{temporada.bajada}</p>
          </div>
          <div className="riel lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
            {deTemporada.map((c) => (
              <TarjetaCombo key={c.slug} c={c} llegaAlMinimo={c.precio >= cfg.compraMinima} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto" />
            ))}
          </div>
        </section>
      )}

      {nuevos.length > 0 && (
        <section>
          <BandaSeccion>Novedades</BandaSeccion>
          <RielSellado productos={nuevos.slice(0, 8).map((p) => ({ ...p, sello: "nuevo" as const }))} />
          <BotonVer href="/novedades">Ver novedades</BotonVer>
        </section>
      )}

      {banda.length > 0 && (
        <section>
          <BandaSeccion>Ofertas y promociones</BandaSeccion>
          <RielSellado productos={banda} />
          <BotonVer href="/ofertas">Ver ofertas</BotonVer>
        </section>
      )}

      {disponibles.length > 0 && (
        <section>
          <BandaSeccion>Promociones destacadas del mes</BandaSeccion>
          <div className="riel lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {disponibles.slice(0, 4).map((c) => (
              <TarjetaCombo key={c.slug} c={c} llegaAlMinimo={c.precio >= cfg.compraMinima} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto" />
            ))}
          </div>
          <BotonVer href="/combos">Ver combos</BotonVer>
        </section>
      )}

      {vidriera.length > 0 && (
        <section>
          <TituloSeccion href="/catalogo" enlace="Ver todo el catálogo">Los que más se llevan</TituloSeccion>
          <p className="-mt-1 mb-3 max-w-2xl text-sm text-stone-700">Frutos secos, mixes y granolas, fraccionados en el día.{cfg.entregaPropiaActiva ? ` En Carlos Paz y alrededores te lo llevamos en ${cfg.plazoEntregaPropia}.` : ""}</p>
          <RielProductos productos={vidriera} />
        </section>
      )}

      {/* El juego: tres preguntas y una recomendación con el porqué. Retiene y lleva al carrito (Santiago, 9/11). */}
      <section aria-labelledby="quiz-titulo" className="overflow-hidden rounded-3xl bg-acopio-50">
        <Link href="/que-mix-sos" className="grid items-center gap-4 p-4 sm:grid-cols-[112px_1fr_auto] sm:p-6 hover:bg-acopio-100">
          <DibujoNutri className="mx-auto h-28 w-24 sm:h-32 sm:w-28" hablando />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-acopio-700">Un juego de 30 segundos</p>
            <h2 id="quiz-titulo" className="mt-1 text-balance font-display text-2xl font-extrabold leading-tight sm:text-3xl">¿Qué mix sos?</h2>
            <p className="mt-1 max-w-xl text-sm text-stone-700">Tres preguntas y la Nutri de Acopio te dice qué fruto seco o mix te conviene, qué aporta y cómo comerlo. Con el precio y el botón para pedirlo.</p>
          </div>
          <span className="btn-comprar whitespace-nowrap">Jugar</span>
        </Link>
      </section>

      <section aria-labelledby="herramientas">
        <h2 id="herramientas" className="sr-only">Armá tu compra</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { href: "/mi-lista", chip: "Para tu casa", titulo: "Tu lista del mes en 60 segundos", texto: "Personas, qué querés resolver y presupuesto: te armamos la compra con precios de hoy.", foto: "/img/nichos/familias.webp", cta: "Armar mi lista" },
            { href: "/cotizador-hoteles", chip: "Hoteles y cabañas", titulo: "¿Cuánto te cuesta cada desayuno?", texto: "Plazas, ocupación y días: el pedido del mes y el costo por desayuno, listo para aprobar.", foto: "/img/nichos/hoteleria.webp", cta: "Calcular presupuesto" },
            { href: "/armador", chip: "Para negocios", titulo: "El pedido de tu negocio, armado", texto: "Gimnasios, cafeterías, kioscos y dietéticas: un pedido por rubro que ajustás a tu medida.", foto: "/img/nichos/kioscos.webp", cta: "Armar pedido" },
          ].map((h) => (
            <Link key={h.href} href={h.href} className="group relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-3xl bg-acopio-900 p-5 text-white">
              <Image src={h.foto} alt="" fill sizes="(max-width: 768px) 100vw, 380px" className="object-cover opacity-55 transition group-hover:scale-[1.03]" />
              <span className="absolute inset-0 bg-gradient-to-t from-acopio-900 via-acopio-900/70 to-transparent" aria-hidden="true" />
              <span className="relative">
                <span className="chip bg-sol text-acopio-900">{h.chip}</span>
                <span className="mt-2 block font-display text-2xl font-extrabold leading-tight tracking-tight">{h.titulo}</span>
                <span className="mt-1 block text-sm text-white/85">{h.texto}</span>
                <span className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-sol px-5 text-sm font-bold text-acopio-900">{h.cta} →</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-acopio-900">¿Comprás para un negocio?</p>
        <div className="riel mt-2 md:mx-0 md:flex-wrap md:px-0">
          {NICHOS.filter((n) => n.id !== "familias").map((n) => (
            <Link key={n.id} href={`/nichos/${n.id}`} className="flex min-h-[44px] shrink-0 snap-start items-center whitespace-nowrap rounded-full bg-white px-4 text-sm font-semibold shadow-ficha hover:bg-acopio-900 hover:text-white">{n.nombre}</Link>
          ))}
        </div>
      </section>


      {alfajores.length > 0 && (
        <section className="rounded-3xl bg-acopio-900 p-4 sm:p-6">
          {/* El blanco va solo en el encabezado y el aviso: adentro del riel las fichas son blancas y el texto tiene que seguir oscuro. */}
          <div className="fondo-oscuro mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-1 text-white">
            <div className="min-w-0">
              <span className="chip bg-sol text-acopio-900">Súper promo</span>
              <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight">Alfajores sin TACC</h2>
              <p className="mt-1 text-[15px] text-white/80">
                {kitAlfajores ? (
                  <>
                    Hacelos en casa con el kit: 2 tapitas Natuzen + dulce de leche Trini con stevia, <b className="font-semibold text-sol tabular-nums">{pesos(kitAlfajores.precio)}</b>
                    {kitAlfajores.ahorro > 0 ? ` (por separado ${pesos(kitAlfajores.precioLista)}).` : "."} O llevá la caja desde{" "}
                    <b className="font-semibold text-sol tabular-nums">{pesos(alfajorDesde)} el alfajor</b>.
                  </>
                ) : (
                  <>
                    Llevando la caja te quedan desde <b className="font-semibold text-sol tabular-nums">{pesos(alfajorDesde)} el alfajor</b>.
                  </>
                )}
              </p>
            </div>
            <Link href="/catalogo?q=alfajor&sintacc=1" className="-my-2 flex min-h-[48px] items-center whitespace-nowrap text-sm font-semibold text-sol underline underline-offset-4">Ver todos</Link>
          </div>
          {/* 21/11 (Santiago): el kit de tapitas Natuzen + dulce de leche Trini va primero, con su foto del envase original. */}
          {kitAlfajores ? (
            <div className={`grid gap-4 lg:items-start ${cajasAlfajor.length >= 3 ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"}`}>
              <TarjetaCombo c={kitAlfajores} className="ring-2 ring-sol" />
              {cajasAlfajor.length > 0 && <RielProductos columnas={cajasAlfajor.length >= 3 ? 3 : 2} productos={cajasAlfajor} />}
            </div>
          ) : (
            <RielProductos productos={alfajores} />
          )}
          <p className="mt-1 text-xs text-white/60">{AVISO_SIN_TACC}</p>
        </section>
      )}


      {sinTacc.length > 0 && (
        <section className="rounded-3xl bg-acopio-100 p-4 sm:p-6">
          <TituloSeccion href="/sin-tacc" enlace={`Ver los ${totalSinTacc}`}>Góndola sin TACC</TituloSeccion>
          <p className="-mt-1 mb-3 max-w-2xl text-sm text-stone-700">{AVISO_SIN_TACC}</p>
          <RielProductos productos={sinTacc} />
        </section>
      )}

      {pedidos.length > 0 && (
        <section>
          <TituloSeccion href="/nichos" enlace="Todos los rubros">Pedidos listos por rubro</TituloSeccion>
          <div className="riel lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {[...pedidos].sort((a, b) => Number(b.nicho === "familias") - Number(a.nicho === "familias")).map((p) => {
              const items = p.items.filter((i) => seVende.has(i.producto.codigo));
              const total = items.reduce((s, i) => s + i.producto.precio * i.cantidad, 0);
              return (
                <article key={p.slug} className="flex w-[78%] shrink-0 snap-start flex-col rounded-2xl bg-white p-3 shadow-ficha sm:w-[44%] lg:w-auto">
                  <div className="grid grid-cols-4 gap-1.5">
                    {items.slice(0, 4).map((i) => (
                      <Foto key={i.producto.codigo} src={i.producto.fotoUrl} alt="" etiqueta=" " className="aspect-square w-full rounded-lg" />
                    ))}
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold leading-tight"><Link href={`/nichos/${p.nicho}`} className="hover:underline">{p.nombre.replace(/^Pedido /, "")}</Link></h3>
                  <ListaCombo items={items} />
                  <p className="mt-3 font-display text-2xl font-bold tabular-nums">{pesos(total)}</p>
                  <p className="mb-3 text-xs text-stone-600">{zonaSinMinimo(cfg)
                      ? `En Carlos Paz, envío ${pesos(cfg.envioBajoMinimo)} y pagás al recibir`
                      : total >= cfg.compraMinima ? "Ya llega a la compra mínima" : `Te quedan ${pesos(cfg.compraMinima - total)} para completar el mínimo`}</p>
                  <div className="mt-auto flex gap-2">
                    <BotonCargarPedido etiqueta="Cargar pedido" className="btn-comprar flex-1" lineas={items.map((i) => ({ tipo: "producto" as const, id: i.producto.codigo, cantidad: i.cantidad }))} />
                    <Link href={`/nichos/${p.nicho}`} className="btn-sec px-4">Ajustar</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <InstalarApp className="md:hidden" />
      {categorias.length > 0 && (
        <section>
          <TituloSeccion>Recorré por góndola</TituloSeccion>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {categorias.map((c) => (
              <Link key={c.categoria} href={`/catalogo?categoria=${encodeURIComponent(c.categoria)}`} className="group rounded-2xl bg-white p-2 shadow-ficha">
                <Foto src={GONDOLAS[c.categoria]?.img ?? portada.get(c.categoria) ?? null} alt="" etiqueta=" " className="aspect-square w-full rounded-xl" />
                <p className="mt-2 line-clamp-2 px-1 text-[13px] font-semibold leading-tight group-hover:underline">{c.categoria}</p>
                <p className="px-1 pb-1 text-[11px] text-stone-600">{c._count} productos</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {disponibles.length > 0 && (
        <section>
          <TituloSeccion href="/combos" enlace="Todos los combos">Combos armados</TituloSeccion>
          <div className="riel lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {/* Primero los combos que por sí solos llegan a la compra mínima: son los únicos que el
                cliente puede pagar sin sumar nada más. Con un combo barato arriba, el que viene de un
                anuncio agrega, descubre el mínimo en el checkout y se va. */}
            {[...disponibles]
              .sort(
                (a, b) =>
                  Number(b.precio >= cfg.compraMinima) - Number(a.precio >= cfg.compraMinima) ||
                  Number(b.destacado) - Number(a.destacado) ||
                  b.descuentoPct - a.descuentoPct,
              )
              .slice(0, 4)
              .map((c) => (
                <TarjetaCombo key={c.slug} c={c} llegaAlMinimo={c.precio >= cfg.compraMinima} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto" />
              ))}
          </div>
        </section>
      )}

      <section>
        <TituloSeccion href="/objetivos" enlace="Explorar">Comprá por objetivo de bienestar</TituloSeccion>
        <div className="flex flex-wrap gap-2">
          {OBJETIVOS.map((o) => (
            <Link key={o.id} href={`/objetivos/${o.id}`} className="flex min-h-[48px] items-center rounded-full bg-white px-4 text-sm font-semibold shadow-ficha hover:bg-acopio-900 hover:text-white">{o.nombre}</Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-acopio-100 p-5 sm:p-8">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Cómo se compra</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {pasos.map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-acopio-900 font-display text-lg font-bold text-sol">{i + 1}</span>
              <div>
                <h3 className="font-semibold">{titulo}</h3>
                <p className="text-sm text-stone-600">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
