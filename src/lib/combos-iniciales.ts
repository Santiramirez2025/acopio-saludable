// Combos, pedidos tipo y ganchos iniciales. Los códigos van SIEMPRE como texto.

export const GANCHOS = ["3622", "706", "151516121", "8052", "736684208707", "6654"];

type Item = [codigo: string, cantidad?: number];

export const COMBOS_INICIALES: {
  slug: string;
  nombre: string;
  tipo: "COMBO" | "PEDIDO_NICHO";
  nicho?: string;
  destacado?: boolean;
  descuentoPct?: number;
  items: Item[];
}[] = [
  { slug: "duo-magnesio", nombre: "Dúo Magnesio", tipo: "COMBO", destacado: true, items: [["3622"], ["10041"]] },
  {
    slug: "desayuno-30-dias",
    nombre: "Desayuno 30 días",
    tipo: "COMBO",
    destacado: true,
    items: [["0727373098181"], ["736684208707"], ["736684208714"], ["707"], ["522054"], ["6654"]],
  },
  {
    slug: "alacena-de-frutos-secos",
    nombre: "Alacena de frutos secos",
    tipo: "COMBO",
    destacado: true,
    items: [["707"], ["8052"], ["7643289"], ["897456121"], ["800000000162"]],
  },
  {
    slug: "arranque-gym",
    nombre: "Arranque Gym",
    tipo: "COMBO",
    destacado: true,
    items: [["151516121"], ["7798446310144"], ["363626"], ["365562"]],
  },
  // --- Combos por ocasión de compra. Todos con 5% de descuento sobre la suma de sus productos. ---
  {
    slug: "alacena-sin-tacc", nombre: "Alacena sin TACC", tipo: "COMBO", destacado: true, descuentoPct: 5,
    items: [["7793323004079"], ["635455"], ["224588541"], ["781718647466"], ["781718647441"], ["7798294150121"], ["7798294150190"], ["7793323025005"], ["7798195940401"]],
  },
  {
    slug: "merienda-sin-tacc", nombre: "Merienda sin TACC", tipo: "COMBO", destacado: true, descuentoPct: 5,
    items: [["7794903232509"], ["7798294150077"], ["7798294150114"], ["7798340790189"], ["7798180700133"], ["7798180700249"], ["7792198005341"]],
  },
  {
    slug: "especiero-completo", nombre: "Especiero completo", tipo: "COMBO", descuentoPct: 5,
    items: [["779814226171923"], ["7798142262044"], ["7798142260095"], ["7798142260842"], ["7798142260194"], ["7798142260606"], ["7798142261207"], ["7798142261146"], ["7798142262105"], ["7798142261627"], ["7798142261672"], ["7798142261006"]],
  },
  {
    slug: "reposteria-casera", nombre: "Repostería casera", tipo: "COMBO", descuentoPct: 5,
    items: [["25747"], ["7798142260804"], ["44556"], ["800000000154"], ["120367"], ["7798142266622"], ["7793323004857"]],
  },
  {
    slug: "picada-y-snacks", nombre: "Picada y snacks", tipo: "COMBO", descuentoPct: 5,
    items: [["000098"], ["32425262"], ["23541521"], ["42342"], ["7798171730392"], ["7798171730026"], ["7798171730019"], ["163875"], ["800000000166"]],
  },
  {
    slug: "guisos-y-legumbres", nombre: "Guisos y legumbres", tipo: "COMBO", descuentoPct: 5,
    items: [["333568"], ["55598678"], ["654314"], ["201020"], ["201021"]],
  },
  {
    slug: "mate-y-merienda", nombre: "Mate y merienda", tipo: "COMBO", descuentoPct: 5,
    items: [["7792198006645", 2], ["7795568000571"], ["7798161290219"], ["7798382830294"], ["7798256470083"], ["44556"], ["7790150100783"]],
  },
  {
    slug: "despensa-del-gym", nombre: "Despensa del gym", tipo: "COMBO", descuentoPct: 5,
    items: [["27798446310155"], ["0727373098273"], ["7798446310144"], ["00000010"], ["1102"]],
  },
  {
    slug: "pedido-familias",
    nombre: "Pedido Familias",
    tipo: "PEDIDO_NICHO",
    nicho: "familias",
    items: [
      ["3698712", 2], ["0727373098181"], ["1102"], ["707"], ["736684208707"], ["7798161290219"],
      ["522054"], ["333568"], ["55598678"], ["201020"], ["571"], ["7792198006645"],
    ],
  },
  {
    slug: "pedido-hoteleria",
    nombre: "Pedido Hotelería",
    tipo: "PEDIDO_NICHO",
    nicho: "hoteleria",
    items: [
      ["72207", 2], ["7791019000701"], ["7791019171654"], ["95668", 4], ["00000010"], ["96584677", 4],
      ["7798107990340", 3], ["7798107990364", 3], ["7792198006652", 10], ["8052", 2], ["570", 2],
    ],
  },
  {
    slug: "pedido-gimnasio-kiosco",
    nombre: "Pedido Gimnasio/Kiosco",
    tipo: "PEDIDO_NICHO",
    nicho: "gimnasios",
    items: [["151516121"], ["1515152366"], ["5674"], ["737373737371"], ["736684208707", 6]],
  },
  {
    slug: "pedido-cafeteria-panaderia",
    nombre: "Pedido Cafetería/Panadería",
    tipo: "PEDIDO_NICHO",
    nicho: "cafeterias",
    items: [
      ["706", 2], ["700"], ["7798142260811", 2], ["800000000151", 2], ["853652", 2], ["570", 2],
      ["35898741", 2], ["77981422628974", 2], ["6005"], ["27723", 3], ["21723"],
    ],
  },
  {
    slug: "pedido-rotiseria",
    nombre: "Pedido Rotisería",
    tipo: "PEDIDO_NICHO",
    nicho: "rotiserias",
    items: [
      ["7798142261719", 2], ["7798142260125"], ["7798142262075"], ["7798142261177"],
      ["7798142262495"], ["7798142260224"], ["7798142262372"], ["7798142260873"],
    ],
  },
];
