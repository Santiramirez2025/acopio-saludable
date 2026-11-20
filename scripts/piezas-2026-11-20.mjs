// Piezas del 20/11/2026 (Lucas). Verificado hoy 20/11 en la web:
// /combos/despensa-4-kilos y /combos/kit-semanal dan 404: el Mix de semillas está «Sin stock por ahora» y los dos combos lo traen.
// Por eso el anuncio de hoy va con el Trío (/combos/trio-de-frutos-secos, 200): dátiles con carozo + mix clásico con cajú y girasol
// + pasas sin semilla, 1 kg de cada uno: $24.000 (sueltos $27.300, ahorrás $3.300) · transf. 8% con piso a la centena → $22.000.
// Dátiles con carozo 1 kg $10.900 (/lista-precios.csv y /producto/LG-DATIL) · transf. → $10.000.
// Política 3/11: sin compra mínima en Carlos Paz; envío $3.000 debajo de $20.000, sin cargo desde $20.000. Se cobra antes de entregar.
// Uso: node scripts/piezas-2026-11-20.mjs
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
const NOTA = "Lucas 20/11/2026 · precios verificados 20/11 en /combos/trio-de-frutos-secos, /lista-precios.csv y /producto/LG-DATIL · sin aprobar ni publicar";
const ft = (k, w, h, r = 22) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:${r}px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`;
const fila = (ks, w, h, fs, col = "var(--rojo)", sub = "1 kg") => `<div style="display:grid;grid-template-columns:repeat(${ks.length},${w}px);gap:14px">${ks.map(k => `<div>${ft(k, w, h)}<div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${F[k][2]}${sub ? `<br><span style="color:${col}">${sub}</span>` : ""}</div></div>`).join("")}</div>`;
const cond = (fs, fondo, color) => `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${["Sin compra mínima en Carlos Paz", "Entrega sin cargo desde $20.000"].map(t => `<span style="background:${fondo};color:${color};border-radius:999px;padding:10px 22px;font:800 ${fs}px Fig;white-space:nowrap">${t}</span>`).join("")}</div>`;
const pie = (fs, c) => `<div style="font:700 ${fs}px Fig;color:${c}">Se paga antes de la entrega · transferencia o Mercado Pago · acopiosaludable.com</div>`;
const juntos = (fs) => `<div style="display:inline-flex;align-items:center;gap:14px;font:800 ${fs}px Fig"><span style="text-decoration:line-through;color:var(--gris)">Sueltos $27.300</span><span>→</span><span style="background:var(--rojo);color:#fff;padding:4px 16px;border-radius:12px">Juntos $24.000</span></div>`;
const transf = (fs, monto, bg = "var(--amarillo)", c = "var(--verde)") => `<div style="font:800 ${fs}px Fig">Por transferencia: <span style="background:${bg};color:${c};padding:2px 14px;border-radius:10px">${monto}</span></div>`;
const p = {};

// ---------- 1 · TRÍO «Sueltos → Juntos» (la jerarquía que Juli aprobó el 18/11) ----------
p["2026-11-20-anuncio-trio-juntos-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · Trío juntos 1080x1080`, `<div class="c"><div class="col" style="padding:0 40px"><div class="logo" style="font-size:28px">${logoV}Acopio Saludable</div>
<h1 style="font-size:100px;margin-top:14px">3 kilos para la semana,<br><em>juntos sale menos</em></h1>
<div style="margin-top:18px">${juntos(36)}</div>
<div style="margin-top:20px">${fila(TRIO, 318, 230, 23)}</div>
<div style="margin-top:16px">${transf(32, "$22.000")}</div>
<div style="margin-top:14px">${cond(23, "var(--verde)", "#fff")}</div>
<div style="margin-top:14px">${btn(940, 70, 32, "Pedilo: WhatsApp 3541 51-9630")}</div>
<div style="margin-top:10px">${pie(18, "var(--gris)")}</div></div></div>`)];
p["2026-11-20-anuncio-trio-juntos-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Trío juntos 1080x1920 (zona segura 250 arriba / 300 abajo)`, `<div class="c"><div class="col" style="padding:250px 50px 260px"><div class="logo">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:22px">Trío de frutos secos</div>
<h1 style="font-size:112px;margin-top:16px">3 kilos para<br>la semana,<br><em>juntos sale<br>menos</em></h1>
<div style="margin-top:24px">${juntos(42)}</div>
<div style="margin-top:28px">${fila(TRIO, 312, 300, 28)}</div>
<div style="margin-top:22px">${transf(40, "$22.000")}</div>
<div style="margin-top:20px">${cond(28, "var(--verde)", "#fff")}</div>
${btn(960, 90, 38, "Pedilo: WhatsApp 3541 51-9630", "margin-top:22px")}
<div style="margin-top:12px">${pie(21, "var(--gris)")}</div></div></div>`)];

// ---------- 2 · TRÍO «No tenemos local: te lo llevamos» (responde la consulta n.º 2: retiro/local) ----------
p["2026-11-20-anuncio-trio-local-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · Trío sin local 1080x1080`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:0 40px;color:#fff"><div class="logo" style="color:#fff;font-size:28px">${logoA}Acopio Saludable</div>
<h1 style="font-size:90px;margin-top:14px">No tenemos local:<br><span style="color:var(--amarillo)">te lo llevamos a casa</span></h1>
<div style="margin-top:18px">${cond(24, "var(--amarillo)", "var(--verde)")}</div>
<div style="margin-top:22px">${fila(TRIO, 318, 220, 23, "var(--amarillo)")}</div>
<div style="font:800 24px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:16px">TRÍO DE FRUTOS SECOS · 3 KG</div>
<div style="display:flex;align-items:center;gap:22px;justify-content:center;margin-top:4px"><div style="font:800 100px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$24.000</div><div style="font:800 28px/1.25 Fig;text-align:left"><span style="background:#fff;color:var(--verde);padding:2px 14px;border-radius:10px">$22.000</span><br>por transferencia</div></div>
${btn(940, 70, 32, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:18px")}
<div style="margin-top:10px">${pie(18, "#C9D6CF")}</div></div></div>`)];
p["2026-11-20-anuncio-trio-local-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Trío sin local 1080x1920`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 50px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<h1 style="font-size:112px;margin-top:22px">No tenemos<br>local:<br><span style="color:var(--amarillo)">te lo llevamos<br>a tu casa</span></h1>
<div style="margin-top:24px">${cond(28, "var(--amarillo)", "var(--verde)")}</div>
<div style="margin-top:28px">${fila(TRIO, 312, 280, 28, "var(--amarillo)")}</div>
<div style="font:800 28px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:22px">TRÍO DE FRUTOS SECOS · 3 KG</div>
<div style="display:flex;align-items:center;gap:24px;justify-content:center;margin-top:6px"><div style="font:800 140px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$24.000</div><div style="font:800 36px/1.25 Fig;text-align:left"><span style="background:#fff;color:var(--verde);padding:2px 14px;border-radius:10px">$22.000</span><br>por transferencia</div></div>
${btn(960, 90, 38, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:24px")}
<div style="margin-top:12px">${pie(21, "#C9D6CF")}</div></div></div>`)];

// ---------- 3 · DÁTILES «¿Cuánto pagás el kilo?» (gancho pregunta: rinde el doble que «1 kilo de X por $…», dato de Juli 19/11) ----------
const datFoto = `<img class="real" src="2026-11-09-datiles-cajon-1-foto.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 35%">`;
const velo = (a) => `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,37,28,.0) ${a}%,rgba(16,37,28,.92) ${a + 22}%,#10251C 100%)"></div>`;
p["2026-11-20-anuncio-datiles-pregunta-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · Dátiles pregunta 1080x1080`, `<div class="c" style="background:var(--verde)">${datFoto}${velo(26)}
<div style="position:absolute;top:36px;left:40px;background:var(--crema);border-radius:999px;padding:10px 24px 10px 12px"><div class="logo" style="font-size:26px">${logoV}Acopio Saludable</div></div>
<div style="position:absolute;left:0;right:0;bottom:34px;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center">
<h1 style="font-size:88px">¿Cuánto pagás el kilo<br>de dátiles?</h1>
<div style="display:flex;align-items:center;gap:22px;justify-content:center;margin-top:10px"><div style="font:800 30px/1.2 Fig;text-align:right">Acá, con carozo,<br>bolsa de 1 kg</div><div style="font:800 128px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$10.900</div></div>
<div style="font:800 30px Fig;margin-top:10px"><span style="background:#fff;color:var(--verde);padding:4px 16px;border-radius:12px">$10.000 por transferencia</span></div>
<div style="margin-top:14px">${cond(23, "var(--amarillo)", "var(--verde)")}</div>
${btn(940, 70, 32, "Pedilos: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}
<div style="margin-top:8px">${pie(18, "#C9D6CF")}</div></div></div>`)];
p["2026-11-20-anuncio-datiles-pregunta-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Dátiles pregunta 1080x1920`, `<div class="c" style="background:var(--verde)">${datFoto}${velo(24)}
<div style="position:absolute;top:250px;left:0;right:0;display:flex;justify-content:center"><div style="background:var(--crema);border-radius:999px;padding:12px 28px 12px 14px"><div class="logo">${logoV}Acopio Saludable</div></div></div>
<div style="position:absolute;left:0;right:0;bottom:290px;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center">
<h1 style="font-size:116px">¿Cuánto pagás<br>el kilo de<br>dátiles?</h1>
<div style="font:800 34px Fig;margin-top:22px;color:#E4ECE7">Acá, con carozo, la bolsa de 1 kg:</div>
<div style="font:800 190px/1.02 Brico;color:var(--amarillo);letter-spacing:-.03em">$10.900</div>
<div style="font:800 40px Fig"><span style="background:#fff;color:var(--verde);padding:4px 18px;border-radius:12px">$10.000 por transferencia</span></div>
<div style="margin-top:22px">${cond(28, "var(--amarillo)", "var(--verde)")}</div>
${btn(960, 90, 38, "Pedilos: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:22px")}
<div style="margin-top:12px">${pie(21, "#C9D6CF")}</div></div></div>`)];

// ---------- 4 · B2B «Nuez, almendra y cajú por bulto» (pedido de Paula 17/11, nombres que pidió) — sin precio ----------
const B2B = ["nue", "alm", "caj"];
const NOTA_B = "Lucas 20/11/2026 · anuncio B2B pedido por Paula 17/11 · sin precio (la lista la pasa Leo) · sin aprobar ni publicar";
p["2026-11-18-anuncio-negocios-bulto-1350"] = [1080, 1350, doc(1080, 1350, `${NOTA_B} · 1080x1350`, `<div class="c"><div class="col" style="padding:0 44px"><div class="logo" style="font-size:30px">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:22px">Para negocios</div>
<h1 style="font-size:108px;margin-top:18px">Nuez, almendra<br>y cajú <em>por bulto</em></h1>
<div class="sub" style="margin-top:18px;font-weight:700">Para heladerías, cafés y panaderías<br>de Carlos Paz y Punilla</div>
<div style="margin-top:28px">${fila(B2B, 318, 360, 30, "var(--rojo)", "")}</div>
<div style="margin-top:26px;display:flex;gap:12px;justify-content:center">${["Entrega en el día", "Fraccionado fresco"].map(t => `<span style="background:var(--verde);color:#fff;border-radius:999px;padding:12px 26px;font:800 28px Fig">${t}</span>`).join("")}</div>
${btn(960, 86, 38, "Pedí la lista por WhatsApp", "margin-top:24px")}
<div style="margin-top:12px;font:700 22px Fig;color:var(--gris)">3541 51-9630 · se paga antes de la entrega · acopiosaludable.com</div></div></div>`)];
p["2026-11-18-anuncio-negocios-bulto-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA_B} · 1080x1920`, `<div class="c"><div class="col" style="padding:250px 50px 260px"><div class="logo">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:24px">Para negocios</div>
<h1 style="font-size:122px;margin-top:20px">Nuez,<br>almendra y cajú<br><em>por bulto</em></h1>
<div class="sub" style="margin-top:22px;font-weight:700;font-size:38px">Para heladerías, cafés y panaderías<br>de Carlos Paz y Punilla</div>
<div style="margin-top:32px">${fila(B2B, 312, 420, 32, "var(--rojo)", "")}</div>
<div style="margin-top:28px;display:flex;gap:12px;justify-content:center">${["Entrega en el día", "Fraccionado fresco"].map(t => `<span style="background:var(--verde);color:#fff;border-radius:999px;padding:12px 28px;font:800 32px Fig">${t}</span>`).join("")}</div>
${btn(960, 96, 42, "Pedí la lista por WhatsApp", "margin-top:26px")}
<div style="margin-top:14px;font:700 24px Fig;color:var(--gris)">3541 51-9630 · se paga antes de la entrega · acopiosaludable.com</div></div></div>`)];

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
