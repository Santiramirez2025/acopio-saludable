"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pesosCliente, useCarrito } from "./Carrito";

type Opcion = { id: string; nombre: string; modalidad: string; precio: number; plazo: string; masBarata: boolean };
type Envio = { opciones: Opcion[]; pesoTotalKg: number; bultos: number };

export function Checkout({ provincias, mpDisponible, descuentoTransferenciaPct }: { provincias: string[]; mpDisponible: boolean; descuentoTransferenciaPct: number }) {
  const { lineas, listo, cotizacion } = useCarrito();
  const [provincia, setProvincia] = useState("");
  const [cp, setCp] = useState("");
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [opcionId, setOpcionId] = useState("");
  const [errorEnvio, setErrorEnvio] = useState("");
  const [cotizandoEnvio, setCotizandoEnvio] = useState(false);
  const [medio, setMedio] = useState(mpDisponible ? "MERCADOPAGO" : "TRANSFERENCIA");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const consulta = useRef(0);
  const cpValido = /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(cp.trim());

  // El envío se calcula solo apenas hay provincia y código postal, y se recalcula si cambia el carrito.
  useEffect(() => {
    if (!listo || !provincia || !cpValido || !lineas.length) {
      setEnvio(null);
      return;
    }
    const n = ++consulta.current;
    setCotizandoEnvio(true);
    setErrorEnvio("");
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/envio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lineas, cp, provincia }) });
        const datos = await r.json();
        if (n !== consulta.current) return;
        if (!r.ok) throw new Error(datos.error);
        setEnvio(datos);
        setOpcionId((previa) => (datos.opciones.some((o: Opcion) => o.id === previa) ? previa : (datos.opciones.find((o: Opcion) => o.masBarata)?.id ?? "")));
      } catch (e) {
        if (n !== consulta.current) return;
        setEnvio(null);
        setErrorEnvio(e instanceof Error && e.message ? e.message : "No pudimos calcular el envío");
      } finally {
        if (n === consulta.current) setCotizandoEnvio(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [listo, lineas, provincia, cp, cpValido]);

  if (!listo || (lineas.length > 0 && !cotizacion)) return <p className="text-stone-500">Cargando…</p>;
  if (!cotizacion?.puedePagar) {
    return (
      <div className="rounded-xl border border-tierra-200 bg-white p-6">
        <p className="font-medium">{lineas.length ? `Te faltan ${pesosCliente(cotizacion?.falta ?? 0)} para llegar a la compra mínima.` : "Tu carrito está vacío."}</p>
        <Link href={lineas.length ? "/carrito" : "/catalogo"} className="btn mt-3">{lineas.length ? "Volver al carrito" : "Ver catálogo"}</Link>
      </div>
    );
  }

  const opcion = envio?.opciones.find((o) => o.id === opcionId);
  const subtotal = cotizacion.subtotal;
  const descuento = medio === "TRANSFERENCIA" ? Math.round(subtotal * descuentoTransferenciaPct) / 100 : 0;
  const total = subtotal - descuento + (opcion?.precio ?? 0);

  async function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!opcion) return setError("Elegí una opción de envío");
    setEnviando(true);
    const f = new FormData(e.currentTarget);
    const cliente = Object.fromEntries(["nombre", "email", "telefono", "calle", "ciudad", "notas"].map((k) => [k, f.get(k)]));
    try {
      const r = await fetch("/api/pedidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lineas, cliente: { ...cliente, provincia, cp }, envioOpcionId: opcion.id, medioPago: medio }) });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error);
      window.location.href = datos.url;
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No pudimos registrar el pedido");
      setEnviando(false);
    }
  }

  const radio = (activo: boolean) => `flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${activo ? "border-acopio-600 bg-acopio-50" : "border-tierra-200 bg-white"}`;

  return (
    <form onSubmit={confirmar} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <fieldset className="rounded-xl border border-tierra-200 bg-white p-4">
          <legend className="px-1 font-display text-lg font-semibold">1. Tus datos</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="etiqueta" htmlFor="nombre">Nombre y apellido o razón social</label><input className="campo" id="nombre" name="nombre" autoComplete="name" required minLength={3} /></div>
            <div><label className="etiqueta" htmlFor="email">Email</label><input className="campo" id="email" name="email" type="email" autoComplete="email" required /></div>
            <div><label className="etiqueta" htmlFor="telefono">WhatsApp (con código de área)</label><input className="campo" id="telefono" name="telefono" type="tel" autoComplete="tel" required /></div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-tierra-200 bg-white p-4">
          <legend className="px-1 font-display text-lg font-semibold">2. Entrega</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="etiqueta" htmlFor="calle">Calle y número</label><input className="campo" id="calle" name="calle" autoComplete="street-address" required minLength={4} /></div>
            <div><label className="etiqueta" htmlFor="ciudad">Localidad</label><input className="campo" id="ciudad" name="ciudad" autoComplete="address-level2" required /></div>
            <div>
              <label className="etiqueta" htmlFor="provincia">Provincia</label>
              <select className="campo" id="provincia" required value={provincia} onChange={(e) => setProvincia(e.target.value)}>
                <option value="">Elegí</option>
                {provincias.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="etiqueta" htmlFor="cp">Código postal</label><input className="campo" id="cp" inputMode="numeric" autoComplete="postal-code" required value={cp} onChange={(e) => setCp(e.target.value)} /></div>
            <div><label className="etiqueta" htmlFor="notas">Aclaraciones (opcional)</label><input className="campo" id="notas" name="notas" maxLength={500} /></div>
          </div>

          <div className="mt-4" aria-live="polite">
            {!provincia || !cpValido ? (
              <p className="text-sm text-stone-500">Completá provincia y código postal para ver las opciones de envío.</p>
            ) : errorEnvio ? (
              <p className="text-sm text-red-700">{errorEnvio}</p>
            ) : !envio ? (
              <p className="text-sm text-stone-500">Calculando envío…</p>
            ) : (
              <div className={`space-y-2 ${cotizandoEnvio ? "opacity-60" : ""}`}>
                <p className="text-xs text-stone-500">{envio.bultos} {envio.bultos === 1 ? "bulto" : "bultos"} · {envio.pesoTotalKg} kg aprox.</p>
                {envio.opciones.map((o) => (
                  <label key={o.id} className={radio(o.id === opcionId)}>
                    <input type="radio" name="envio" className="mt-1" checked={o.id === opcionId} onChange={() => setOpcionId(o.id)} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{o.nombre} {o.masBarata && <span className="chip ml-1 bg-acopio-100 text-acopio-700">La más barata</span>}</span>
                      <span className="block text-xs text-stone-500">{o.plazo}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{o.precio > 0 ? pesosCliente(o.precio) : "Sin cargo"}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-tierra-200 bg-white p-4">
          <legend className="px-1 font-display text-lg font-semibold">3. Pago</legend>
          <div className="space-y-2">
            {mpDisponible && (
              <label className={radio(medio === "MERCADOPAGO")}>
                <input type="radio" name="medio" className="mt-1" checked={medio === "MERCADOPAGO"} onChange={() => setMedio("MERCADOPAGO")} />
                <span><span className="block text-sm font-medium">Mercado Pago</span><span className="block text-xs text-stone-500">Tarjeta, débito o dinero en cuenta. Te llevamos a Mercado Pago para pagar.</span></span>
              </label>
            )}
            <label className={radio(medio === "TRANSFERENCIA")}>
              <input type="radio" name="medio" className="mt-1" checked={medio === "TRANSFERENCIA"} onChange={() => setMedio("TRANSFERENCIA")} />
              <span>
                <span className="block text-sm font-medium">Transferencia bancaria {descuentoTransferenciaPct > 0 && <span className="chip ml-1 bg-acopio-100 text-acopio-700">{descuentoTransferenciaPct}% de descuento</span>}</span>
                <span className="block text-xs text-stone-500">Te mostramos los datos al confirmar y nos mandás el comprobante.</span>
              </span>
            </label>
          </div>
        </fieldset>
      </div>

      <aside className="h-fit space-y-3 rounded-xl border border-tierra-200 bg-white p-5 lg:sticky lg:top-28">
        <h2 className="font-display text-lg font-semibold">Resumen</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt>Productos ({cotizacion.unidades})</dt><dd className="tabular-nums">{pesosCliente(subtotal)}</dd></div>
          {descuento > 0 && <div className="flex justify-between text-acopio-700"><dt>Descuento por transferencia</dt><dd className="tabular-nums">− {pesosCliente(descuento)}</dd></div>}
          <div className="flex justify-between"><dt>Envío</dt><dd className="tabular-nums">{opcion ? (opcion.precio > 0 ? pesosCliente(opcion.precio) : "Sin cargo") : "A calcular"}</dd></div>
          <div className="flex justify-between border-t border-tierra-200 pt-2 text-xl font-semibold"><dt>Total</dt><dd className="tabular-nums">{pesosCliente(total)}</dd></div>
        </dl>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn w-full" disabled={enviando || !opcion || cotizandoEnvio}>{enviando ? "Confirmando…" : medio === "MERCADOPAGO" ? "Confirmar y pagar" : "Confirmar pedido"}</button>
        <Link href="/carrito" className="block text-center text-sm text-stone-500 underline">Volver al carrito</Link>
      </aside>
    </form>
  );
}
