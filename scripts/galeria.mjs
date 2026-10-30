// Generador de la galería (referencia). Corre fuera del repo: necesita @fontsource-variable/bricolage-grotesque,
// @fontsource-variable/figtree y playwright instalados al lado, y los cuadros del reel en ../reel/fr.
// Genera la galería de imágenes de Acopio (1080×1350, 4:5) para WhatsApp, redes y la tienda.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const REPO = "/home/claude/acopio-saludable";
const FR = path.join(AQUI, "..", "reel", "fr");
const SALIDA = path.join(AQUI, "salida");
mkdirSync(SALIDA, { recursive: true });

const f = (p) => "file://" + p;
const fuente = (pkg, file) => f(path.join(AQUI, "node_modules/@fontsource-variable", pkg, "files", file));
const isotipo = readFileSync(path.join(REPO, "public/marca/acopio-isotipo-crema.svg"), "utf8");
const isotipoOscuro = readFileSync(path.join(REPO, "public/marca/acopio-isotipo.svg"), "utf8");
const P = (n) => f(path.join(REPO, "public/img/productos", n));
const C = (n) => f(path.join(REPO, "public/img/combos/v3", n));

const css = `
@font-face{font-family:"Brico";src:url(${fuente("bricolage-grotesque", "bricolage-grotesque-latin-wght-normal.woff2")}) format("woff2");font-weight:200 800}
@font-face{font-family:"Fig";src:url(${fuente("figtree", "figtree-latin-wght-normal.woff2")}) format("woff2");font-weight:300 900}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px}
body{font-family:"Fig";color:#10251C;background:#F6F1E7;-webkit-font-smoothing:antialiased}
.card{position:relative;width:1080px;height:1350px;overflow:hidden}
.foto{position:absolute;left:48px;right:48px;top:48px;height:790px;border-radius:44px;overflow:hidden;box-shadow:0 30px 60px -30px rgba(16,37,28,.45)}
.foto img{width:100%;height:100%;object-fit:cover}
.marca{position:absolute;top:14px;left:2px;display:flex;align-items:center;gap:12px;background:rgb(16,37,28);color:#F6F1E7;border-radius:999px;padding:16px 28px 16px 34px;font:700 26px "Fig";letter-spacing:.01em}
.marca svg{width:44px;height:44px}
.agua{position:absolute;right:26px;bottom:24px;display:flex;align-items:center;gap:8px;color:rgba(246,241,231,.92);font:600 21px "Fig";text-shadow:0 1px 6px rgba(0,0,0,.55)}
.agua svg{width:30px;height:30px;opacity:.95}
.tag{position:absolute;left:22px;bottom:20px;min-width:330px;text-align:center;background:#FFC83D;color:#10251C;border-radius:999px;padding:16px 30px;font:800 28px "Fig";box-shadow:0 0 0 8px rgba(16,37,28,.0)}
.txt{position:absolute;left:84px;right:84px;top:888px}
.ceja{font:800 24px "Fig";letter-spacing:.16em;text-transform:uppercase;color:#0F6B4F}
h1{font:800 84px/0.98 "Brico";letter-spacing:-.025em;margin-top:14px}
h1.largo{font-size:70px}
.lista{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:16px 34px}
.lista div{display:flex;gap:14px;align-items:baseline;font:500 31px/1.2 "Fig"}
.lista b{font-weight:800;white-space:nowrap}
.lista i{flex:none;width:12px;height:12px;border-radius:50%;background:#FFC83D;transform:translateY(-4px)}
.sub{margin-top:24px;font:500 32px/1.35 "Fig";color:#33473C;max-width:880px}
.nota{position:absolute;left:84px;right:84px;bottom:114px;font:600 26px "Fig";color:#4D5E55;display:flex;align-items:center;gap:10px}
.nota b{color:#0F6B4F}
.pie{position:absolute;left:0;right:0;bottom:0;height:96px;background:#10251C;color:#F6F1E7;display:flex;align-items:center;justify-content:space-between;padding:0 64px;font:600 25px "Fig"}
.pie .url{display:flex;align-items:center;gap:12px;font-weight:800;color:#FFC83D}
.pie svg{width:34px;height:34px}
/* Foto real a sangre */
.full img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.full .velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,37,28,0) 38%,rgba(16,37,28,.55) 60%,rgba(16,37,28,.95) 86%)}
.full .txt{top:auto;bottom:150px;color:#F6F1E7}
.full .ceja{color:#FFC83D}
.full .sub{color:rgba(246,241,231,.9)}
`;

