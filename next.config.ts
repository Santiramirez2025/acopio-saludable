import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Fotos de producto alojadas por el proveedor (bucket público).
      { protocol: "https", hostname: "s3-sa-east-1.amazonaws.com", pathname: "/buho-images/**" },
    ],
  },
  // El motor de consultas de Prisma es un .wasm que se lee del disco: hay que incluirlo a mano en las funciones de Vercel.
  outputFileTracingIncludes: { "/**": ["./node_modules/.prisma/client/*.wasm"] },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
