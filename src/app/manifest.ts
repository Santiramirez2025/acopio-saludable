import type { MetadataRoute } from "next";
import { SITIO } from "@/lib/sitio";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITIO.nombre,
    short_name: "Acopio",
    description: SITIO.descripcion,
    start_url: "/?origen=app",
    display: "standalone",
    background_color: "#F1F6F2",
    theme_color: "#10251C",
    lang: "es-AR",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Catálogo", url: "/catalogo" },
      { name: "Combos", url: "/combos" },
      { name: "Mi pedido", url: "/carrito" },
    ],
  };
}
