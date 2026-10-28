import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [390, 640, 828, 1200],
    imageSizes: [96, 160, 280, 420],
    remotePatterns: [
      // Fotos de producto alojadas por el proveedor (bucket público).
      { protocol: "https", hostname: "s3-sa-east-1.amazonaws.com", pathname: "/buho-images/**" },
      // Imágenes propias subidas desde el panel (Vercel Blob).
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // El motor de consultas de Prisma es un .wasm que se lee del disco: hay que incluirlo a mano en las funciones de Vercel.
  outputFileTracingIncludes: { "/**": ["./node_modules/.prisma/client/*.wasm"] },
  // Dirección corta y propia para la góndola sin TACC.
  // Direcciones cortas y propias para mandar por WhatsApp cuando visitamos un comercio:
  // la del catálogo lleva la categoría en la query y queda impresentable en un mensaje.
  async rewrites() {
    return [
      { source: "/sin-tacc", destination: "/catalogo?sintacc=1" },
      { source: "/hierbas", destination: "/catalogo?categoria=Caf%C3%A9%2C%20yerba%20e%20infusiones" },
      { source: "/miel", destination: "/catalogo?q=miel" },
    ];
  },
  // La dirección vieja de Vercel lleva al dominio propio (menos /api, que recibe avisos de pago).
  async redirects() {
    return [{ source: "/:path((?!api/).*)", has: [{ type: "host", value: "acopio-saludable.vercel.app" }], destination: "https://www.acopiosaludable.com/:path", permanent: true }];
  },
  // Headers de seguridad en todo el sitio (HSTS ya lo pone Vercel):
  // nadie puede meter la tienda ni el panel en un iframe ajeno (clickjacking), el navegador no adivina
  // tipos de archivo, no se filtra la URL completa a terceros y solo nuestras páginas pueden usar el
  // micrófono (las llamadas del panel); cámara y ubicación quedan cerradas. Sin CSP por ahora: la
  // tienda carga Meta Pixel, Analytics, YouTube y Three.js y una CSP a ciegas rompería ventas.
  async headers() {
    const seguridad = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: seguridad },
      // Las piezas de anuncios se suben a Meta desde el navegador: necesitan CORS abierto.
      { source: "/img/anuncios/:file*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] },
      { source: "/video/:file*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] },
    ];
  },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
