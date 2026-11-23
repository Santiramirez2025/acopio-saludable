// Piezas del 23/11/2026 (Lucas). Verificado hoy 23/11 en la web (/lista-precios.csv y /producto/*):
// mix clásico con cajú y girasol 1 kg $10.500 · dátiles con carozo 1 kg $10.900 · pasas 1 kg $5.900 · avena arrollada fina 1 kg $4.500
// → Despensa de 4 kilos (avena en lugar de semillas desde el 21/11): sueltos $31.800, juntos $28.000 (pedido de Paula 22/11).
// ESTADO: EN ESPERA. Hoy /producto/LG-DATIL dice «Sin stock» y /combos/despensa-4-kilos da 404: no se publican hasta que vuelvan.
// Sin precio por transferencia ni condición de pago (política 21/11). Avena sin foto real: va como tarjeta de texto, no foto de stock.
// Uso: node scripts/piezas-2026-11-23.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.col>*{flex:none}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const btn = (w, h, t, txt, st = "") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px;${st}">${wa}${txt}</div>`;
const F = {
  mix: ["../../reales/real-mix.jpg", "50% 62%;transform:scale(1.55);transform-origin:50% 62%", "Mix con cajú<br>y girasol"],
  dat: ["2026-11-04-datiles-plato-foto.jpg", "35% 40%", "Dátiles<br>con carozo"],
  pas: ["2026-11-10-pasas-cerca-foto.jpg", "50% 75%", "Pasas<br>sin semilla"],
  ave: [null, "", "Avena arrollada<br>fina"],
};
const NOTA = "Lucas 23/11/2026 · precios verificados 23/11 en /lista-precios.csv · EN ESPERA: dátiles sin stock, Despensa 404 · sin aprobar ni publicar";
const ft = (k, w, h) => F[k][0]
  ? `<div class="foto" style="width:${w}px;height:${h}px;border-radius:22px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`
  : `<div style="width:${w}px;height:${h}px;border-radius:22px;background:var(--verde);color:var(--amarillo);display:flex;align-items:center;justify-content:center;font:800 ${Math.round(w / 5.2)}px/.95 Brico;letter-spacing:-.02em">Avena<br>1 kg</div>`;
const fila = (ks, w, h, fs, cols = ks.length) => `<div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:14px">${ks.map(k => `<div>${ft(k, w, h)}<div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${F[k][2]}<br><span style="color:var(--rojo)">1 kg</span></div></div>`).join("")}</div>`;
const cond = (fs) => `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${["Sin compra mínima en Carlos Paz", "Entrega sin cargo desde $20.000"].map(t => `<span style="background:var(--verde);color:#fff;border-radius:999px;padding:10px 22px;font:800 ${fs}px Fig;white-space:nowrap">${t}</span>`).join("")}</div>`;
const juntos = (fs) => `<div style="display:inline-flex;align-items:center;gap:14px;font:800 ${fs}px Fig"><span style="text-decoration:line-through;color:var(--gris)">Sueltos $31.800</span><span>→</span><span style="background:var(--rojo);color:#fff;padding:4px 16px;border-radius:12px">Juntos $28.000</span></div>`;
const pie = (fs, c = "var(--gris)") => `<div style="font:700 ${fs}px Fig;color:${c}">No tenemos local: te lo llevamos a casa · acopiosaludable.com</div>`;
const D = ["mix", "dat", "pas", "ave"];
const p = {};
p["2026-11-23-anuncio-despensa-avena-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · Despensa 1080x1080`, `<div class="c"><div class="col" style="padding:0 40px"><div class="logo" style="font-size:28px">${logoV}Acopio Saludable</div>
<h1 style="font-size:92px;margin-top:12px">4 kilos de despensa<br><em>por $28.000</em></h1>
<div style="margin-top:16px">${juntos(34)}</div>
<div style="margin-top:18px">${fila(D, 236, 200, 21)}</div>
<div style="margin-top:16px">${cond(24)}</div>
${btn(940, 70, 32, "Pedila: WhatsApp 3541 51-9630", "margin-top:16px")}
<div style="margin-top:10px">${pie(19)}</div></div></div>`)];
p["2026-11-23-anuncio-despensa-avena-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Despensa 1080x1920 (zona segura 250 arriba / 300 abajo)`, `<div class="c"><div class="col" style="padding:250px 50px 300px"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:108px;margin-top:20px">4 kilos de<br>despensa<br><em>por $28.000</em></h1>
<div style="margin-top:20px">${juntos(40)}</div>
<div style="margin-top:22px">${fila(D, 420, 210, 28, 2)}</div>
<div style="margin-top:20px">${cond(28)}</div>
${btn(960, 90, 38, "Pedila: WhatsApp 3541 51-9630", "margin-top:20px")}
<div style="margin-top:12px">${pie(22)}</div></div></div>`)];
const datFoto = `<img class="real" src="2026-11-09-datiles-cajon-1-foto.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 35%">`;
const velo = `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,37,28,0) 30%,rgba(16,37,28,.92) 55%,#10251C 100%)"></div>`;
p["2026-11-23-anuncio-datiles-carozo-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · Dátiles 1080x1080`, `<div class="c" style="background:var(--verde)">${datFoto}${velo}
<div style="position:absolute;top:36px;left:40px;background:var(--crema);border-radius:999px;padding:10px 24px 10px 12px"><div class="logo" style="font-size:26px">${logoV}Acopio Saludable</div></div>
<div style="position:absolute;left:0;right:0;bottom:34px;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center">
<h1 style="font-size:92px">Dátiles con carozo,<br><span style="color:var(--amarillo)">el kilo a $10.900</span></h1>
<div style="font:700 30px Fig;color:#C9D6CF;margin-top:12px">Bolsa de 1 kg · dulces y carnosos</div>
<div style="display:flex;gap:12px;justify-content:center;margin-top:18px">${["Sin compra mínima en Carlos Paz", "Entrega sin cargo desde $20.000"].map(t => `<span style="background:var(--amarillo);color:var(--verde);border-radius:999px;padding:10px 22px;font:800 24px Fig;white-space:nowrap">${t}</span>`).join("")}</div>
${btn(940, 70, 32, "Pedilos: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:18px")}
<div style="margin-top:10px">${pie(19, "#C9D6CF")}</div></div></div>`)];
const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(p)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  const pg = await nav.newPage({ viewport: { width: w, height: h } });
  await pg.goto(`file://${src}`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  const over = await pg.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.left < -1 || r.bottom > H + 1 || r.top < -1; }).filter(e => !e.querySelector("img") && !e.matches("img") && !e.style.inset).length, [w, h]);
  const [top, bottom] = await pg.evaluate(() => { const r = [...document.querySelectorAll(".col > *, .c > div[style*=bottom] > *")].map(e => e.getBoundingClientRect()); return [Math.min(...r.map(x => x.top)), Math.max(...r.map(x => x.bottom))]; });
  await pg.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over, "contenido:", Math.round(top), "-", Math.round(bottom), "/", h);
}
await nav.close();