const pie = `<div class="pie"><span>Villa Carlos Paz · Entrega sin cargo en la zona</span><span class="url">${isotipo}acopiosaludable.com</span></div>`;
const marca = `<div class="marca">${isotipo}Acopio Saludable</div>`;
const agua = `<div class="agua">${isotipo}acopiosaludable.com</div>`;

const ficha = ({ foto, posicion = "center", tag, ceja, titulo, items, sub }) => `
<div class="card">
  <div class="foto"><img src="${foto}" style="object-position:${posicion}">${marca}${agua}${tag ? `<div class="tag">${tag}</div>` : ""}</div>
  <div class="txt"><div class="ceja">${ceja}</div><h1 class="${titulo.length > 20 ? "largo" : ""}">${titulo}</h1>
  ${items ? `<div class="lista">${items.map(([q, n]) => `<div><i></i><span><b>${q}</b> ${n}</span></div>`).join("")}</div>` : ""}
  ${sub ? `<p class="sub">${sub}</p>` : ""}</div>
  <div class="nota"><b>→</b> Fraccionado en el día · Pedilo por WhatsApp</div>
  ${pie}
</div>`;

const real = ({ foto, posicion = "center", ceja, titulo, sub }) => `
<div class="card full"><img class="bg" src="${foto}" style="object-position:${posicion}"><div class="velo"></div>
  <div style="position:absolute;top:44px;left:44px">${marca.replace('class="marca"', 'class="marca" style="position:static"')}</div>
  <div class="txt"><div class="ceja">${ceja}</div><h1>${titulo}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div>
  ${pie}
</div>`;

