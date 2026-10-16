"use client";

import { conMensaje, mensajeSegun } from "@/lib/whatsapp-saludo";

/**
 * El botón flotante de WhatsApp vive en el layout y no sabe en qué página está.
 * Al tocarlo, arma el mensaje con lo que la persona estaba mirando (la ruta y el título).
 * Sin JavaScript, el link igual funciona con el saludo general.
 */
export function BotonWhatsappVivo({ href, className, children, etiqueta }: { href: string; className: string; children: React.ReactNode; etiqueta?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={etiqueta}
      className={className}
      onClick={(e) => {
        const titulo = document.querySelector("main h1")?.textContent;
        e.currentTarget.href = conMensaje(href, mensajeSegun(window.location.pathname, titulo));
      }}
    >
      {children}
    </a>
  );
}
