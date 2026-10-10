import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource-variable/figtree/wght.css";
import "./globals.css";
import Script from "next/script";
import { PaginaVista } from "@/components/Medicion";
import { SITIO, urlSitio } from "@/lib/sitio";

// El ID de medición es público. Solo se mide en producción.
const GA = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_GA_ID || "G-0QGL9DGDZY" : undefined;
const PIXEL = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_META_PIXEL_ID : undefined;
const VERIF_META = process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio()),
  title: { default: `${SITIO.nombre}: dietética online por volumen, envíos a todo el país`, template: `%s · ${SITIO.nombre}` },
  description: SITIO.descripcion,
  appleWebApp: { capable: true, title: SITIO.nombre, statusBarStyle: "default" },
  openGraph: { siteName: SITIO.nombre, locale: "es_AR", type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: SITIO.nombre }] },
  twitter: { card: "summary_large_image" },
  other: VERIF_META ? { "facebook-domain-verification": VERIF_META } : undefined,
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
        {PIXEL && (
          <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL}');fbq('track','PageView');`}</Script>
        )}
        <PaginaVista />
      </body>
    </html>
  );
}
