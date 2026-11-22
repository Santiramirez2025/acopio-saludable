// Piezas del 22/11/2026 (Juli). Verificado hoy 22/11 en la web: /combos/trio-de-frutos-secos (200) $24.000 con cualquier medio
// (sin precio por transferencia: política del 21/11, «no cobramos más 22mil»). Sueltos: dátiles $10.900 + mix con cajú y girasol $10.500
// + pasas $5.900 = $27.300. Sin compra mínima en Carlos Paz; sin cargo desde $20.000. Sin frase de medio de pago (comunicación neutral).
// Uso: node scripts/piezas-2026-11-22-juli.mjs
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
const TRIO = ["dat", "mix", "pas"];
const NOTA = "Juli 22/11/2026 · Trío $24.000 verificado 22/11 en /combos/trio-de-frutos-secos";
const ft = (k, w, h, r = 22) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:${r}px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`;
const fila = (ks, w, h, fs, col = "var(--rojo)", sub = "1 kg") => `<div style="display:grid;grid-template-columns:repeat(${ks.length},${w}px);gap:14px">${ks.map(k => `<div>${ft(k, w, h)}<div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${F[k][2]}${sub ? `<br><span style="color:${col}">${sub}</span>` : ""}</div></div>`).join("")}</div>`;
const cond = (fs, fondo, color) => `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${["Sin compra mínima en Carlos Paz", "Entrega sin cargo desde $20.000"].map(t => `<span style="background:${fondo};color:${color};border-radius:999px;padding:10px 22px;font:800 ${fs}px Fig;white-space:nowrap">${t}</span>`).join("")}</div>`;
const pie = (fs, c) => `<div style="font:700 ${fs}px Fig;color:${c}">Reparto de lunes a sábado · acopiosaludable.com</div>`;
const p = {};
p["2026-11-22-trio-24000-post-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · feed`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:0 40px;color:#fff"><div class="logo" style="color:#fff;font-size:28px">${logoA}Acopio Saludable</div>
<h1 style="font-size:90px;margin-top:14px">No tenemos local:<br><span style="color:var(--amarillo)">te lo llevamos a casa</span></h1>
<div style="margin-top:18px">${cond(24, "var(--amarillo)", "var(--verde)")}</div>
<div style="margin-top:22px">${fila(TRIO, 318, 220, 23, "var(--amarillo)")}</div>
<div style="font:800 24px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:16px">TRÍO DE FRUTOS SECOS · 3 KG</div>
<div style="display:flex;align-items:center;gap:22px;justify-content:center;margin-top:4px"><div style="font:800 100px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$24.000</div><div style="font:800 28px/1.25 Fig;text-align:left;color:#C9D6CF"><span style="text-decoration:line-through">sueltos $27.300</span></div></div>
${btn(940, 70, 32, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:18px")}
<div style="margin-top:10px">${pie(18, "#C9D6CF")}</div></div></div>`)];
p["2026-11-22-trio-24000-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · historia`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 50px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<h1 style="font-size:112px;margin-top:22px">No tenemos<br>local:<br><span style="color:var(--amarillo)">te lo llevamos<br>a tu casa</span></h1>
<div style="margin-top:24px">${cond(28, "var(--amarillo)", "var(--verde)")}</div>
<div style="margin-top:28px">${fila(TRIO, 312, 280, 28, "var(--amarillo)")}</div>
<div style="font:800 28px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:22px">TRÍO DE FRUTOS SECOS · 3 KG</div>
<div style="display:flex;align-items:center;gap:24px;justify-content:center;margin-top:6px"><div style="font:800 140px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$24.000</div><div style="font:800 36px/1.25 Fig;text-align:left;color:#C9D6CF"><span style="text-decoration:line-through">sueltos<br>$27.300</span></div></div>
${btn(960, 90, 38, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:24px")}
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
