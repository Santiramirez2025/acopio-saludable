// La oficina 3D en una TV vinculada (o con la sesión de Santiago).
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { esTv } from "@/lib/tv";
import { cargarOficina } from "@/app/admin/(panel)/empresa/datos";
import { Oficina3D } from "@/app/admin/(panel)/empresa/3d/oficina3d";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acopio · La empresa" };

export default async function TvOficina() {
  if (!(await getServerSession(authOptions)) && !(await esTv())) redirect("/tv");
  return <Oficina3D datos={await cargarOficina()} enTv />;
}
