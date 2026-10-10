/** Guías prácticas de compra y uso. Solo cocina, conservación y rendimiento: nada de promesas de salud. */
export type Guia = {
  slug: string;
  titulo: string;
  descripcion: string;
  actualizada: string; // AAAA-MM-DD
  gondola: string; // categoría del catálogo que acompaña la guía
  resumen: string[];
  secciones: { titulo: string; parrafos?: string[]; lista?: string[] }[];
  fuentes?: { nombre: string; url: string }[];
};

const CAA = { nombre: "Código Alimentario Argentino (ANMAT)", url: "https://www.argentina.gob.ar/anmat/codigoalimentario" };
const ALG = { nombre: "Listado Integrado de Alimentos Libres de Gluten (ANMAT)", url: "https://listadoalg.anmat.gob.ar/" };

export const GUIAS: Guia[] = [
  {
    slug: "como-conservar-frutos-secos",
    titulo: "Cómo conservar frutos secos para que no se pongan rancios",
    descripcion: "Dónde guardar nueces, almendras y castañas compradas por kilo, cuánto duran en alacena, heladera y freezer, y cómo darte cuenta si se pasaron.",
    actualizada: "2026-10-10",
    gondola: "Frutos secos y mix",
    resumen: ["Frasco hermético, lejos de la luz y del calor.", "En heladera duran varios meses; en freezer, cerca de un año.", "Si huelen a pintura o saben amargos, están rancios."],
    secciones: [
      { titulo: "Por qué se echan a perder", parrafos: ["Los frutos secos tienen mucho aceite. Ese aceite se oxida con el aire, la luz y el calor, y ahí aparece el gusto rancio. No es un problema de vencimiento sino de cómo se guardan: el mismo kilo puede durar un mes sobre la mesada o casi un año bien guardado."] },
      { titulo: "Dónde guardarlos", lista: ["Alacena fresca y oscura, en frasco de vidrio con tapa hermética: de uno a tres meses según el fruto.", "Heladera, en frasco o bolsa bien cerrada: de cuatro a seis meses.", "Freezer, en bolsas chicas para sacar de a una: hasta un año. No hace falta descongelar, se comen o se usan directo."] },
      { titulo: "Cuáles duran menos", parrafos: ["Las nueces y los piñones son los más delicados porque tienen más aceite. Las almendras y las castañas de cajú aguantan mejor. Los frutos pelados, picados o tostados duran menos que los enteros y crudos, así que conviene comprar entero y procesar en casa."] },
      { titulo: "Si comprás por kilo", parrafos: ["Separá apenas llega: un frasco chico para la semana en la alacena y el resto a la heladera o al freezer. Así abrís el frasco grande pocas veces y el aire no lo arruina. Anotá la fecha en la tapa."] },
      { titulo: "Cómo saber si se pasaron", lista: ["Olor fuerte, parecido a pintura o a aceite viejo.", "Gusto amargo o que raspa la garganta.", "Color más oscuro o aspecto aceitoso por fuera.", "Humedad, moho o bichitos: en ese caso se descartan."] },
    ],
    fuentes: [CAA],
  },
  {
    slug: "que-harina-sin-tacc-usar-para-pan",
    titulo: "Qué harina sin TACC usar para hacer pan",
    descripcion: "Qué harinas y féculas sin gluten combinar para pan, para qué sirve el psyllium y cuándo conviene una premezcla lista.",
    actualizada: "2026-10-10",
    gondola: "Harinas y Féculas",
    resumen: ["Ninguna harina sin gluten funciona sola: se mezclan.", "Base de arroz más féculas de mandioca y de maíz.", "Psyllium o goma xántica para que la masa ligue."],
    secciones: [
      { titulo: "Por qué hay que mezclar", parrafos: ["El gluten es lo que le da elasticidad a la masa de trigo y retiene el gas de la levadura. Sin gluten, una sola harina da un pan apelmazado o que se desarma. Por eso las recetas combinan una harina que aporta cuerpo con féculas que aportan liviandad, más un ingrediente que ligue."] },
      { titulo: "Una mezcla base que funciona", lista: ["Harina de arroz: alrededor de la mitad de la mezcla. Da estructura y sabor neutro.", "Fécula de mandioca: cerca de un cuarto. Aporta elasticidad y corteza.", "Fécula de maíz: cerca de un cuarto. Da miga más tierna.", "Psyllium en polvo: una o dos cucharadas por cada medio kilo de mezcla. Es lo que reemplaza la elasticidad del gluten."] },
      { titulo: "Para variar el sabor", parrafos: ["Podés reemplazar una parte de la harina de arroz por harina de garbanzo, de trigo sarraceno o de avena sin gluten. Suman sabor y color, pero en exceso dejan el pan pesado: empezá cambiando un quinto de la mezcla y probá."] },
      { titulo: "Premezcla o armarla en casa", parrafos: ["La premezcla lista ahorra pruebas y sale pareja siempre: conviene si recién empezás o si hacés pan pocas veces. Armar la mezcla con harinas por kilo sale más barato y te deja ajustarla a tu gusto: conviene si horneás todas las semanas o para un emprendimiento."] },
      { titulo: "Qué mirar al comprar", parrafos: ["Que el envase tenga el logo oficial sin TACC y que el producto figure en el listado de ANMAT. En harinas esto importa mucho, porque un molino que también procesa trigo puede contaminar el producto aunque el ingrediente no tenga gluten."] },
    ],
    fuentes: [ALG, CAA],
  },
  {
    slug: "cuanto-rinde-un-kilo-de-granola",
    titulo: "Cuánto rinde un kilo de granola",
    descripcion: "Cuántas porciones salen de un kilo de granola, cuánto comprar para una familia o para el desayuno de un alojamiento y cómo conservarla crocante.",
    actualizada: "2026-10-10",
    gondola: "Cereales y granolas",
    resumen: ["Una porción son entre 40 y 50 gramos.", "Un kilo rinde de 20 a 25 porciones.", "En frasco hermético se mantiene crocante varias semanas."],
    secciones: [
      { titulo: "La cuenta", parrafos: ["Una porción de granola para acompañar yogur o leche es de 40 a 50 gramos, más o menos media taza. De un kilo salen entre 20 y 25 porciones. Si se usa solo como agregado arriba de una fruta o un postre, la porción baja a unos 25 gramos y el kilo rinde cerca de 40."] },
      { titulo: "Cuánto comprar para casa", lista: ["Una persona que desayuna granola todos los días: un kilo por mes.", "Una familia de cuatro: entre tres y cuatro kilos por mes.", "Si la usás de vez en cuando: medio kilo alcanza para varias semanas."] },
      { titulo: "Cuánto comprar para un alojamiento", parrafos: ["En un desayuno con varias opciones, no todos se sirven granola. Una regla práctica es calcular 30 gramos por huésped por día. Para diez huéspedes durante una semana son poco más de dos kilos. En temporada alta conviene tener un kilo de reserva, porque es de lo primero que se termina."] },
      { titulo: "Cómo mantenerla crocante", parrafos: ["La granola se ablanda con la humedad. Guardala en un frasco hermético, lejos de la cocina y de la pava. En un desayuno buffet, serví en un recipiente chico con tapa y reponé seguido, en vez de dejar un bol grande abierto toda la mañana."] },
    ],
  },
  {
    slug: "cuanto-rinden-las-legumbres-secas",
    titulo: "Cuánto rinden las legumbres secas una vez cocidas",
    descripcion: "Cuánto crecen lentejas, garbanzos y porotos al cocinarse, cuánto calcular por persona, tiempos de remojo y cómo guardarlas.",
    actualizada: "2026-10-10",
    gondola: "Legumbres",
    resumen: ["Cocidas pesan entre dos y dos veces y media lo que pesan secas.", "Calculá de 60 a 80 gramos en seco por persona.", "Secas duran más de un año en un frasco cerrado."],
    secciones: [
      { titulo: "Cuánto crecen", lista: ["Lentejas: un kilo seco da alrededor de dos kilos y medio cocidas.", "Garbanzos: un kilo seco da poco más de dos kilos cocidos.", "Porotos: un kilo seco da entre dos y dos kilos y medio cocidos.", "Arvejas partidas: se deshacen al cocinarse, rinden parecido a las lentejas."] },
      { titulo: "Cuánto calcular por persona", parrafos: ["Para un guiso o una ensalada como plato principal, de 60 a 80 gramos en seco por persona. Con un kilo comen entre doce y quince personas. Como guarnición, alcanza con 40 gramos."] },
      { titulo: "Remojo y cocción", lista: ["Lentejas: no necesitan remojo. Se cocinan en 20 a 30 minutos.", "Garbanzos: remojo de 8 a 12 horas. Cocción de una hora a una hora y media.", "Porotos: remojo de 8 a 12 horas. Cocción de una hora o más, según el tipo.", "La sal va al final: si se pone al principio, tardan más en ablandarse."] },
      { titulo: "Cómo guardarlas", parrafos: ["Secas, en frasco cerrado y lugar seco, duran más de un año. Con el tiempo no se echan a perder, pero tardan más en cocinarse. Cocidas, aguantan tres o cuatro días en heladera y varios meses en freezer, en porciones: es la forma más práctica de aprovechar una compra por kilo."] },
    ],
    fuentes: [CAA],
  },
  {
    slug: "desayuno-para-cabanas-y-hoteles",
    titulo: "Cómo armar el desayuno de una cabaña u hotel comprando por volumen",
    descripcion: "Qué productos secos conviene tener, cuánto calcular por huésped y cómo organizar la compra para la temporada en Carlos Paz y Punilla.",
    actualizada: "2026-10-10",
    gondola: "Café, yerba e infusiones",
    resumen: ["Calculá por huésped y por noche, no por semana.", "Lo seco se compra para todo el mes; lo fresco, cerca.", "Porciones chicas y reposición seguida: se tira menos."],
    secciones: [
      { titulo: "Qué conviene comprar por volumen", lista: ["Infusiones: café, té, mate cocido y yerba.", "Cereales y granola.", "Mermeladas, miel y dulce de leche.", "Tostadas y galletitas envasadas.", "Frutos secos y frutas desecadas, para sumar al yogur o como detalle de bienvenida.", "Azúcar y edulcorante."] },
      { titulo: "Cantidades por huésped y por noche", lista: ["Café molido: 10 gramos por taza.", "Yerba: 50 gramos por mate armado; una cabaña para cuatro usa cerca de medio kilo por estadía de una semana.", "Granola o cereal: 30 gramos.", "Mermelada o dulce: 25 gramos.", "Tostadas: tres o cuatro unidades."] },
      { titulo: "Un ejemplo", parrafos: ["Un complejo de cinco cabañas para cuatro personas, con ocupación completa, suma 140 desayunos por semana. Con las cantidades de arriba son unos cuatro kilos de granola, tres kilos y medio de mermelada y un kilo y medio de café por semana. Pidiendo una vez por mes, lo seco se resuelve en un solo pedido."] },
      { titulo: "Para tirar menos", parrafos: ["Serví en recipientes chicos y reponé. Los envases individuales son más caros por kilo, pero convienen en cabañas donde el desayuno se deja armado: lo que el huésped no abre, sirve para el siguiente."] },
    ],
  },
  {
    slug: "cuanta-especia-comprar-por-peso",
    titulo: "Especias por peso: cuánto comprar y cómo guardarlas",
    descripcion: "Cuánto rinden las especias compradas por peso, cuánto duran molidas y enteras y cómo conservar el aroma.",
    actualizada: "2026-10-10",
    gondola: "Especias",
    resumen: ["Molidas mantienen el aroma unos seis meses; enteras, más de un año.", "Para una casa, 50 a 100 gramos de cada una alcanzan para meses.", "Frasco cerrado, lejos de la hornalla."],
    secciones: [
      { titulo: "Cuánto rinden", parrafos: ["Una cucharadita de especia molida pesa entre dos y tres gramos. Cien gramos de pimentón o de orégano son más de treinta cucharaditas: para una casa, varios meses de uso. Por eso, salvo las que usás a diario, conviene comprar poco de cada una y más variedad."] },
      { titulo: "Cuánto duran", lista: ["Especias molidas: aroma pleno durante unos seis meses.", "Especias enteras (pimienta en grano, comino en semilla, canela en rama): más de un año.", "Hierbas secas (orégano, tomillo, laurel): alrededor de un año.", "Pasado ese tiempo no hacen mal, pero perfuman menos y hay que usar más."] },
      { titulo: "Cómo guardarlas", parrafos: ["En frascos de vidrio con tapa, en un lugar oscuro y fresco. El peor lugar es el estante de arriba de la cocina: el calor y el vapor les sacan el aroma. Si comprás medio kilo o más para un local, dejá un frasco chico a mano y el resto cerrado en la despensa."] },
      { titulo: "Para rotiserías y pizzerías", parrafos: ["Orégano, ají molido, pimentón y provenzal son las de más rotación. Calculá el consumo de una semana, multiplicá por cuatro y pedí eso: comprás a mejor precio por kilo y no te queda mercadería perdiendo aroma."] },
    ],
  },
];

export const fechaLarga = (iso: string) => new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
