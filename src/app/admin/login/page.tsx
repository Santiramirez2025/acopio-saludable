"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);

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
    </main>
  );
}
