import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Fotos de producto alojadas por el proveedor (bucket público).
      { protocol: "https", hostname: "s3-sa-east-1.amazonaws.com", pathname: "/buho-images/**" },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
