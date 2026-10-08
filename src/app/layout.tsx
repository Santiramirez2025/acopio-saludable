import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource-variable/figtree/wght.css";
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
        <link rel="preconnect" href="https://s3-sa-east-1.amazonaws.com" />
      </head>
      <body className="min-h-screen bg-acopio-50 text-acopio-900 antialiased">{children}</body>
    </html>
  );
}
