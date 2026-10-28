// La oferta del Equipo de Agentes (sin dependencias de servidor: la usan la landing y el formulario).
export const PRECIO_IMPLEMENTACION = 4_900_000;
export const PRECIO_MENSUAL = 490_000;
export const WA_TEXTO_SISTEMA = "Hola, quiero el equipo de agentes de IA para mi empresa #agentes";

// Freno al formulario público de /agentes: cada envío escribe en la base y le manda un WhatsApp a Santiago,
// así que un robot podría llenarle el teléfono (y gastar mensajes). Tope general cada 15 minutos y tope por
// teléfono por día; quien se pase sigue igual por WhatsApp, que es donde Marcos atiende de verdad.
export const LEADS_MAX_15MIN = 5;
export const LEADS_MAX_TELEFONO_DIA = 2;
export function admiteLead(ultimos15min: number, mismoTelefonoHoy: number): boolean {
  return ultimos15min < LEADS_MAX_15MIN && mismoTelefonoHoy < LEADS_MAX_TELEFONO_DIA;
}
