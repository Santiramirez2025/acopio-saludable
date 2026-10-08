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
  async rewrites() {
    return [{ source: "/sin-tacc", destination: "/catalogo?sintacc=1" }];
  },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
