// acopiosaludable.com/tv: si esta TV ya está vinculada, entra directo (sin código). Si no, muestra el código.
import { redirect } from "next/navigation";
import { esTv } from "@/lib/tv";
import { TvVincular } from "./codigo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acopio · TV" };

export default async function Tv() {
  if (await esTv()) redirect("/tv/oficina");
  return <TvVincular />;
}
