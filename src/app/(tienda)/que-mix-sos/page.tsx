import type { Metadata } from "next";
import { productosTienda } from "@/lib/tienda";
import { QuizMix } from "@/components/QuizMix";

export const metadata: Metadata = {
  title: "¿Qué mix sos? · Elegí tus frutos secos en 30 segundos",
  description: "Tres preguntas y la Nutri de Acopio te dice qué mix o fruto seco te conviene, qué aporta y cómo comerlo. Entrega en Villa Carlos Paz.",
  alternates: { canonical: "/que-mix-sos" },
};

// Los códigos que el juego puede recomendar: se traen con precio y foto de la tienda.
const CODIGOS = ["LG-MIXSEM", "TG-NUEZ", "LG-DATIL", "TG-PASAS", "TG-MIXC", "TG-MIXCG", "TG-MIXTSM", "TG-CAJUPASAS", "LG-AVENA"];

export default async function Pagina() {
  const productos = await productosTienda({ where: { codigo: { in: CODIGOS } }, take: 20 });
  const mapa = Object.fromEntries(productos.map((p) => [p.codigo, { codigo: p.codigo, nombre: `${p.producto} ${p.presentacion}`, precio: p.precio, foto: p.fotoUrl }]));
  return <QuizMix productos={mapa} />;
}
