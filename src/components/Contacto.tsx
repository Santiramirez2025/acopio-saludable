import { leerConfig } from "@/lib/config";
import { linkWhatsapp } from "@/lib/pedidos";

/** Vías de contacto reales, tomadas de la configuración. Si falta alguna, no se inventa. */
export async function DatosContacto() {
  const cfg = await leerConfig();
  const wa = cfg.whatsapp ? linkWhatsapp(cfg.whatsapp, "Hola, tengo una consulta sobre Acopio Saludable.") : null;
  return (
    <ul>
      {wa && <li>WhatsApp: <a href={wa}>escribinos por acá</a></li>}
      {cfg.emailContacto && <li>Email: <a href={`mailto:${cfg.emailContacto}`}>{cfg.emailContacto}</a></li>}
      <li>Atención: lunes a sábado, de 8 a 20 h.</li>
    </ul>
  );
}
