import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ProveedorCarrito } from "@/components/Carrito";
import { BarraInferior, Encabezado, MedidorPedido } from "@/components/Encabezado";
import { BotonWhatsapp, EnlaceWhatsapp } from "@/components/Whatsapp";
import { NICHOS } from "@/lib/taxonomia";
import { leerConfig } from "@/lib/config";
import { pesos } from "@/lib/precios";
import { AVISO_SUPLEMENTOS, SITIO, urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

// Datos del negocio para buscadores: tienda online con base en Villa Carlos Paz, sin local a la calle.
const NEGOCIO = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: SITIO.nombre,
  url: urlSitio(),
  logo: `${urlSitio()}/marca/acopio-isotipo.svg`,
  image: `${urlSitio()}/img/portadas/hero.webp`,
  description: SITIO.descripcion,
  address: { "@type": "PostalAddress", addressLocality: "Villa Carlos Paz", addressRegion: "Córdoba", addressCountry: "AR" },
  areaServed: [{ "@type": "City", name: "Villa Carlos Paz" }, { "@type": "AdministrativeArea", name: "Valle de Punilla" }, { "@type": "Country", name: "Argentina" }],
};

export default async function TiendaLayout({ children }: { children: React.ReactNode }) {
  const cfg = await leerConfig();
  return (
    <ProveedorCarrito>
      <div className="flex min-h-screen flex-col overflow-x-clip">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(NEGOCIO).replace(/</g, "\\u003c") }} />
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-sol focus:px-4 focus:py-3 focus:font-bold focus:text-acopio-900">Saltar al contenido</a>
        {/* La compra mínima tiene que saberse antes de elegir, no al llegar al checkout. Va arriba de todo, en cada página. */}
        <p className="bg-acopio-700 px-4 py-2 text-center text-[13px] leading-snug text-white">
          Compra mínima <b className="font-bold text-sol">{pesos(cfg.compraMinima)}</b> por pedido
          <span className="hidden sm:inline"> · {cfg.entregaPropiaActiva ? "Entrega sin cargo en Villa Carlos Paz y el sur de Punilla · " : ""}Envíos a todo el país</span>
        </p>
        <Encabezado />
        <main id="contenido" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-40 pt-5 md:pb-24 md:pt-8">{children}</main>
        <footer className="fondo-oscuro bg-acopio-900 pb-28 text-white/80 md:pb-0">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
            <div>
              <p className="text-white"><Logo invertido conBajada /></p>
              <p className="mt-1">{SITIO.base}. Envíos a todo el país.</p>
              <Link href="/sin-tacc" className="flex min-h-[48px] items-center font-semibold text-white underline underline-offset-4">Productos sin TACC</Link>
              <Link href="/dietetica-villa-carlos-paz" className="flex min-h-[48px] items-center hover:text-white hover:underline">Dietética en Villa Carlos Paz</Link>
            </div>
            <div>
              <h2 className="mb-1 font-semibold text-white">Comprá por negocio</h2>
              <ul className="grid grid-cols-2 gap-x-4">
                {NICHOS.map((n) => (
                  <li key={n.id}><Link href={`/nichos/${n.id}`} className="flex min-h-[48px] items-center hover:text-white hover:underline">{n.nombre}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-1 font-semibold text-white">Ayuda</h2>
              {/* El WhatsApp arriba de los enlaces: es la vía por la que la gente pregunta de verdad. */}
              <EnlaceWhatsapp mensaje="Hola! Tengo una consulta sobre Acopio Saludable." className="min-h-[48px] font-semibold text-white underline underline-offset-4">
                Escribinos por WhatsApp
              </EnlaceWhatsapp>
              <ul className="grid grid-cols-2 gap-x-4">
                {[["/envios", "Envíos"], ["/cambios-y-devoluciones", "Cambios y devoluciones"], ["/contacto", "Contacto"], ["/guias", "Guías"], ["/novedades", "Novedades"], ["/app", "Instalar la app"], ["/terminos", "Términos"], ["/privacidad", "Privacidad"]].map(([h, t]) => (
                  <li key={h}><Link href={h} className="flex min-h-[48px] items-center hover:text-white hover:underline">{t}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/10 px-4 py-4 text-xs">
            <p>{AVISO_SUPLEMENTOS}</p>
            <Link href="/cambios-y-devoluciones#arrepentimiento" className="flex min-h-[48px] items-center font-semibold text-white underline underline-offset-4">Botón de arrepentimiento</Link>
          </div>
        </footer>
        <MedidorPedido />
        <BotonWhatsapp />
        <BarraInferior />
      </div>
    </ProveedorCarrito>
  );
}
