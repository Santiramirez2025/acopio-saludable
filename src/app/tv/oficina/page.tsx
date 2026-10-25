// La empresa en una TV vinculada (o con la sesión de Santiago). Por defecto el mural liviano (anda en
// cualquier TV); la oficina 3D solo con ?3d=1 (en las TVs suele quedar en blanco: no les da la placa).
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { esTv } from "@/lib/tv";
import { cargarOficina } from "@/app/admin/(panel)/empresa/datos";
import { Oficina3D } from "@/app/admin/(panel)/empresa/3d/oficina3d";
import { MuralTv } from "../mural";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acopio · La empresa" };

export default async function TvOficina({ searchParams }: { searchParams: Promise<{ "3d"?: string }> }) {
  if (!(await getServerSession(authOptions)) && !(await esTv())) redirect("/tv");
  const datos = await cargarOficina();
  return (await searchParams)["3d"] === "1" ? <Oficina3D datos={datos} enTv /> : <MuralTv datos={datos} />;
}
