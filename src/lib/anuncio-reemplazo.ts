// Cuando el anuncio que tocó la persona muestra un combo que hoy no hay (la Despensa sin almendra, 11/11),
// el bot decía «no la tenemos, ¿para qué la buscabas?» y la charla moría: 8 charlas del anuncio en 2 horas,
// 0 pedidos hasta que una persona les ofreció el Trío. Acá se elige el combo disponible más parecido
// (el que comparte más productos con el del anuncio) para ofrecerlo en el primer mensaje.

type Item = { producto: { codigo: string } };
type Combo = { slug: string; nombre: string; disponible: boolean; precio: number; items: Item[] };

/** Combo disponible que comparte más productos con el agotado; a igualdad, el de precio más cercano. Null si no comparte ninguno. */
export function comboParecido<C extends Combo>(agotado: C, combos: C[]): C | null {
  const suyos = new Set(agotado.items.map((i) => i.producto.codigo));
  let mejor: C | null = null;
  let puntos = 0;
  for (const c of combos) {
    if (!c.disponible || c.slug === agotado.slug) continue;
    const comunes = new Set(c.items.map((i) => i.producto.codigo).filter((x) => suyos.has(x))).size;
    if (!comunes) continue;
    if (comunes > puntos || (comunes === puntos && mejor && Math.abs(c.precio - agotado.precio) < Math.abs(mejor.precio - agotado.precio))) {
      mejor = c;
      puntos = comunes;
    }
  }
  return mejor;
}

// 11/11 20:43 (Daniel, charla vieja del anuncio): «¿Cuánto sale los 4k surtido?» a mitad de charla.
// El arreglo del primer mensaje no aplica y el bot volvió a «hoy no tenemos la Despensa, ¿para qué la buscabas?».
// Si lo que pide es un combo que existe pero hoy está agotado, se ofrece el parecido igual que en el primer mensaje.

const normal = (t: string) => ` ${t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim()} `;
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "con", "para", "y", "kilos", "kilo", "kg"]);

/** El combo agotado que la persona está pidiendo por su nombre («la despensa») o por sus kilos («los 4k», «4 kilos»). */
export function comboAgotadoPedido<C extends Combo>(texto: string, combos: C[]): C | null {
  const t = normal(texto);
  const kilos = [...t.matchAll(/ (\d+) ?(?:k|kg|kgs|kilo|kilos) /g)].map((m) => m[1]);
  const candidatos = combos.filter((c) => !c.disponible).filter((c) => {
    const n = normal(c.nombre);
    const palabras = n.trim().split(" ").filter((p) => p.length > 3 && !VACIAS.has(p) && !/^\d+$/.test(p));
    // Solo la primera palabra propia del nombre («despensa», «alacena»): «frutos secos» no es pedir la Alacena.
    const p = palabras[0];
    const porNombre = !!p && (t.includes(` ${p} `) || t.includes(` ${p.replace(/s$/, "")} `));
    const porKilos = kilos.some((k) => n.includes(` ${k} kilos `) || n.includes(` ${k} kg `));
    return porNombre || porKilos;
  });
  return candidatos.sort((a, b) => b.nombre.length - a.nombre.length)[0] ?? null;
}
