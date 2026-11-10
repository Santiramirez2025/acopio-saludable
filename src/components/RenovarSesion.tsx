"use client";

import { useEffect } from "react";
import { RENOVAR_SESION_CADA_MS } from "@/lib/sesion-admin";

/** Renueva la cookie de sesión del panel al abrirlo y cada tanto mientras sigue abierto (ver lib/sesion-admin.ts). No muestra nada. */
export function RenovarSesion() {
  useEffect(() => {
    const renovar = () => {
      fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" }).catch(() => undefined);
    };
    renovar();
    const id = setInterval(renovar, RENOVAR_SESION_CADA_MS);
    return () => clearInterval(id);
  }, []);
  return null;
}
