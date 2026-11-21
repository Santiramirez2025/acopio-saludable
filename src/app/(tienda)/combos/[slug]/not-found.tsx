import Link from "next/link";
import { combosTienda } from "@/lib/tienda";
import { ordenarCombos } from "@/lib/destacado-inicio";
import { TarjetaCombo } from "@/components/Tienda";
import { EnlaceWhatsapp } from "@/components/Whatsapp";

// Un combo que hoy no se puede armar (por ejemplo, falta el mix de semillas) sigue dando 404: así el equipo
// sabe que no se ofrece. Pero quien llega desde un post, un anuncio o un link viejo ya no cae en una página
// vacía sin menú: ve la tienda y los combos que sí están (Tomi 21/11).
export default async function ComboNoDisponible() {
  const otros = ordenarCombos((await combosTienda({ tipo: "COMBO", activo: true })).filter((c) => c.disponible)).slice(0, 4);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-balance font-display text-2xl font-extrabold leading-tight sm:text-3xl">Este combo no está disponible esta semana</h1>
      <p className="mt-2 max-w-2xl text-stone-600">Nos falta algo para armarlo. Mientras tanto, estos combos sí salen hoy:</p>
      {otros.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{otros.map((c) => <TarjetaCombo key={c.slug} c={c} />)}</div>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/combos" className="btn">Ver todos los combos</Link>
        <Link href="/catalogo" className="btn-sec">Armarlo con productos sueltos</Link>
      </div>
      <p className="mt-6 text-sm text-stone-600">
        ¿Lo querías igual? <EnlaceWhatsapp mensaje="Hola, quería un combo que en la web figura como no disponible. ¿Me ayudan a armarlo?" className="font-semibold text-acopio-700 underline">Escribinos por WhatsApp</EnlaceWhatsapp> y te decimos cuándo vuelve.
      </p>
    </div>
  );
}
