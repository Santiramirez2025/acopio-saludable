import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource-variable/figtree/wght.css";
import "./globals.css";
import Script from "next/script";
import { SITIO, urlSitio } from "@/lib/sitio";

// El ID de medición es público. Solo se mide en producción.
const GA = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_GA_ID || "G-0QGL9DGDZY" : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio()),
  title: { default: `${SITIO.nombre}: dietética online por volumen, envíos a todo el país`, template: `%s · ${SITIO.nombre}` },
  description: SITIO.descripcion,
  appleWebApp: { capable: true, title: SITIO.nombre, statusBarStyle: "default" },
  openGraph: { siteName: SITIO.nombre, locale: "es_AR", type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: SITIO.nombre }] },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
};

export const viewport = { themeColor: "#10251C", width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://s3-sa-east-1.amazonaws.com" />
      </head>
      <body className="min-h-screen bg-acopio-50 text-acopio-900 antialiased">{children}
        {GA && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');`}</Script>
          </>
        )}
      </body>
    </html>
  );
}
