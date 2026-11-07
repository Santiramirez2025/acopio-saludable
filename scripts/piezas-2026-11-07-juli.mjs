// Juli 7/11/2026: «3 kilos, $22.000» corregida. Ana (6/11) sacó «Sumás $6.500 y es la Despensa» (pasar a la Despensa nos cuesta margen)
// y Pablo no asegura stock de la Despensa. Misma pieza de Lucas del 6/11 con el bloque amarillo reemplazado por condiciones + precio por transferencia.
// Uso: node scripts/piezas-2026-11-07-juli.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const btn = (w, h, t, txt = "WhatsApp 3541 51-9630") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px">${wa}${txt}</div>`;
const pago = (t) => `<div style="font:600 ${t}px Fig;color:var(--gris);margin-top:12px">Pagás antes de la entrega: transferencia o Mercado Pago</div>`;
const tres = [["real-pasas", "Pasas de uva", "$5.900"], ["real-datiles", "Dátiles con carozo", "$10.900"], ["real-semillas", "Mix de semillas", "$5.200"]];
const fila = (h, t) => tres.map(([f, n, p]) => `<div style="flex:1;min-width:0"><div class="foto" style="height:${h}px;border-radius:24px"><img class="real" src="../../reales/${f}.jpg" style="transform:scale(1.4);object-position:55% 40%"></div><div style="font:800 ${t}px/1.1 Fig;margin-top:12px">1 kg ${n}</div><div style="font:800 ${t + 6}px Brico;color:var(--rojo);margin-top:4px">${p}</div></div>`).join("");
const cond = (t) => `<div style="background:var(--verde);color:#fff;border-radius:26px;padding:18px 28px;font:800 ${t}px/1.15 Fig"><span style="color:var(--amarillo)">Sin compra mínima en Carlos Paz y la zona</span><div style="font:700 ${Math.round(t * .72)}px Fig;margin-top:8px">Este combo va sin cargo · 8% menos por transferencia</div></div>`;
const tresDoc = (w, h, top, foto, ht, s) => doc(w, h, "Juli 07/11/2026 · versión sin «Sumás $6.500» (decisión de Ana 6/11); precios del catálogo 7/11", `<div class="c"><div class="col" style="padding:${top}px 50px 0"><div class="logo">${logoV}Acopio Saludable</div><h1 style="font-size:${ht}px;margin-top:16px;line-height:1">3 kilos, <em>$22.000</em></h1><div style="font:800 ${s}px Fig;margin-top:12px">Para la alacena de la semana</div>
<div style="display:flex;gap:18px;width:980px;margin-top:24px">${fila(foto, 32)}</div><div style="margin-top:24px;width:980px">${cond(44)}</div><div style="margin-top:20px">${btn(960, 88, 40)}</div>${pago(26)}</div></div>`);
const piezas = {
  "2026-11-07-tres-kilos-22000-v2-post": [1080, 1350, tresDoc(1080, 1350, 44, 320, 130, 42)],
  "2026-11-07-tres-kilos-22000-v2-historia": [1080, 1920, tresDoc(1080, 1920, 240, 500, 150, 46)],
};
const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(piezas)) {
  writeFileSync(`${DIR}fuentes/${base}.html`, html);
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${DIR}fuentes/${base}.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1 || (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).display !== "inline"); }).length, [w, h]);
  await p.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over);
}
await nav.close();
