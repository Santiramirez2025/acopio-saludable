// Piezas del 23/11/2026 (Juli). Verificado hoy 23/11 en la web: /combos/alacena-de-frutos-secos (200) $37.000, sueltos $38.900
// (mix clásico con cajú $12.500 + nuez $20.500 + pasas $5.900). Nuez 1 kg $20.500 en /lista-precios.csv. Trío y Despensa dan 404 hoy
// (dátiles fuera de la web): no se usan. Sin compra mínima en Carlos Paz; sin cargo desde $20.000. Sin frase de medio de pago.
// Uso: node scripts/piezas-2026-11-23-juli.mjs
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
const ALA = ["mix", "nue", "pas"];
F.mix[2] = "Mix clásico con cajú"; F.nue[2] = "Nuez mariposa"; F.pas[2] = "Pasas sin semilla";
const NOTA = "Juli 23/11/2026 · Alacena $37.000 y nuez $20.500 verificados 23/11 en la web";
const ft = (k, w, h, r = 22) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:${r}px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`;
const fila = (ks, w, h, fs, col = "var(--rojo)", sub = "1 kg") => `<div style="display:grid;grid-template-columns:repeat(${ks.length},${w}px);gap:14px">${ks.map(k => `<div>${ft(k, w, h)}<div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${F[k][2]}${sub ? `<br><span style="color:${col}">${sub}</span>` : ""}</div></div>`).join("")}</div>`;
const cond = (fs, fondo, color) => `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${["Sin compra mínima en Carlos Paz", "Entrega sin cargo desde $20.000"].map(t => `<span style="background:${fondo};color:${color};border-radius:999px;padding:10px 22px;font:800 ${fs}px Fig;white-space:nowrap">${t}</span>`).join("")}</div>`;
const pie = (fs, c) => `<div style="font:700 ${fs}px Fig;color:${c}">Reparto de lunes a sábado · acopiosaludable.com</div>`;
const p = {};
p["2026-11-23-alacena-37000-post-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · feed`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:0 40px;color:#fff"><div class="logo" style="color:#fff;font-size:28px">${logoA}Acopio Saludable</div>
<h1 style="font-size:84px;margin-top:14px">La picada de las fiestas,<br><span style="color:var(--amarillo)">resuelta en 3 kilos</span></h1>
<div style="margin-top:18px">${cond(24, "var(--amarillo)", "var(--verde)")}</div>
<div style="margin-top:22px">${fila(ALA, 318, 220, 23, "var(--amarillo)")}</div>
<div style="font:800 24px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:16px">ALACENA DE FRUTOS SECOS · 3 KG</div>
<div style="display:flex;align-items:center;gap:22px;justify-content:center;margin-top:4px"><div style="font:800 100px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$37.000</div><div style="font:800 28px/1.25 Fig;text-align:left;color:#C9D6CF"><span style="text-decoration:line-through">sueltos $38.900</span></div></div>
${btn(940, 70, 32, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:18px")}
<div style="margin-top:10px">${pie(18, "#C9D6CF")}</div></div></div>`)];
p["2026-11-23-alacena-37000-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · historia`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 50px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<h1 style="font-size:106px;margin-top:22px">La picada<br>de las fiestas,<br><span style="color:var(--amarillo)">resuelta</span></h1>
<div style="margin-top:24px">${cond(28, "var(--amarillo)", "var(--verde)")}</div>
<div style="margin-top:28px">${fila(ALA, 312, 280, 28, "var(--amarillo)")}</div>
<div style="font:800 28px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:22px">ALACENA DE FRUTOS SECOS · 3 KG</div>
<div style="display:flex;align-items:center;gap:24px;justify-content:center;margin-top:6px"><div style="font:800 140px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$37.000</div><div style="font:800 36px/1.25 Fig;text-align:left;color:#C9D6CF"><span style="text-decoration:line-through">sueltos<br>$38.900</span></div></div>
${btn(960, 90, 38, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:24px")}
<div style="margin-top:12px">${pie(21, "#C9D6CF")}</div></div></div>`)];
p["2026-11-23-nuez-20500-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · historia nuez`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 60px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<h1 style="font-size:100px;margin-top:22px">¿Ya tenés<br>la nuez para<br><span style="color:var(--amarillo)">las fiestas?</span></h1>
<div style="margin-top:34px">${ft("nue", 940, 440, 30)}</div>
<div style="font:800 30px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:26px">NUEZ MARIPOSA · 1 KG</div>
<div style="font:800 150px/1 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:6px">$20.500</div>
<div style="margin-top:22px">${cond(28, "var(--amarillo)", "var(--verde)")}</div>
${btn(960, 90, 38, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:26px")}
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
