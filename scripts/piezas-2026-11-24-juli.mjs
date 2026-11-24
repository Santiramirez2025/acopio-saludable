// Piezas del 24/11/2026 (Juli). Verificado hoy 24/11 en la web: /combos/mesa-navidena (200, InStock) $46.000, sueltos $47.000
// (garrapiñada de almendras 250 g, garrapiñada de maní 500 g, pan dulce diet con frutas 400 g, pasas con chocolate 400 g,
// mix clásico con cajú 500 g y bolsa regalo); /mesa-dulce-navidad: 135 g por persona. /combos/despensa-4-kilos (200, InStock)
// $28.000, sueltos $31.800 (mix con cajú y girasol, dátiles con carozo, pasas, avena; 1 kg c/u).
// Política 23/11: sin compra mínima en Carlos Paz, envío $3.000 en cualquier pedido (ya no hay «sin cargo»).
// Mesa navideña sin fotos: no hay fotos reales de esos productos (en la web son ilustraciones), va tipográfica.
// Uso: node scripts/piezas-2026-11-24-juli.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const logoA = logoV.replace(/#10251C/g, "#FFC83D").replace(/fill="#fff"/, 'fill="#10251C"');
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.col>*{flex:none}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const btn = (w, h, t, txt, st = "") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px;${st}">${wa}${txt}</div>`;
const F = {
  dat: ["2026-11-04-datiles-plato-foto.jpg", "35% 40%", "Dátiles con carozo"],
  mix: ["../../reales/real-mix.jpg", "50% 62%;transform:scale(1.55);transform-origin:50% 62%", "Mix con cajú y girasol"],
  pas: ["2026-11-10-pasas-cerca-foto.jpg", "50% 75%", "Pasas sin semilla"],
  alm: ["../../reales/real-almendras.jpg", "50% 40%;transform:scale(1.25);transform-origin:50% 40%", "Almendra"],
  caj: ["../../reales/real-caju.jpg", "50% 45%;transform:scale(1.3);transform-origin:50% 45%", "Cajú"],
  nue: ["../../reales/real-nuez.jpg", "50% 60%;transform:scale(1.3);transform-origin:50% 60%", "Nuez"],
};

