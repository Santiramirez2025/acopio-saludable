// La empresa por dentro: el equipo de agentes como personas. Con ?tv=1 se ve a pantalla completa.
// La versión recorrible en 3D está en /admin/empresa/3d.
import type { Metadata } from "next";
import { Oficina } from "./oficina";
import { cargarOficina } from "./datos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Empresa" };

export default async function Empresa() {
  return <Oficina datos={await cargarOficina()} />;
}
