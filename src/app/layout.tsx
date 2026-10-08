import type { Metadata } from "next";
import "./globals.css";
import { SITIO, urlSitio } from "@/lib/sitio";

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio()),
  title: { default: `${SITIO.nombre}: productos saludables por volumen`, template: `%s · ${SITIO.nombre}` },
  description: SITIO.descripcion,
  appleWebApp: { capable: true, title: SITIO.nombre, statusBarStyle: "default" },
  openGraph: { siteName: SITIO.nombre, locale: "es_AR", type: "website" },
};

export const viewport = { themeColor: "#10251C", width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap" />
        <link rel="preconnect" href="https://s3-sa-east-1.amazonaws.com" />
      </head>
      <body className="min-h-screen bg-acopio-50 text-acopio-900 antialiased">{children}</body>
    </html>
  );
}
