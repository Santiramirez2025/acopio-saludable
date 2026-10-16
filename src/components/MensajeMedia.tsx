import { partirMarca } from "@/lib/whatsapp-media";

/** El texto de un mensaje del panel, con el audio o la foto a la vista si los hay. */
export function MensajeMedia({ texto }: { texto: string }) {
  const m = partirMarca(texto);
  if (!m) return <>{texto}</>;
  const src = `/api/admin/whatsapp/media/${m.id}`;
  return (
    <>
      {m.tipo === "foto" || m.tipo === "sticker" ? (
        <a href={src} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={m.tipo} loading="lazy" className={`rounded-lg ${m.tipo === "sticker" ? "w-28" : "max-h-72 w-auto"}`} />
        </a>
      ) : m.tipo === "audio" ? (
        <audio controls preload="none" src={src} className="w-64 max-w-full" />
      ) : m.tipo === "video" ? (
        <video controls preload="none" src={src} className="max-h-72 rounded-lg" />
      ) : (
        <a href={src} target="_blank" rel="noopener noreferrer" className="underline">📎 Abrir archivo</a>
      )}
      {m.resto && <div className="mt-1">{m.resto}</div>}
    </>
  );
}
