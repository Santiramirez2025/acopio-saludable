// La ficha en tres bloques: «El producto», «Qué aporta» y «Cómo usarlo» (Santiago, 24/11: «que muestre el
// producto, qué aporta, cómo usarlo, eso suma para la web»).
//
// Lo que más se vende tiene su texto propio, escrito para ese alimento. El resto del catálogo no queda vacío:
// se arma con lo que ya sabemos (por qué lo elegimos, la Nutri, la ficha viva).
// Igual que nutrientes.ts y ficha-viva.ts: se dice qué es, qué APORTA y cómo se usa. Nada de acá dice que un
// alimento cure, prevenga o trate algo. Puro, sin base: se prueba sin gastar nada.

import { fichaViva } from "./ficha-viva";
import { nutrientesDe } from "./nutrientes";

export type FichaEditorial = {
  /** Qué es y cómo es: una o dos oraciones. */
  producto: string;
  /** Qué suma a la alimentación. Null cuando no lo sabemos con certeza: mejor callar que inventar. */
  aporta: string | null;
  /** Cómo se come o se cocina. */
  uso: string;
};

type Texto = { producto: string; aporta: string; uso: string };

// El nombre tiene que EMPEZAR con el alimento: «Aceite de almendras» o «Galletas con chía» no son almendras ni chía.
const PROPIOS: [RegExp, Texto][] = [
  [/^nue(z|ces)\b(?!.*moscada)/, {
    producto: "Nuez pelada en mitades, de sabor suave y apenas amargo al final. Es la que se parte con la mano y queda bien entera sobre una torta o una ensalada.",
    aporta: "Aporta grasas insaturadas y es el fruto seco con más omega-3 vegetal. Suma también fibra, magnesio y proteína vegetal.",
    uso: "Un puñado por día: sola, en el yogur, la ensalada o el pesto. Guardala en la heladera para que no se ponga rancia.",
  }],
  [/^almendras?\b(?!.*(chocolate|garrapi))/, {
    producto: "Almendra entera con piel, crocante y de gusto dulce. La más versátil de los frutos secos: sirve tanto para picar como para la cocina.",
    aporta: "Aporta vitamina E, calcio y fibra, además de grasas insaturadas y proteína vegetal.",
    uso: "Como colación, picada en ensaladas o granola, o remojada de un día para el otro para hacer leche de almendras.",
  }],
  [/^(castanas? de caju|caju)\b(?!.*chocolate)/, {
    producto: "Castaña de cajú entera, de textura suave y gusto delicado. Es el fruto seco más cremoso, el que suelen elegir los chicos.",
    aporta: "Aporta grasas insaturadas, proteína vegetal, hierro, zinc y magnesio.",
    uso: "Como colación, en salteados y ensaladas, o remojada y licuada para salsas cremosas y quesos vegetales.",
  }],
  [/^pistachos?\b/, {
    producto: "Pistacho con cáscara, tostado y salado. Verde, crocante y con un sabor que no se parece a ningún otro fruto seco.",
    aporta: "Aporta proteína vegetal, fibra, potasio y grasas insaturadas.",
    uso: "Para la picada, para comer de a uno abriéndolo con la mano, o pelado y picado sobre helado, yogur y postres.",
  }],
  [/^avellanas?\b(?!.*chocolate)/, {
    producto: "Avellana pelada, redonda y aromática. Tostada unos minutos larga todo su perfume.",
    aporta: "Aporta vitamina E, grasas insaturadas y fibra.",
    uso: "En granolas, repostería y chocolates caseros. Procesada con cacao queda una crema untable.",
  }],
  [/^mani\b(?!.*(chocolate|crocante|saboriz|con ))/, {
    producto: "Maní pelado, sin cáscara ni piel. Es una legumbre, aunque se coma como fruto seco, y es el que más rinde por precio.",
    aporta: "Aporta proteína vegetal (el que más tiene), grasas insaturadas, magnesio y vitamina B3.",
    uso: "Para picar, en el mix de todos los días o procesado unos minutos hasta que se vuelve pasta de maní, sin agregarle nada.",
  }],
  [/^pasta de mani/, {
    producto: "Maní tostado y molido hasta volverse crema. Si arriba tiene una capa de aceite es buena señal: es el del propio maní, se revuelve y listo.",
    aporta: "Aporta proteína vegetal y grasas insaturadas. Una cucharada es la porción.",
    uso: "En tostadas, con banana, en el licuado o en la avena. También sirve de base para salsas de wok.",
  }],
  [/^pasas?\b(?!.*chocolate)/, {
    producto: "Uva secada al sol, sin semilla y sin azúcar agregada. Tierna, dulce y lista para comer.",
    aporta: "Aporta energía de absorción rápida, potasio, hierro vegetal y fibra.",
    uso: "En la avena, el yogur, budines y panes, o en lo salado: arroz, empanadas y ensaladas.",
  }],
  [/^(datil|datiles)\b/, {
    producto: "Dátil entero, carnoso y muy dulce. Es fruta desecada tal cual, sin azúcar agregada.",
    aporta: "Aporta dulzor natural junto con su fibra, además de potasio y magnesio.",
    uso: "Solo, como algo dulce después de comer; relleno con una nuez o pasta de maní; o procesado para endulzar licuados, budines y bolitas sin horno.",
  }],
  [/^higos?\b/, {
    producto: "Higo desecado entero, tierno y con sus semillitas crocantes. De los más dulces de las frutas secas.",
    aporta: "Aporta fibra, calcio y potasio.",
    uso: "Con queso y nueces en una picada, picado en budines y panes, o hidratado en té para una compota rápida.",
  }],
  [/^arandanos?\b(?!.*chocolate)/, {
    producto: "Arándano rojo desecado, de gusto ácido y dulce a la vez. Queda tierno, no duro.",
    aporta: "Aporta fibra y antioxidantes propios de la fruta. Suele venir endulzado: mirá la etiqueta.",
    uso: "En ensaladas con queso y nuez, en granola, en el yogur o en galletitas de avena.",
  }],
  [/^ciruelas?\b/, {
    producto: "Ciruela desecada, blanda y jugosa. Un clásico de la alacena.",
    aporta: "Aporta fibra, potasio y dulzor natural.",
    uso: "Sola a la mañana, en compota con canela, o picada en budines, rellenos y carnes al horno.",
  }],
  [/^(damascos?|orejones?)\b/, {
    producto: "Damasco desecado, de color anaranjado y gusto ácido suave.",
    aporta: "Aporta fibra, potasio y vitamina A.",
    uso: "En compotas, picado en granola y yogur, o en platos salados con arroz y cordero o pollo.",
  }],
  [/^banana chips/, {
    producto: "Rodajas de banana fritas y crocantes, apenas dulces.",
    aporta: "Aporta energía y potasio. Es más calórica que la fruta fresca: la porción es un puñado chico.",
    uso: "En el mix de frutos secos, sobre el yogur o solas, como algo crocante para picar.",
  }],
  [/^coco (rallado|en)/, {
    producto: "Coco desecado sin azúcar agregada, con todo su aroma.",
    aporta: "Aporta fibra y grasas propias del coco. Rinde mucho: se usa de a cucharadas.",
    uso: "En cocadas, budines, granolas y licuados, o tostado un minuto en sartén para terminar un postre.",
  }],
  [/^(semillas? de )?chia\b/, {
    producto: "Semilla chiquita y oscura, casi sin sabor. Al mojarse forma un gel: por eso espesa sin cocinar.",
    aporta: "Aporta fibra (un tercio de la semilla), omega-3 vegetal y calcio.",
    uso: "Una cucharada remojada 10 minutos en agua, leche o yogur. Hace pudding, espesa mermeladas y reemplaza al huevo en budines.",
  }],
  [/^(semillas? de )?lino\b/, {
    producto: "Semilla marrón y brillante, de gusto suave a nuez.",
    aporta: "Aporta omega-3 vegetal (la semilla que más tiene) y fibra.",
    uso: "Molida en el momento sobre el yogur, la avena o la ensalada: entera, pasa de largo. Molida, a la heladera.",
  }],
  [/^(semillas? de )?sesamo\b/, {
    producto: "Semilla de sésamo, chica y aromática. Tostada toma un sabor intenso.",
    aporta: "Aporta calcio (de los alimentos vegetales que más tienen), hierro y zinc.",
    uso: "Tostada sobre arroz, ensaladas y verduras al horno, en panes, o molida para hacer tahini.",
  }],
  [/^(semillas? de )?girasol\b/, {
    producto: "Semilla de girasol pelada, tierna y de sabor suave.",
    aporta: "Aporta vitamina E, magnesio y selenio.",
    uso: "Tostada dos minutos en sartén seca, sobre ensaladas, sopas y tostadas. También en panes y granolas.",
  }],
  [/^(semillas? de )?zapallo\b/, {
    producto: "Semilla de zapallo pelada, verde y crocante.",
    aporta: "Aporta proteína vegetal, magnesio, zinc y hierro.",
    uso: "Tostada con sal como snack, sobre sopas crema y ensaladas, o en panes y granolas.",
  }],
  [/^mix\b.*semilla/, {
    producto: "Mezcla de semillas lista para usar: se saca la cuchara del frasco y va directo al plato.",
    aporta: "Aporta fibra, omega-3 vegetal, calcio y vitamina E, según la semilla.",
    uso: "Una cucharada por día sobre el yogur, la ensalada o la avena. Lo que no muelas, masticalo bien.",
  }],
  [/^mix\b/, {
    producto: "Mezcla de frutos secos y fruta desecada que armamos y fraccionamos nosotros, con la proporción a la vista.",
    aporta: "Aporta proteína vegetal, grasas insaturadas y fibra, con el dulzor natural de la fruta.",
    uso: "Un puñado a media mañana, antes de entrenar o en la mochila. Picado, sirve arriba del yogur o la ensalada.",
  }],
  [/^granola\b/, {
    producto: "Avena horneada hasta quedar crocante, con sus agregados. Lista para servir.",
    aporta: "Aporta fibra y energía que se libera de a poco.",
    uso: "Con leche, yogur o fruta. Media taza es la porción. Cerrá bien la bolsa para que no pierda lo crocante.",
  }],
  [/^avena\b/, {
    producto: "Avena arrollada: el grano entero aplastado, sin nada agregado.",
    aporta: "Aporta fibra soluble (beta-glucanos), proteína y energía que se libera de a poco.",
    uso: "Cocida tres minutos, remojada de un día para el otro, o cruda en licuados, panqueques, galletitas y hamburguesas vegetales.",
  }],
  [/^quinoa pop/, {
    producto: "Quinoa inflada, liviana y crocante. No hace falta cocinarla.",
    aporta: "Aporta proteína vegetal con los nueve aminoácidos esenciales. No contiene gluten por naturaleza.",
    uso: "Sobre el yogur, la fruta o la ensalada, o para armar barritas con miel.",
  }],
  [/^(quinoa|quinua)\b/, {
    producto: "Grano andino chico, que cocido queda suelto y con un gusto suave a nuez.",
    aporta: "Aporta proteína vegetal con los nueve aminoácidos esenciales, fibra y hierro.",
    uso: "Lavala bien hasta que no haga espuma. Una taza de quinoa, dos de agua, 15 minutos tapada. Va en ensaladas, guisos y hamburguesas.",
  }],
  [/^harina de almendras?/, {
    producto: "Almendra molida fina. Reemplaza parte de la harina común en repostería y deja las masas húmedas.",
    aporta: "Aporta las grasas insaturadas y la proteína de la almendra, con menos carbohidratos que una harina de cereal.",
    uso: "En budines, galletitas, macarons y rebozados. Guardala en la heladera: tiene aceites que se enrancian.",
  }],
  [/^cacao amargo/, {
    producto: "Cacao puro en polvo, sin azúcar. Oscuro, intenso y bien amargo.",
    aporta: "Aporta magnesio, hierro, fibra y los antioxidantes propios del cacao.",
    uso: "Una cucharada en la leche, el café o el licuado, y en toda la repostería. Se endulza a gusto.",
  }],
  [/^miel\b/, {
    producto: "Miel pura de abejas. Si se pone dura está perfecta: cristalizar es lo que hace la miel de verdad.",
    aporta: "Aporta energía y endulza con sabor, así que se usa menos cantidad que de azúcar.",
    uso: "En el té, el yogur, las tostadas y los aderezos. Si cristalizó, baño maría tibio. No se da a bebés menores de un año.",
  }],
  [/^(garbanzos?|lentejas?(?! de chocolate)|porotos?)\b/, {
    producto: "Legumbre seca seleccionada, lista para remojar y cocinar.",
    aporta: "Aporta proteína vegetal, fibra y hierro. Con un cereal (arroz, pan) forma una proteína completa.",
    uso: "Remojo de una noche, se tira esa agua y se cocina hasta que esté tierna. Sal al final. Cocida se freeza en porciones.",
  }],
];

const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const punto = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);

/** Los tres bloques de la ficha. `porQue` es el texto «por qué lo elegimos», si el producto lo tiene. */
export function fichaEditorial(p: { codigo: string; producto: string; categoria: string; porQue?: string | null }): FichaEditorial {
  const viva = fichaViva(p);
  const usoGeneral = `${punto(viva.tips[0])} ${punto(viva.tips[1] ?? viva.idea.como)}`;
  // Lo de uso externo y los suplementos nunca reciben texto de alimento, se llamen como se llamen.
  const propio = p.categoria === "Cuidado natural" || p.categoria === "Suplementos" ? undefined : PROPIOS.find(([re]) => re.test(sinTildes(p.producto)))?.[1];
  if (propio) return { producto: p.porQue ? punto(p.porQue) : propio.producto, aporta: propio.aporta, uso: propio.uso };
  const nutri = nutrientesDe(p.codigo);
  return {
    producto: punto(p.porQue ?? viva.dato),
    aporta: nutri ? punto(nutri.destacados.join(". ")) : null,
    uso: nutri ? punto(nutri.como) : usoGeneral,
  };
}
