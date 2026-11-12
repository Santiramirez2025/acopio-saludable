// Piezas del 12/11/2026 (Lucas). Solo fotos reales de fuentes/: semillas en bolsa sola (2026-11-11), dátiles en plato (2026-11-04), pasas de cerca (2026-11-10).
// Precios verificados el 12/11 con POST /api/carrito (lo que cobra la web): Trío del desayuno x1 = $21.500 / $19.700 transf.; x2 = $43.000 / $39.500 transf.
// Ojo: 2 kg pasas + 2 kg dátiles + 2 kg semillas sueltos = $44.000 / $40.400 (no $40.500): el anuncio de 6 kilos se arma con 2 Tríos, que sale menos.
// Uso: node scripts/piezas-2026-11-12.mjs → HTML editable en fuentes/ y JPG en marketing/.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const logoA = logoV.replace(/#10251C/g, "#FFC83D").replace(/fill="#fff"/, 'fill="#10251C"');
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center}.foto img{width:100%;height:100%;object-fit:cover;display:block}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const btn = (w, h, t, txt, st = "") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px;${st}">${wa}${txt}</div>`;
const SEM = "2026-11-11-semillas-bolsa-sola-foto.jpg", DAT = "2026-11-04-datiles-plato-foto.jpg", PAS = "2026-11-10-pasas-cerca-foto.jpg";
const tres = (fh, kg, alto) => `<div style="display:flex;gap:14px;width:980px">${[[SEM, "50% 50%", "Mix de semillas"], [DAT, "35% 40%", "Dátiles con carozo"], [PAS, "50% 75%", "Pasas sin semilla"]].map(([s, p, n]) => `<div style="flex:1"><div class="foto" style="height:${fh}px"><img class="real" src="${s}" style="object-position:${p}"></div><div style="font:800 ${alto ? 31 : 28}px/1.15 Fig;margin-top:10px">${n}<br><span style="color:var(--amarillo)">${kg}</span></div></div>`).join("")}</div>`;

const piezas = {};
// 1) Paula (orden 12/11): «Trío del desayuno · 3 kilos» v01. Reemplaza «La ves antes de pagar». Fondo verde oscuro: se separa del post orgánico crema del Trío (11/11).
const trio = (w, h) => {
  const alto = h === 1920;
  return doc(w, h, `Lucas 12/11/2026 · Paula: anuncio Trío del desayuno 3 kilos v01 ${w}x${h}; $21.500 / $19.700 transf. verificado 12/11 en /api/carrito y /combos/trio-del-desayuno. Sin aprobar ni publicar.`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:${alto ? 230 : 56}px 50px 0;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<h1 style="font-size:${alto ? 112 : 96}px;margin-top:${alto ? 28 : 18}px;line-height:1">3 kilos para<br><span style="color:var(--amarillo)">tu desayuno</span></h1>
<div style="margin-top:${alto ? 40 : 28}px">${tres(alto ? 520 : 505, "1 kg", alto)}</div>
<div style="font:800 ${alto ? 150 : 124}px/1 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:${alto ? 40 : 24}px">$21.500</div>
<div style="font:800 ${alto ? 44 : 38}px Fig;margin-top:8px"><span style="background:#fff;color:var(--verde);padding:4px 18px;border-radius:12px">$19.700 por transferencia</span></div>
<div style="margin-top:${alto ? 44 : 26}px">${btn(960, alto ? 96 : 86, alto ? 42 : 38, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde)")}</div>
<div style="font:600 ${alto ? 29 : 25}px Fig;color:#C9D6CF;margin-top:14px">Envío sin cargo en Carlos Paz y la zona · Se paga antes de la entrega</div></div></div>`);
};
piezas["2026-11-12-anuncio-trio-desayuno-1350"] = [1080, 1350, trio(1080, 1350)];
piezas["2026-11-12-anuncio-trio-desayuno-1920"] = [1080, 1920, trio(1080, 1920)];

// 2) Paula (orden 11/11): «6 kilos» v01, ángulo precio por kilo. Se arma con 2 Tríos ($43.000 / $39.500), que es lo que cobra la web.
// No dice «despensa» para no mezclarlo con la Despensa de 4 kilos agotada (el bot ya tuvo confusiones con eso).
const seis = (w, h) => {
  const alto = h === 1920;
  return doc(w, h, `Lucas 12/11/2026 · Paula: anuncio 6 kilos v01 ${w}x${h}; 2 x Trío del desayuno = $43.000 / $39.500 transf. (39.500/6 = $6.583 el kilo), verificado 12/11 en /api/carrito. Sin aprobar ni publicar.`, `<div class="c" style="background:var(--crema)"><div class="col" style="padding:${alto ? 230 : 70}px 50px 0"><div class="logo">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:${alto ? 30 : 20}px">2 kilos de cada uno</div>
<h1 style="font-size:${alto ? 110 : 94}px;margin-top:${alto ? 22 : 16}px;line-height:1">6 kilos <em>por $43.000</em></h1>
<div style="margin-top:${alto ? 38 : 26}px">${tres(alto ? 520 : 540, "2 kg", alto).replace(/color:var\(--amarillo\)/g, "color:var(--rojo)")}</div>
<div style="font:800 ${alto ? 46 : 40}px Fig;margin-top:${alto ? 44 : 26}px"><span style="background:var(--amarillo);padding:6px 20px;border-radius:12px">$39.500 por transferencia</span></div>
<div style="font:800 ${alto ? 40 : 34}px Fig;margin-top:14px">Menos de <span style="color:var(--rojo)">$6.600 el kilo</span></div>
<div style="margin-top:${alto ? 44 : 34}px">${btn(960, alto ? 96 : 86, alto ? 42 : 38, "WhatsApp 3541 51-9630")}</div>
<div style="font:600 ${alto ? 29 : 25}px Fig;color:var(--gris);margin-top:14px">Envío sin cargo en Carlos Paz y la zona · Se paga antes de la entrega</div></div></div>`);
};
piezas["2026-11-12-anuncio-6-kilos-1350"] = [1080, 1350, seis(1080, 1350)];
piezas["2026-11-12-anuncio-6-kilos-1920"] = [1080, 1920, seis(1080, 1920)];

const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(piezas)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${src}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
  const fondo = await p.evaluate(() => Math.max(...[...document.querySelectorAll(".col > *")].map(e => e.getBoundingClientRect().bottom)));
  await p.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "último elemento termina en y =", Math.round(fondo), "de", h);
}
await nav.close();