const NOTA = "Juli 24/11/2026 · Mesa navideña $46.000 y Despensa $28.000 verificados 24/11 en la web";
const ft = (k, w, h, r = 22) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:${r}px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`;
const chips = (fs, fondo, color, ts) => `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${ts.map(t => `<span style="background:${fondo};color:${color};border-radius:999px;padding:10px 22px;font:800 ${fs}px Fig;white-space:nowrap">${t}</span>`).join("")}</div>`;
const COND = ["Sin compra mínima en Carlos Paz", "Te lo llevamos a tu casa"];
const pie = (fs, c) => `<div style="font:700 ${fs}px Fig;color:${c}">Envío en Carlos Paz $3.000 · reparto de lunes a sábado</div>`;
const MESA = [["50 g", "pan dulce"], ["25 g", "mix con cajú"], ["20 g", "garrapiñada de maní"], ["15 g", "almendras garrapiñadas"], ["15 g", "pasas con chocolate"]];
const lista = (fs, gfs, w) => `<div style="width:${w}px;background:rgba(255,255,255,.07);border-radius:24px;padding:18px 30px;text-align:left">${MESA.map(([g, t]) => `<div style="display:flex;align-items:baseline;gap:20px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.12)"><span style="font:800 ${gfs}px/1 Brico;color:var(--amarillo);min-width:${gfs * 2.6}px">${g}</span><span style="font:700 ${fs}px/1.2 Fig">${t}</span></div>`).join("")}</div>`;
const p = {};
p["2026-11-24-mesa-navidena-46000-post-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · feed`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:0 60px;color:#fff"><div class="logo" style="color:#fff;font-size:28px">${logoA}Acopio Saludable</div>
<h1 style="font-size:76px;margin-top:12px">¿Cuánto comprás para<br><span style="color:var(--amarillo)">la mesa dulce?</span></h1>
<div style="font:700 28px Fig;color:#C9D6CF;margin-top:10px">Nuestra cuenta: unos 135 g por persona</div>
<div style="margin-top:16px">${lista(28, 40, 760)}</div>
<div style="font:800 24px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:18px">MESA NAVIDEÑA · 6 PRODUCTOS · PARA 8</div>
<div style="display:flex;align-items:center;gap:22px;justify-content:center;margin-top:4px"><div style="font:800 96px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$46.000</div><div style="font:800 26px/1.25 Fig;text-align:left;color:#C9D6CF"><span style="text-decoration:line-through">sueltos $47.000</span><br>con bolsa regalo</div></div>
${btn(940, 70, 32, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:16px")}
<div style="margin-top:10px;font:700 20px Fig;color:#C9D6CF">Sin compra mínima en Carlos Paz · envío $3.000 · reparto de lunes a sábado</div></div></div>`)];
p["2026-11-24-mesa-navidena-46000-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · historia mesa`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 60px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<h1 style="font-size:100px;margin-top:22px">¿Cuánto comprás<br>para la<br><span style="color:var(--amarillo)">mesa dulce?</span></h1>
<div style="font:700 36px Fig;color:#C9D6CF;margin-top:16px">Unos 135 g por persona</div>
<div style="margin-top:26px">${lista(36, 52, 900)}</div>
<div style="font:800 30px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:30px">MESA NAVIDEÑA · PARA 8</div>
<div style="font:800 150px/1 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:6px">$46.000</div>
<div style="margin-top:20px">${chips(28, "var(--amarillo)", "var(--verde)", COND)}</div>
${btn(960, 90, 38, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:26px")}
<div style="margin-top:12px">${pie(21, "#C9D6CF")}</div></div></div>`)];
F.mix[2] = "Mix con cajú y girasol";
const avena = (w, h) => `<div style="width:${w}px;height:${h}px;border-radius:22px;background:var(--crema);color:var(--verde);display:flex;align-items:center;justify-content:center;font:800 ${Math.round(h / 5)}px/1.05 Brico;text-align:center">Avena<br>arrollada</div>`;
const celda = (inner, t, fs) => `<div>${inner}<div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${t}<br><span style="color:var(--amarillo)">1 kg</span></div></div>`;
p["2026-11-24-despensa-28000-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · historia despensa`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 50px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<h1 style="font-size:104px;margin-top:22px">4 kilos de<br>despensa por<br><span style="color:var(--amarillo)">$28.000</span></h1>
<div style="margin-top:30px;display:grid;grid-template-columns:repeat(2,460px);gap:22px">${celda(ft("mix", 460, 300), F.mix[2], 30)}${celda(ft("dat", 460, 300), F.dat[2], 30)}${celda(ft("pas", 460, 300), F.pas[2], 30)}${celda(avena(460, 300), "Avena arrollada", 30)}</div>
<div style="font:800 34px/1.25 Fig;color:#C9D6CF;margin-top:26px"><span style="text-decoration:line-through">sueltos $31.800</span> · ahorrás $3.800</div>
<div style="margin-top:20px">${chips(28, "var(--amarillo)", "var(--verde)", COND)}</div>
${btn(960, 90, 38, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:24px")}
<div style="margin-top:12px">${pie(21, "#C9D6CF")}</div></div></div>`)];
const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(p)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  const pg = await nav.newPage({ viewport: { width: w, height: h } });
  await pg.goto(`file://${src}`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  const over = await pg.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.left < -1 || r.bottom > H + 1 || r.top < -1; }).filter(e => !e.querySelector("img") && !e.matches("img")).length, [w, h]);
  const [top, bottom] = await pg.evaluate(() => { const r = [...document.querySelectorAll(".col > *, .c > div[style*=bottom] > *")].map(e => e.getBoundingClientRect()); return [Math.min(...r.map(x => x.top)), Math.max(...r.map(x => x.bottom))]; });
  await pg.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over, "contenido:", Math.round(top), "-", Math.round(bottom), "/", h);
}
await nav.close();
