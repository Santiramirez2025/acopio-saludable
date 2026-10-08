"use client";

import { useEffect } from "react";
import { useCarrito } from "./Carrito";

/** Al llegar a la página del pedido recién creado, el carrito ya cumplió su función. */
export function VaciarCarrito() {
  const { listo, lineas, vaciar } = useCarrito();
  useEffect(() => {
    if (listo && lineas.length) vaciar();
  }, [listo, lineas.length, vaciar]);
  return null;
}
