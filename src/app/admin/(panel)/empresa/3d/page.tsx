// La oficina de Acopio en 3D: un edificio con una oficina por agente que se recorre como un juego
// (flechas del teclado o del control remoto de la TV) y donde se le habla a cada uno con el micrófono.
import type { Metadata } from "next";
import { cargarOficina } from "../datos";
import { Oficina3D } from "./oficina3d";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Oficina 3D" };

export default async function Pagina() {
  return <Oficina3D datos={await cargarOficina()} />;
}
