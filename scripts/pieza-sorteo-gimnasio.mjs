// Pieza del sorteo con gimnasios (Lucas, 5/11/2026): cambiar nombre y código lleva un minuto.
// Uso: node scripts/pieza-sorteo-gimnasio.mjs "GIMNASIO 653" GYM65310 [slug]
// Genera historia 1080x1920 y post 1080x1080 (HTML editable en fuentes/ y JPG en marketing/).
// Alcance del 10% según Ana (5/11): nuez, cajú, dátiles, granola tradicional y semillas; solo transferencia,
// no se suma al 8%. Si Ana lo cambia, se edita ALCANCE acá. Sin salud ni «sin TACC»: no agregar.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";

const [gimnasio, codigoCrudo, slugArg] = process.argv.slice(2);
if (!gimnasio || !codigoCrudo) { console.error('Uso: node scripts/pieza-sorteo-gimnasio.mjs "GIMNASIO 653" GYM65310 [slug]'); process.exit(1); }
const codigo = codigoCrudo.toUpperCase();
const slug = slugArg || gimnasio.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const ALCANCE = process.env.ALCANCE || "10% en nuez, cajú, dátiles, granola y semillas"; // gimnasios nuevos. GIMNASIO 653: ALCANCE="10% en frutos secos, mixes y combos" (lo prometido a Nahuel; Flor 5/11)
const LETRA = "Pagando por transferencia. No se suma a otros descuentos.";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const logo = readFileSync(DIR + "fuentes/2026-11-04-anuncio-datiles-1920.html", "utf8").match(/<svg.*?<\/svg>/s)[0].replace(/#10251C/g, "#FFC83D").replace(/fill="#fff"/, 'fill="#10251C"');
const FOTOS = [["real-mix-500", "Mix con cajú y girasol"], ["real-datiles", "Dátiles con carozo"], ["real-pasas", "Pasas de uva"], ["real-semillas", "Mix de semillas"]];

const grilla = (ancho, alto, letra) => `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:12px;width:${ancho}px;height:${alto}px;border-radius:30px;overflow:hidden">${FOTOS.map(([f, t]) => `<div style="position:relative;overflow:hidden"><img src="../../reales/${f}.jpg" style="width:100%;height:100%;object-fit:cover;object-position:50% 35%;transform:scale(1.15)"><span style="position:absolute;left:12px;bottom:12px;background:#10251C;color:#fff;border-radius:999px;padding:7px 16px;font:700 ${letra}px Fig">500 g · ${t}</span></div>`).join("")}</div>`;
const cupon = (t1, t2) => `<div style="border:5px dashed #FFC83D;border-radius:26px;padding:18px 24px;text-align:center"><div style="font:800 ${t1}px/1 Brico;color:#FFC83D;letter-spacing:.02em">${codigo}</div><div style="font:800 ${t2}px/1.15 Fig;margin-top:10px">${ALCANCE}</div><div style="font:500 ${Math.round(t2 * .68)}px Fig;margin-top:8px;opacity:.9">${LETRA}</div></div>`;
const boton = (h, t) => `<div class="btn" style="height:${h}px;background:#FFC83D;color:#10251C;font-size:${t}px">WhatsApp 3541 51-9630</div>`;
const doc = (w, h, c, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}</style></head><body><!-- ${c} --><div class="c" style="background:#10251C;color:#fff">${b}</div></body></html>`;

const historia = doc(1080, 1920, `sorteo ${gimnasio}, historia`, `<div style="position:absolute;left:60px;right:60px;top:220px"><div class="logo" style="color:#fff">${logo}Acopio Saludable</div>
<h1 style="font-size:138px;margin-top:22px;color:#FFC83D">Sorteamos<br>un combo</h1><div style="font:800 54px/1.1 Fig;margin-top:14px">entre los socios de ${gimnasio}</div>
<div style="margin-top:26px">${grilla(960, 520, 24)}</div><div style="font:800 40px Brico;margin-top:14px;text-align:center">Despensa chica · 2 kg</div>
<div style="margin-top:18px">${cupon(70, 34)}</div><div style="margin-top:18px">${boton(84, 38)}</div><div style="text-align:center;font:500 22px Fig;margin-top:10px;opacity:.75">Publicidad · Alianza entre Acopio Saludable y ${gimnasio}</div></div>`);

const post = doc(1080, 1080, `sorteo ${gimnasio}, post`, `<div style="position:absolute;left:50px;top:42px;width:480px"><div class="logo" style="color:#fff;font-size:28px">${logo}Acopio Saludable</div>
<h1 style="font-size:88px;margin-top:22px;color:#FFC83D">Sorteamos un combo</h1><div style="font:800 38px/1.1 Fig;margin-top:14px">entre los socios de ${gimnasio}</div></div>
<div style="position:absolute;right:50px;top:42px">${grilla(480, 500, 15)}</div>
<div style="position:absolute;left:50px;right:50px;top:566px"><div style="font:800 40px Brico;text-align:center;margin-bottom:20px">Despensa chica · 2 kg</div>${cupon(84, 36)}<div style="margin-top:20px">${boton(88, 40)}</div><div style="text-align:center;font:500 22px Fig;margin-top:12px;opacity:.75">Publicidad · Alianza entre Acopio Saludable y ${gimnasio}</div></div>`);

const navegador = await chromium.launch();
for (const [tipo, html, w, h] of [["historia", historia, 1080, 1920], ["post", post, 1080, 1080]]) {
  const base = `${hoy}-sorteo-${slug}-${tipo}`;
  writeFileSync(`${DIR}fuentes/${base}.html`, html);
  const p = await navegador.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${DIR}fuentes/${base}.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(`${DIR}${base}.jpg`);
}
await navegador.close();
