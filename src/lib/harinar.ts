// Distribuidora HARINAR (Dinamarca 282, Carlos Paz; catálogo en Pediwa): segundo proveedor desde el 28/10.
// Santiago decidió comprarle girasol pelado, lino y avena (le ganan a La Granja por 6 a 33%); todo lo demás
// sigue en La Granja, que es mejor calidad y más barata en frutos secos, pasas, dátiles y mixes.
// Pablo (compras) controla la lista todos los días con GET /api/admin/analisis?parte=harinar.

/** Lo que se compra en Harinar. Si La Granja queda más barata en alguno, se vuelve a La Granja (y se avisa). */
export const COMPRAR_EN_HARINAR = ["girasol", "lino", "avena", "harina integral", "salvado de trigo", "gluten", "gotas de chocolate"] as const;

/** Categorías de Pediwa que importan para Acopio (las demás son de panadería). */
const CATEGORIAS = { 1039: "frutas secas", 1040: "cereales y semillas", 1044: "azúcar", 1042: "dulces y miel", 1050: "harinas", 1051: "almidón", 1047: "chocolates" } as const;

/** Producto de Harinar ↔ de La Granja, con los kilos de cada presentación para comparar por kilo. */
export const EQUIVALENCIAS: { clave: string; harinar: RegExp; kgH: number; granja: RegExp; kgG: number }[] = [
  { clave: "girasol", harinar: /GIRASOL PELADA/, kgH: 1, granja: /^GIRASOL PELADO X 1 KG/, kgG: 1 },
  { clave: "lino", harinar: /SEMILLA DE LINO X 1/, kgH: 1, granja: /^LINO SEMILLAS X 1 KG/, kgG: 1 },
  { clave: "avena", harinar: /AVENA GRUESA\s+X1 KG/, kgH: 1, granja: /AVENA ARROLLADA GRUESA MARCILLI X 3 KG/, kgG: 1 },
  { clave: "harina integral", harinar: /HARINA INTEGRAL CTIAL X 25/, kgH: 25, granja: /^HARINA INTEGRAL X 5 KG/, kgG: 1 },
  { clave: "salvado de trigo", harinar: /SALVADO DE TRIGO .*X 20/, kgH: 20, granja: /SALVADO DE TRIGO GRUESO X 2 KG/, kgG: 1 },
  { clave: "gluten", harinar: /^GLUTEN X 1 KG/, kgH: 1, granja: /GLUTEN DE TRIGO X 2.5 KG/, kgG: 1 },
  { clave: "gotas de chocolate", harinar: /GOTAS AGUILA\s+NEGRAS X 1 KG/, kgH: 1, granja: /GOTAS DE CHOCOLATE SEMIAMARGO X 1 KG/, kgG: 1 },
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

/** Precios de Harinar relevados a mano el 28/10/2026 (Pediwa no deja leer el catálogo desde el servidor).
 *  Se usan cuando la lectura en vivo no trae nada; la comparación lo avisa con la fecha. */
export const PRECIOS_REFERENCIA: { fecha: string; lista: [string, number, string][] } = {
  fecha: "2026-10-28",
  lista: [
    ["SEMILLA DE GIRASOL PELADA X KG", 3019.3, "cereales y semillas"],
    ["SEMILLA DE LINO X 1 KG", 2850.39, "cereales y semillas"],
    ["AVENA GRUESA  X1 KG", 1678.86, "cereales y semillas"],
    ["SEMILLA DE CHIA X 1KG", 5489.64, "cereales y semillas"],
    ["HARINA INTEGRAL CTIAL X 25 KG", 21583.2, "harinas"],
    ["SALVADO DE TRIGO CELESTIAL X 20 KG", 13249.04, "harinas"],
    ["GLUTEN X 1 KG", 9221, "almidón"],
    ["GOTAS AGUILA  NEGRAS X 1 KG", 10578.28, "chocolates"],
    ["SEMILLA DE SESAMO INTEGRAL X 1 KG", 1982.37, "cereales y semillas"],
    ["CASTAÑAS DE CAJU X 1000 GR.", 19941, "frutas secas"],
    ["NUECES BLANCAS MARIPOZAS X 1 KG", 17008.5, "frutas secas"],
    ["ALMENDRA NON PAREIL CHILE X 1 KG", 28152, "frutas secas"],
    ["PASAS DE UVA SIN SEMILLAS X 10KG.", 44574, "frutas secas"],
    ["MIX FRUTA TROPICAL X 1 KG", 12903, "frutas secas"],
    ["AZUCAR MASCABO X 2.5 KG", 11172.82, "azúcar"],
    ["MIEL PURA M. SILVINA X 5 KG", 41146.48, "dulces y miel"],
  ],
};

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

const NAVEGADOR = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml",
  "accept-language": "es-AR,es;q=0.9",
};

/** Pediwa muestra las categorías solo con la sesión de la tienda: se entra primero a la portada y se guarda la cookie. */
async function sesionTienda(): Promise<string> {
  const res = await fetch("https://app.pediwa.com/harinarsas/0?tp=0", { headers: NAVEGADOR, cache: "no-store", signal: AbortSignal.timeout(20_000) }).catch(() => null);
  const cookies = res?.headers.getSetCookie?.() ?? [];
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

export async function listaHarinar(): Promise<[string, number, string][]> {
  estadoLectura = [];
  const cookie = await sesionTienda();
  estadoLectura.push(`sesión: ${cookie ? cookie.split("; ").length + " cookies" : "sin cookie"}`);
  const partes = await Promise.all(
    Object.entries(CATEGORIAS).map(async ([id, cat]) => {
      const res = await fetch(`https://app.pediwa.com/categoria/harinarsas/${id}`, {
        headers: { ...NAVEGADOR, ...(cookie ? { cookie } : {}), referer: "https://app.pediwa.com/harinarsas/0?tp=0" },
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