export const PIEZAS = [
  // ——— Combos ———
  { id: "combo-despensa-4-kilos", html: ficha({ foto: C("despensa-4-kilos.webp"), tag: "Te dura todo el mes", ceja: "Combo · 4 kilos", titulo: "Despensa de 4 kilos", items: [["1 kg", "Mix clásico con cajú"], ["1 kg", "Dátiles Deglet Nour"], ["1 kg", "Pasas de uva"], ["1 kg", "Mix de semillas"]] }) },
  { id: "combo-despensa-chica", html: ficha({ foto: C("despensa-chica.webp"), tag: "Ideal para probar", ceja: "Combo · 2 kilos", titulo: "Despensa chica", items: [["500 g", "Mix clásico con cajú"], ["500 g", "Dátiles Deglet Nour"], ["500 g", "Pasas de uva"], ["500 g", "Mix de semillas"]] }) },
  { id: "combo-alacena-de-frutos-secos", html: ficha({ foto: C("alacena-de-frutos-secos.webp"), tag: "3 kilos", ceja: "Combo · frutos secos", titulo: "Alacena de frutos secos", items: [["1 kg", "Nuez mariposa"], ["1 kg", "Mix clásico con cajú"], ["1 kg", "Pasas de uva"]] }) },
  { id: "combo-desayuno-30-dias", html: ficha({ foto: C("desayuno-30-dias.webp"), tag: "Un mes de desayunos", ceja: "Combo · desayuno", titulo: "Desayuno 30 días", items: [["1 kg", "Granola tradicional"], ["1 kg", "Granola con pasta de maní"], ["370 g", "Pasta de maní"], ["500 g", "Miel pura"]] }) },
  { id: "combo-mixes-del-mes", html: ficha({ foto: C("mixes-del-mes.webp"), tag: "3 kilos", ceja: "Combo · mixes", titulo: "Mixes del mes", items: [["1 kg", "Mix clásico con girasol"], ["1 kg", "Mix tropical sin maní"], ["1 kg", "Pasas de uva"]] }) },
  { id: "combo-arranque-gym", html: ficha({ foto: C("arranque-gym.webp"), tag: "Para entrenar", ceja: "Combo · gym", titulo: "Pack gym del mes", items: [["1 kg", "Granola proteica"], ["1 kg", "Avena arrollada"], ["250 g", "Cacao amargo"], ["500 g", "Almendras"], ["370 g", "Pasta de maní proteica"]] }) },
  // ——— Productos más pedidos ———
  { id: "producto-nuez", html: ficha({ foto: P("nuez-mariposa.webp"), tag: "Cosecha nueva", ceja: "Frutos secos", titulo: "Nuez mariposa", sub: "Entera, clara y crocante. La fraccionamos en el día: 500 g o 1 kg." }) },
  { id: "producto-almendras", html: ficha({ foto: P("almendras.webp"), tag: "Non Pareil", ceja: "Frutos secos", titulo: "Almendras", sub: "La almendra grande, pareja y crocante. En 500 g o 1 kg." }) },
  { id: "producto-caju", html: ficha({ foto: P("castanas-caju.webp"), tag: "Enteras", ceja: "Frutos secos", titulo: "Castañas de cajú", sub: "Enteras y suaves, para picar o para la cocina. En 500 g o 1 kg." }) },
  { id: "producto-mix-clasico", html: ficha({ foto: P("mix-frutos-secos.webp"), tag: "El más pedido", ceja: "Mix propio", titulo: "Mix clásico con cajú", sub: "Maní, pasas, girasol, nuez, cajú y almendra. Lo armamos nosotros, en el día." }) },
  { id: "producto-datiles", html: ficha({ foto: P("datiles.webp"), tag: "Deglet Nour", ceja: "Frutas desecadas", titulo: "Dátiles", sub: "Carnosos y bien dulces, con carozo. En 500 g o 1 kg." }) },
  { id: "producto-pasas", html: ficha({ foto: P("pasas-de-uva.webp"), tag: "Sin semilla", ceja: "Frutas desecadas", titulo: "Pasas de uva", sub: "Negras y rubias, para la avena, la ensalada o el mix." }) },
  // ——— Fotos reales: así trabajamos y así llega ———
  { id: "real-asi-llega", html: real({ foto: f(path.join(FR, "g21.jpg")), posicion: "center 30%", ceja: "Así llega tu pedido", titulo: "Armado a mano, con una nota para vos", sub: "Cada pedido sale en bolsa kraft, con todo fraccionado y rotulado." }) },
  { id: "real-armamos-tu-pedido", html: real({ foto: f(path.join(FR, "f20.jpg")), posicion: "center 40%", ceja: "Detrás de escena", titulo: "Así armamos tu despensa", sub: "Pesamos, cerramos y rotulamos cada bolsa el mismo día que sale." }) },
  { id: "real-datiles", html: real({ foto: f(path.join(FR, "f9.5.jpg")), ceja: "Recién fraccionados", titulo: "Dátiles Deglet Nour", sub: "Así de carnosos llegan a tu casa." }) },
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
const solo = process.argv[2];
for (const p of PIEZAS.filter((x) => !solo || x.id === solo)) {
  const archivo = path.join(SALIDA, p.id + ".html");
  writeFileSync(archivo, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${p.html}</body></html>`);
  await page.goto(f(archivo));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SALIDA, p.id + ".jpg"), type: "jpeg", quality: 90 });
  console.log("ok", p.id);
}
await browser.close();
