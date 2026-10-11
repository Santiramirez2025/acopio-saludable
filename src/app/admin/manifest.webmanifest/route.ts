import { NextResponse } from "next/server";

/**
 * Manifest propio del panel, separado del de la tienda.
 *
 * Con `scope` e `id` en /admin, el celular lo trata como otra aplicación: queda un icono
 * aparte en la pantalla de inicio, abre directo en el panel y no comparte ventana con la
 * tienda. Sin esto, instalar desde /admin reusaba el manifest de la tienda y abría la tienda.
 */
export function GET() {
  return NextResponse.json(
    {
      id: "/admin",
      name: "Acopio Panel",
      short_name: "Panel",
      description: "Pedidos, productos y precios de Acopio Saludable.",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#10251C",
      theme_color: "#10251C",
      lang: "es-AR",
      icons: [
        { src: "/panel-192.png", sizes: "192x192", type: "image/png" },
        { src: "/panel-512.png", sizes: "512x512", type: "image/png" },
        { src: "/panel-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Pedidos", url: "/admin/pedidos" },
        { name: "Productos", url: "/admin/productos" },
        { name: "Envíos", url: "/admin/envios" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
