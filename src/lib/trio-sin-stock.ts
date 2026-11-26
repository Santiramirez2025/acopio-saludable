// 26/11 (Laura, P1): La Granja se quedó sin dátiles (LG-DATIL sin stock desde las 7:40) y el Trío salió de la web.
// Igual el anuncio «3 kilos por $24.000» seguía trayendo «quiero el Trío con las 3 recetas» y el bot:
// 1) mandaba la FOTO de la Alacena ($37.700/$41.000), porque recomendar_combo elegía el combo disponible más
//    parecido y le pegaba su imagen (Cris, Susana, Ali, Sergio, Cristina, Mari: 6 charlas en una hora);
// 2) seguía tomando el Trío como si hubiera, prometiendo el reparto.
// Regla: si piden el Trío y hoy no está, NINGUNA foto de otro combo; se toman los datos con el mismo precio y
// sin prometer día: «te confirmamos el día apenas entran los dátiles». Sin descuentos ni cambio de precio.
import { nombraElTrio } from "./whatsapp-interactivo";

export const TRIO_SLUG = "trio-de-frutos-secos";

/** La charla es sobre el Trío: lo nombra el cliente o el anuncio que tocó («3 kilos por $24.000»). */
export function hablaDelTrio(textos: Array<string | null | undefined>): boolean {
  return textos.some((t) => {
    if (!t) return false;
    if (nombraElTrio(t)) return true;
    const s = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return /\b3 kilos (por|a) \$?\s?24[.,]?000\b|\b3 recetas\b/.test(s);
  });
}

export const FRASE_DIA_TRIO = "te confirmamos el día apenas entran los dátiles";

/** Lo que el vendedor tiene que hacer cuando piden el Trío y hoy no hay dátiles. */
export function instruccionTrioSinStock(precio: string): string {
  return (
    `HOY EL TRÍO NO TIENE DÁTILES (el proveedor se quedó sin stock). Si te piden el Trío: el precio sigue siendo ${precio}, sin descuento ni otro precio. ` +
    `Podés tomar sus datos (nombre, calle y número, barrio), pero NO prometas día ni horario de entrega ni «sale en el reparto de hoy/mañana»: ` +
    `decí «${FRASE_DIA_TRIO}». No ofrezcas otro combo en su lugar ni mandes la foto de otro combo; si pregunta qué otra cosa hay, recién ahí ` +
    `buscalo con las herramientas. No digas «lo anotamos» ni «queda agendado».`
  );
}
