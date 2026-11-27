// Piezas del 27/11/2026 (Juli). Verificado hoy 27/11 en la web:
// /combos/trio-de-la-manana (200, InStock) $24.000 por 3 kg: mix clásico con cajú y girasol 1 kg ($10.500) +
// avena arrollada fina 1 kg ($4.500) + granola tradicional 1 kg ($13.700) → sueltos $28.700 (/lista-precios.csv).
// Mix clásico con cajú y girasol $10.500 · Mix clásico con cajú (sin girasol) $12.500 (/lista-precios.csv).
// Política vigente (panel 26/11): sin compra mínima en Carlos Paz, envío $3.000; nada de «sin cargo».
// Sin medio ni condición de pago, sin salud ni «sin TACC». Sin dátiles (agotados).
// Uso: node scripts/piezas-2026-11-27.mjs
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
const chips = (fs, fondo, color, ts) => `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${ts.map(t => `<span style="background:${fondo};color:${color};border-radius:999px;padding:10px 22px;font:800 ${fs}px Fig;white-space:nowrap">${t}</span>`).join("")}</div>`;
const COND = ["Sin compra mínima en Carlos Paz", "Te lo llevamos a tu casa"];
const sub = "#C9D6CF";
const pie = (fs) => `<div style="font:700 ${fs}px Fig;color:${sub}">Envío en Carlos Paz $3.000 · reparto de lunes a sábado</div>`;
const NOTA = "Juli 27/11/2026 · precios verificados 27/11 en la web";
const p = {};

// ---------- TRÍO DE LA MAÑANA ----------
const foto = (src, pos, w, h) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:22px"><img class="real" src="${src}" style="object-position:${pos}"></div>`;
const tipo = (txt, w, h) => `<div style="width:${w}px;height:${h}px;border-radius:22px;background:var(--amarillo);color:var(--verde);display:flex;align-items:center;justify-content:center;font:800 ${Math.round(Math.min(w, h * 1.6) / 6)}px/1.02 Brico;text-align:center">${txt}</div>`;
const celda = (inner, t, fs) => `<div>${inner}<div style="font:800 ${fs}px/1.15 Fig;margin-top:8px;color:#fff">${t}<br><span style="color:var(--amarillo)">1 kg</span></div></div>`;
const trio = (w, h, fs) => `<div style="display:grid;grid-template-columns:repeat(3,${w}px);gap:16px">${celda(foto("../../reales/real-mix.jpg", "50% 62%;transform:scale(1.5);transform-origin:50% 62%", w, h), "Mix con cajú<br>y girasol", fs)}${celda(tipo("Avena<br>arrollada", w, h), "Avena<br>arrollada fina", fs)}${celda(foto("../../reales/real-granola.jpg", "50% 55%;transform:scale(1.4);transform-origin:50% 55%", w, h), "Granola<br>tradicional", fs)}</div>`;
const juntos = (fs) => `<div style="display:inline-flex;align-items:center;gap:14px;font:800 ${fs}px Fig;color:#fff"><span style="text-decoration:line-through;color:${sub}">Sueltos $28.700</span><span>→</span><span style="background:var(--amarillo);color:var(--verde);padding:4px 16px;border-radius:12px">Juntos $24.000</span></div>`;
p["2026-11-27-trio-manana-post-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · TRIO_MANANA_FEED_V01`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:0 50px;color:#fff"><div class="logo" style="color:#fff;font-size:28px">${logoA}Acopio Saludable</div>
<div style="font:800 38px Fig;color:${sub};margin-top:12px">Trío de la mañana</div>
<h1 style="font-size:90px;margin-top:2px">3 kilos de desayuno<br><span style="color:var(--amarillo)">por $24.000</span></h1>
<div style="margin-top:16px">${trio(290, 200, 24)}</div>
<div style="margin-top:16px">${juntos(32)}</div>
<div style="margin-top:14px">${chips(24, "rgba(255,255,255,.12)", "#fff", COND)}</div>
${btn(940, 70, 32, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}
<div style="margin-top:10px">${pie(19)}</div></div></div>`)];
p["2026-11-27-trio-manana-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · TRIO_MANANA_STORY_V01 · zona segura 250/300`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 50px 300px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="font:800 50px Fig;color:${sub};margin-top:22px">Trío de la mañana</div>
<h1 style="font-size:116px;margin-top:4px">3 kilos de<br>desayuno<br><span style="color:var(--amarillo)">por $24.000</span></h1>
<div style="margin-top:26px">${trio(300, 300, 30)}</div>
<div style="margin-top:24px">${juntos(38)}</div>
<div style="margin-top:20px">${chips(28, "rgba(255,255,255,.12)", "#fff", COND)}</div>
${btn(960, 90, 38, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:22px")}
<div style="margin-top:12px">${pie(22)}</div></div></div>`)];

// ---------- DOS MIXES (historia de la noche) ----------
const col = (inner, nombre, precio) => `<div style="width:450px;display:flex;flex-direction:column;align-items:center">${inner}<div style="font:800 34px/1.15 Fig;margin-top:14px;color:#fff;min-height:80px">${nombre}</div><div style="font:800 92px/1 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:6px">${precio}</div><div style="font:700 26px Fig;color:${sub};margin-top:4px">el kilo</div></div>`;
p["2026-11-27-dos-mixes-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · DOS_MIXES_STORY_V01 · zona segura 250/300 · sin foto real del mix sin girasol: tipográfica`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 50px 300px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="font:800 50px Fig;color:${sub};margin-top:24px">¿Con girasol o sin?</div>
<h1 style="font-size:116px;margin-top:4px">Los dos mixes<br><span style="color:var(--amarillo)">de la casa</span></h1>
<div style="display:flex;gap:40px;margin-top:40px">${col(foto("../../reales/real-mix.jpg", "50% 62%;transform:scale(1.5);transform-origin:50% 62%", 450, 420), "Mix clásico con<br>cajú y girasol", "$10.500")}${col(tipo("Sin<br>girasol", 450, 420), "Mix clásico<br>con cajú", "$12.500")}</div>
<div style="margin-top:36px">${chips(28, "rgba(255,255,255,.12)", "#fff", COND)}</div>
${btn(960, 90, 38, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:22px")}
<div style="margin-top:12px">${pie(22)}</div></div></div>`)];

const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(p)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  const pg = await nav.newPage({ viewport: { width: w, height: h } });
  await pg.goto(`file://${src}`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  const [top, bottom] = await pg.evaluate(() => { const r = [...document.querySelectorAll(".col > *")].map(e => e.getBoundingClientRect()); return [Math.min(...r.map(x => x.top)), Math.max(...r.map(x => x.bottom))]; });
  await pg.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "contenido:", Math.round(top), "-", Math.round(bottom), "/", h);
}
await nav.close();
