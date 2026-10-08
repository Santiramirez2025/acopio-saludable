import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Autoriza la subida directa de imágenes desde el panel a Vercel Blob (el archivo no pasa por la función,
// así no hay límite de 4 MB). Solo con sesión de administrador y solo imágenes.
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Falta conectar un almacén Blob al proyecto en Vercel (Storage → Blob)." }, { status: 503 });
  const body = (await req.json()) as HandleUploadBody;
  try {
    const respuesta = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (ruta) => {
        if (!(await getServerSession(authOptions))) throw new Error("No autorizado");
        if (!/^productos\/[\w.-]{1,40}\/[\w.-]{1,120}\.(png|jpe?g|webp)$/i.test(ruta)) throw new Error("Nombre de archivo no permitido");
        return { allowedContentTypes: ["image/png", "image/jpeg", "image/webp"], maximumSizeInBytes: 12 * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(respuesta);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo subir" }, { status: 400 });
  }
}
