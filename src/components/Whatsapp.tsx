import { leerConfig } from "@/lib/config";
import { linkWhatsapp } from "@/lib/pedidos";

/**
 * WhatsApp de la tienda, en un solo lugar.
 *
 * El número sale de la configuración: si no está cargado, nada de esto se muestra.
 * Así no queda un botón que no lleva a ningún lado ni hay que tocar código para cambiarlo.
 */
export async function whatsappTienda(mensaje: string): Promise<string | null> {
  const cfg = await leerConfig();
  return cfg.whatsapp ? linkWhatsapp(cfg.whatsapp, mensaje) : null;
}

function Icono({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}

/**
 * Botón flotante. Va arriba de la barra inferior en el celular para no taparla:
 * la barra con el carrito es lo que convierte, el WhatsApp es el que evacúa dudas.
 */
export async function BotonWhatsapp() {
  const href = await whatsappTienda("Hola! Tengo una consulta sobre Acopio Saludable.");
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribirnos por WhatsApp"
      className="fixed bottom-[132px] right-3 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acopio-900 md:bottom-6 md:right-6 md:h-14 md:w-14"
    >
      <Icono className="h-6 w-6 md:h-7 md:w-7" />
    </a>
  );
}

/** Enlace en línea, para el pie, la ficha del producto o el checkout. */
export async function EnlaceWhatsapp({
  mensaje,
  children,
  className = "",
}: {
  mensaje: string;
  children: React.ReactNode;
  className?: string;
}) {
  const href = await whatsappTienda(mensaje);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icono className="h-4 w-4 shrink-0" />
      {children}
    </a>
  );
}
