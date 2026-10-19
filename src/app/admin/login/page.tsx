"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState<string | null>(null);

  // Sin contraseña: le llega un WhatsApp a Santiago y, cuando aprueba, esta pantalla entra sola.
  async function pedirPorWhatsapp() {
    setEspera("Mandando el pedido…");
    const r = await fetch("/api/acceso", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((x) => x.json()).catch(() => ({}));
    if (!r.codigo) return setEspera(r.error ?? "No se pudo pedir el acceso.");
    setEspera("Esperando que lo apruebes desde el WhatsApp…");
    for (let i = 0; i < 180; i++) {
      await new Promise((ok) => setTimeout(ok, 5000));
      const e = await fetch("/api/acceso", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ codigo: r.codigo }) }).then((x) => x.json()).catch(() => ({}));
      if (e.estado === "aprobado") {
        const s = await signIn("aprobacion", { codigo: r.codigo, redirect: false });
        if (s?.ok) return void (window.location.href = new URLSearchParams(location.search).get("callbackUrl") || "/admin");
        return setEspera("No se pudo entrar. Probá de nuevo.");
      }
      if (e.estado === "vencido") return setEspera("El pedido venció. Probá de nuevo.");
    }
    setEspera("El pedido venció. Probá de nuevo.");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCargando(true);
    setError(false);
    const datos = new FormData(e.currentTarget);
    const r = await signIn("credentials", { email: datos.get("email"), password: datos.get("password"), redirect: false });
    if (r?.ok) window.location.href = "/admin";
    else {
      setError(true);
      setCargando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-semibold text-acopio-900">Acopio Saludable</h1>
      <p className="mb-6 text-sm text-stone-600">Panel de control</p>
      <form onSubmit={onSubmit} className="tarjeta space-y-4">
        <div>
          <label className="etiqueta" htmlFor="email">Email</label>
          <input className="campo" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña</label>
          <input className="campo" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <p className="text-sm text-red-600">Email o contraseña incorrectos.</p>}
        <button className="btn w-full" disabled={cargando}>{cargando ? "Ingresando…" : "Ingresar"}</button>
      </form>
      <button type="button" onClick={pedirPorWhatsapp} disabled={Boolean(espera && espera.startsWith("Esperando"))} className="mt-4 w-full rounded-md border border-acopio-700 px-3 py-2 text-sm font-medium text-acopio-700">
        Entrar sin contraseña: aprobar por WhatsApp
      </button>
      {espera && <p className="mt-2 text-center text-sm text-stone-600">{espera}</p>}
    </main>
  );
}
