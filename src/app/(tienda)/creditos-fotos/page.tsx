import type { Metadata } from "next";
import { Prosa } from "@/components/Prosa";
import { Titulo } from "@/components/Tienda";
import { leerCreditos } from "@/lib/creditos-fotos";

export const metadata: Metadata = { title: "Créditos de fotos", description: "Autores y licencias de las fotos de producto con licencia Creative Commons.", alternates: { canonical: "/creditos-fotos" }, robots: { index: false } };
export const revalidate = 300;

export default async function Pagina() {
  const cs = (await leerCreditos()).sort((a, b) => a.producto.localeCompare(b.producto));
  return (
    <div>
      <Titulo sobre="Legales">Créditos de fotos</Titulo>
      <Prosa>
        <p>Algunas fotos ilustrativas de productos son de autores que las publicaron con licencia Creative Commons. Las recortamos a formato cuadrado. Gracias a cada autor:</p>
        <ul>
          {cs.map((c) => (
            <li key={c.producto}>
              {c.producto}: «{c.titulo}»{c.autor ? ` de ${c.autor}` : ""}, {c.licencia}
              {c.fuente ? <> · <a href={c.fuente} rel="nofollow noopener" target="_blank">fuente</a></> : null}
            </li>
          ))}
        </ul>
      </Prosa>
    </div>
  );
}
