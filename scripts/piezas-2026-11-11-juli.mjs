// Piezas del 11/11/2026 (Juli). Combo Trío del desayuno · 3 kilos (dátiles con carozo 1 kg + mix de semillas 1 kg + pasas 1 kg).
// Precio verificado el 11/11 en /api/admin/canales y en /combos/trio-del-desayuno: $21.500 web/MP; $19.700 por transferencia (orden de Martín 10/11).
// Fotos reales de fuentes/ (las mismas de la portada 4:3 de Lucas). Uso: node scripts/piezas-2026-11-11-juli.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const logoA = logoV.replace(/#10251C/g, "#FFC83D").replace(/fill="#fff"/, 'fill="#10251C"');
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center}.foto img{width:100%;height:100%;object-fit:cover;display:block}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const btn = (w, h, t, txt = "WhatsApp 3541 51-9630", st = "") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px;${st}">${wa}${txt}</div>`;
const DAT = "2026-11-04-datiles-plato-foto.jpg", SEM = "2026-11-11-semillas-bolsa-sola-foto.jpg", PAS = "2026-11-10-pasas-cerca-foto.jpg";
const fotos = (fh, et) => `<div style="display:flex;gap:14px;margin-top:26px">${[[SEM, "50% 50%", "Semillas 1 kg"], [DAT, "35% 40%", "Dátiles 1 kg"], [PAS, "50% 45%", "Pasas 1 kg"]].map(([s, p, t]) => `<div class="foto" style="width:316px;height:${fh}px"><img class="real" src="${s}" style="object-position:${p}"><div class="et" style="font-size:26px;padding:8px 16px;${et}">${t}</div></div>`).join("")}</div>`;
const piezas = {};
piezas["2026-11-11-trio-desayuno-post"] = [1080, 1350, doc(1080, 1350, "Juli 11/11/2026 · Trío del desayuno $21.500 / $19.700 transf., verificado 11/11", `<div class="c" style="background:var(--crema)"><div class="col" style="padding:54px 50px 0"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:84px;margin-top:16px;line-height:1">El desayuno de la semana,<br><em>3 kilos y listo</em></h1>
${fotos(470, "")}
<div style="font:800 34px Fig;margin-top:18px">Trío del desayuno · dátiles, semillas y pasas</div>
<div style="font:800 118px/1 Brico;color:var(--rojo);letter-spacing:-.03em;margin-top:12px">$21.500</div>
<div style="font:800 38px Fig;margin-top:8px"><span style="background:var(--amarillo);padding:4px 16px;border-radius:12px">$19.700 por transferencia</span></div>
<div style="margin-top:22px">${btn(960, 84, 38)}</div><div style="font:600 24px Fig;color:var(--gris);margin-top:12px">Sin compra mínima en Carlos Paz · este combo va sin cargo · Se paga antes de la entrega</div></div></div>`)];
piezas["2026-11-11-trio-desayuno-historia"] = [1080, 1920, doc(1080, 1920, "Juli 11/11/2026 · Trío del desayuno historia $21.500 / $19.700 transf., verificado 11/11", `<div class="c" style="background:#10251C"><div class="col" style="padding:220px 50px 0;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:26px;font:800 34px Fig;letter-spacing:.25em;color:var(--amarillo)">COMBO · 3 KILOS</div>
<div style="font:800 92px/1.02 Brico;letter-spacing:-.02em;margin-top:10px">Trío del<br><span style="color:var(--amarillo)">desayuno</span></div>
${fotos(600, "background:var(--amarillo);color:var(--verde)")}
<div style="font:800 40px Fig;margin-top:20px">Dátiles + semillas + pasas, 1 kg de cada uno</div>
<div style="font:800 140px/1.05 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:8px">$21.500</div>
<div style="font:800 42px Fig;color:#fff">$19.700 por transferencia</div>
${btn(960, 92, 40, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:24px")}<div style="font:600 27px Fig;color:#C9D6CF;margin-top:12px">Sin compra mínima en Carlos Paz · Pagás antes de la entrega</div></div></div>`)];
const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(piezas)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${src}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1; }).length, [w, h]);
  await p.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over);
}
await nav.close();
