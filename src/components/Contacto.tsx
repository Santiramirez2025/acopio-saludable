import { leerConfig } from "@/lib/config";
import { SALUDO_GENERAL } from "@/lib/whatsapp-saludo";
import { linkWhatsapp } from "@/lib/pedidos";

/** Vías de contacto reales, tomadas de la configuración. Si falta alguna, no se inventa. */
export async function DatosContacto() {
  const cfg = await leerConfig();
  const wa = cfg.whatsapp ? linkWhatsapp(cfg.whatsapp, SALUDO_GENERAL) : null;
  return (
    <ul>
      {wa && <li>WhatsApp: <a href={wa}>escribinos por acá</a></li>}
      {cfg.emailContacto && <li>Email: <a href={`mailto:${cfg.emailContacto}`}>{cfg.emailContacto}</a></li>}
      <li>Atención: lunes a sábado, de 8 a 20 h.</li>
    </ul>
  );
}
