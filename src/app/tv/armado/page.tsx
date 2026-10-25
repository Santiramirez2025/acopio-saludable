// La pizarra de armado en una TV vinculada (o con la sesión de Santiago).
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { esTv } from "@/lib/tv";
import { pizarraArmado } from "@/lib/armado";
import { PizarraArmado } from "@/app/admin/(panel)/empresa/pizarra-armado";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pizarra de armado · Acopio" };

export default async function TvArmado() {
  const sesion = await getServerSession(authOptions);
  if (!sesion && !(await esTv())) redirect("/tv");
  return <PizarraArmado p={await pizarraArmado()} puedeMarcar={!!sesion} volver="/tv/oficina" />;
}
