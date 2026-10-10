export type Localidad = { slug: string; nombre: string; propia: boolean; detalle: string };
/** Localidades con página propia. `propia`: llega el reparto nuestro, sin cargo. */
export const LOCALIDADES: Localidad[] = [
  { slug: "san-antonio-de-arredondo", nombre: "San Antonio de Arredondo", propia: true, detalle: "Estamos a minutos: repartimos en San Antonio de Arredondo junto con Villa Carlos Paz, tanto a casas como a cabañas y complejos sobre la ruta 14." },
  { slug: "mayu-sumaj", nombre: "Mayu Sumaj", propia: true, detalle: "Llevamos tu pedido hasta Mayu Sumaj en el mismo recorrido del sur de Punilla, sin que tengas que bajar a Carlos Paz." },
  { slug: "icho-cruz", nombre: "Icho Cruz", propia: true, detalle: "Repartimos en Icho Cruz en el recorrido del sur de Punilla. Ideal para abastecer la casa o un alojamiento antes de la temporada." },
  { slug: "cuesta-blanca", nombre: "Cuesta Blanca", propia: true, detalle: "Cuesta Blanca es el último punto de nuestro reparto propio hacia el sur: te lo dejamos en la puerta, sin cargo." },
  { slug: "cordoba-capital", nombre: "Córdoba Capital", propia: false, detalle: "A Córdoba Capital despachamos por correo desde Villa Carlos Paz. El costo de envío se calcula en el carrito con tu código postal, antes de pagar." },
];
