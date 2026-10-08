import type { Metadata } from "next";
import "./globals.css";
import { SITIO, urlSitio } from "@/lib/sitio";

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio()),
  title: { default: `${SITIO.nombre}: productos saludables por volumen`, template: `%s · ${SITIO.nombre}` },
  description: SITIO.descripcion,
  openGraph: { siteName: SITIO.nombre, locale: "es_AR", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
