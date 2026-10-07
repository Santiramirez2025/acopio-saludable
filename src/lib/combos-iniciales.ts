// Combos, pedidos tipo y ganchos iniciales. Los códigos van SIEMPRE como texto.

export const GANCHOS = ["3622", "706", "151516121", "8052", "736684208707", "6654"];

type Item = [codigo: string, cantidad?: number];

export const COMBOS_INICIALES: {
  slug: string;
  nombre: string;
  tipo: "COMBO" | "PEDIDO_NICHO";
  nicho?: string;
  destacado?: boolean;
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
