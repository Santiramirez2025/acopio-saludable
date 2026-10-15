import { redirect } from "next/navigation";

// La charla ahora se abre dentro de la bandeja, al lado de la lista. Los links viejos siguen andando.
export default async function Charla({ params }: { params: Promise<{ telefono: string }> }) {
  redirect(`/admin/whatsapp?c=${encodeURIComponent((await params).telefono)}`);
}
