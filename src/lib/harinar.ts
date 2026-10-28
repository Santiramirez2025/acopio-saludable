// Distribuidora HARINAR (Dinamarca 282, Carlos Paz; catálogo en Pediwa): segundo proveedor desde el 28/10.
// Santiago decidió comprarle girasol pelado, lino y avena (le ganan a La Granja por 6 a 33%); todo lo demás
// sigue en La Granja, que es mejor calidad y más barata en frutos secos, pasas, dátiles y mixes.
// Pablo (compras) controla la lista todos los días con GET /api/admin/analisis?parte=harinar.

/** Lo que se compra en Harinar. Si La Granja queda más barata en alguno, se vuelve a La Granja (y se avisa). */
export const COMPRAR_EN_HARINAR = ["girasol", "lino", "avena"] as const;

/** Categorías de Pediwa que importan para Acopio (las demás son de panadería). */
const CATEGORIAS = { 1039: "frutas secas", 1040: "cereales y semillas", 1044: "azúcar", 1042: "dulces y miel", 1050: "harinas" } as const;

/** Producto de Harinar ↔ de La Granja, con los kilos de cada presentación para comparar por kilo. */
export const EQUIVALENCIAS: { clave: string; harinar: RegExp; kgH: number; granja: RegExp; kgG: number }[] = [
  { clave: "girasol", harinar: /GIRASOL PELADA/, kgH: 1, granja: /^GIRASOL PELADO X 1 KG/, kgG: 1 },
  { clave: "lino", harinar: /SEMILLA DE LINO X 1/, kgH: 1, granja: /^LINO SEMILLAS X 1 KG/, kgG: 1 },
  { clave: "avena", harinar: /AVENA GRUESA\s+X1 KG/, kgH: 1, granja: /AVENA ARROLLADA GRUESA MARCILLI X 3 KG/, kgG: 1 },
  { clave: "chía", harinar: /SEMILLA DE CHIA X 1/, kgH: 1, granja: /^CHIA SEMILLA X KG/, kgG: 1 },
  { clave: "sésamo integral", harinar: /SESAMO INTEGRAL X 1/, kgH: 1, granja: /^SESAMO INTEGRAL X 1 KG/, kgG: 1 },
  { clave: "cajú", harinar: /CAJU X 1000/, kgH: 1, granja: /CASTAÑA DE CAJU SK3 X 1 KG/, kgG: 1 },
  { clave: "nuez mariposa", harinar: /NUECES BLANCAS MARIPOZAS X 1/, kgH: 1, granja: /NUEZ MARIPOSA LIGHT X 1 KG/, kgG: 1 },
  { clave: "almendra", harinar: /ALMENDRA NON PAREIL CHILE X 1/, kgH: 1, granja: /ALMENDRAS NON PAREIL X 1KG/, kgG: 1 },
  { clave: "pasas", harinar: /PASAS DE UVA SIN SEMILLAS X 10/, kgH: 10, granja: /PASAS DE UVA SIN SEMILLA - CLASICA X 10 KG/, kgG: 1 },
  { clave: "mix tropical", harinar: /MIX FRUTA TROPICAL X 1/, kgH: 1, granja: /^MIX TROPICAL X 1 KG/, kgG: 1 },
  { clave: "mascabo", harinar: /MASCABO X 2.5/, kgH: 2.5, granja: /AZUCAR INTEGRAL MASCABO X 10 KG/, kgG: 1 },
  { clave: "miel", harinar: /MIEL PURA .* X 5 KG/, kgH: 5, granja: /DOS ZANGANOS - MIEL DE ABEJAS 6 X 1 KG/, kgG: 1 },
];

/** «$17.008,50» → 17008.5 */
export function precioAr(t: string): number {
  return Number(t.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
}

/** Del HTML de una categoría de Pediwa: [nombre, precio]. El nombre es el renglón anterior al precio. */
export function productosDeHtml(html: string): [string, number][] {
  const texto = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  const l = texto.split("\n").map((s) => s.trim()).filter(Boolean);
  const out: [string, number][] = [];
  for (let i = 1; i < l.length; i++) if (/^\$\s?[\d.,]+$/.test(l[i]) && precioAr(l[i]) > 0) out.push([l[i - 1].toUpperCase(), precioAr(l[i])]);
  return out.filter((p, k, a) => a.findIndex((x) => x[0] === p[0]) === k);
}

/** Último estado de la lectura de Pediwa, para diagnosticar si nos bloquea. */
export let estadoLectura: string[] = [];

export async function listaHarinar(): Promise<[string, number, string][]> {
  estadoLectura = [];
  const partes = await Promise.all(
    Object.entries(CATEGORIAS).map(async ([id, cat]) => {
      const res = await fetch(`https://app.pediwa.com/categoria/harinarsas/${id}`, {
        headers: {
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "es-AR,es;q=0.9",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      }).catch((e: unknown) => {
        estadoLectura.push(`${cat}: ${String(e).slice(0, 80)}`);
        return null;
      });
      const html = res?.ok ? await res.text() : "";
      const productos = productosDeHtml(html);
      if (res) estadoLectura.push(`${cat}: HTTP ${res.status}, ${html.length} bytes, ${productos.length} productos`);
      return productos.map(([n, p]) => [n, p, cat] as [string, number, string]);
    }),
  );
  return partes.flat();
}

export type Comparacion = { producto: string; harinarKg: number | null; granjaKg: number | null; conviene: "Harinar" | "La Granja" | "igual" | "sin dato"; diferenciaPct: number | null; compramosEn: "Harinar" | "La Granja"; alerta: string | null };

/** Compara por kilo y marca si lo que compramos en cada lado sigue conviniendo. */
export function comparar(h: [string, number, string][], g: [string, string, number][]): Comparacion[] {
  return EQUIVALENCIAS.map((e) => {
    const ph = h.find(([n]) => e.harinar.test(n));
    const pg = g.find(([, n]) => e.granja.test(n));
    const harinarKg = ph ? Math.round(ph[1] / e.kgH) : null;
    const granjaKg = pg ? Math.round(pg[2] / e.kgG) : null;
    const compramosEn = (COMPRAR_EN_HARINAR as readonly string[]).includes(e.clave) ? "Harinar" : "La Granja";
    if (!harinarKg || !granjaKg) return { producto: e.clave, harinarKg, granjaKg, conviene: "sin dato", diferenciaPct: null, compramosEn, alerta: compramosEn === "Harinar" ? "no se encontró el precio: revisar a mano" : null };
    const diferenciaPct = Math.round(((granjaKg - harinarKg) / granjaKg) * 100);
    const conviene = Math.abs(diferenciaPct) < 3 ? "igual" : diferenciaPct > 0 ? "Harinar" : "La Granja";
    const alerta =
      compramosEn === "Harinar" && conviene === "La Granja" ? "La Granja quedó más barata: volver a comprarlo ahí"
      : compramosEn === "La Granja" && conviene === "Harinar" && diferenciaPct >= 15 ? `Harinar está ${diferenciaPct}% más barato: evaluar (la calidad de La Granja es mejor)`
      : null;
    return { producto: e.clave, harinarKg, granjaKg, conviene, diferenciaPct, compramosEn, alerta };
  });
}
