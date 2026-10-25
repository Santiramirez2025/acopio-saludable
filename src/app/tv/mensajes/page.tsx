// Los mensajes que entran, en la TV vinculada (solo para mirar: se contesta desde el celular).
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { esTv } from "@/lib/tv";
import { pizarraMensajes } from "@/lib/pizarra-mensajes";
import { PizarraMensajes } from "@/app/admin/(panel)/empresa/pizarra-mensajes";
import { SeguirCelular } from "../seguir-celular";
import { CharlaEnTv } from "../charla-en-tv";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mensajes · Acopio" };

export default async function TvMensajes() {
  if (!(await getServerSession(authOptions)) && !(await esTv())) redirect("/tv");
  return (
    <>
      <SeguirCelular actual="mensajes" />
      <CharlaEnTv />
      <PizarraMensajes p={await pizarraMensajes(48, 9)} enTv />
    </>
  );
}
