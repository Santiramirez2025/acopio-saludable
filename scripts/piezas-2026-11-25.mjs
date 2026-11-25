// Piezas del 25/11/2026 (Lucas). Verificado hoy 25/11 en la web:
// /combos/despensa-4-kilos (200, InStock) $28.000, sueltos $31.800 (avena arrollada fina, dátiles con carozo,
// mix clásico con cajú y girasol, pasas; 1 kg c/u) · /producto/LG-DATIL (200, InStock) $10.900 ·
// /combos/mesa-navidena (200, InStock) $46.000, sueltos $47.000 (almendras garrapiñadas 250 g, garrapiñada de maní 500 g,
// pan dulce con frutas 400 g, pasas de uva con chocolate 400 g, mix clásico con cajú 500 g y bolsa regalo).
// Política 23/11 (panel): sin compra mínima en Carlos Paz, envío $3.000 en cualquier pedido; ya no existe «sin cargo».
// Sin medio ni condición de pago, sin precio por transferencia, sin «diet», sin salud ni «sin TACC».
// V02 de Despensa y dátiles: reemplazan a las del 23/11 que decían «Entrega sin cargo desde $20.000» (orden de Juli 24/11).
// Mesa navideña sin foto real (en la web son ilustraciones): va tipográfica, sin dibujos que parezcan el producto.
// Uso: node scripts/piezas-2026-11-25.mjs
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
const pie = (fs, c) => `<div style="font:700 ${fs}px Fig;color:${c}">Envío en Carlos Paz $3.000 · reparto de lunes a sábado</div>`;
const NOTA = "Lucas 25/11/2026 · precios verificados 25/11 en la web · sin aprobar ni publicar";
const p = {};

// ---------- DESPENSA V02 ----------
const F = {
  mix: ["../../reales/real-mix.jpg", "50% 62%;transform:scale(1.55);transform-origin:50% 62%", "Mix con cajú y girasol"],
  dat: ["2026-11-04-datiles-plato-foto.jpg", "35% 40%", "Dátiles con carozo"],
  pas: ["2026-11-10-pasas-cerca-foto.jpg", "50% 75%", "Pasas sin semilla"],
};
const ft = (k, w, h) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:22px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`;
const avena = (w, h) => `<div style="width:${w}px;height:${h}px;border-radius:22px;background:var(--verde);color:var(--amarillo);display:flex;align-items:center;justify-content:center;font:800 ${Math.round(Math.min(w, h * 1.6) / 6)}px/1.02 Brico;text-align:center">Avena<br>arrollada</div>`;
const celda = (inner, t, fs) => `<div>${inner}<div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${t}<br><span style="color:var(--rojo)">1 kg</span></div></div>`;
const grilla = (w, h, fs, cols) => `<div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:14px">${celda(ft("mix", w, h), F.mix[2], fs)}${celda(ft("dat", w, h), F.dat[2], fs)}${celda(ft("pas", w, h), F.pas[2], fs)}${celda(avena(w, h), "Avena arrollada", fs)}</div>`;
const juntos = (fs) => `<div style="display:inline-flex;align-items:center;gap:14px;font:800 ${fs}px Fig"><span style="text-decoration:line-through;color:var(--gris)">Sueltos $31.800</span><span>→</span><span style="background:var(--rojo);color:#fff;padding:4px 16px;border-radius:12px">Juntos $28.000</span></div>`;
p["2026-11-25-anuncio-despensa-avena-1080-v02"] = [1080, 1080, doc(1080, 1080, `${NOTA} · ACOPIO_DESPENSA_AVENA_FEED_V02 (reemplaza 2026-11-23-anuncio-despensa-avena-1080)`, `<div class="c"><div class="col" style="padding:0 40px"><div class="logo" style="font-size:28px">${logoV}Acopio Saludable</div>
<h1 style="font-size:92px;margin-top:12px">4 kilos de despensa<br><em>por $28.000</em></h1>
<div style="margin-top:16px">${juntos(34)}</div>
<div style="margin-top:18px">${grilla(236, 196, 21, 4)}</div>
<div style="margin-top:16px">${chips(24, "var(--verde)", "#fff", COND)}</div>
${btn(940, 70, 32, "Pedila: WhatsApp 3541 51-9630", "margin-top:16px")}
<div style="margin-top:10px">${pie(19, "var(--gris)")}</div></div></div>`)];
p["2026-11-25-anuncio-despensa-avena-1920-v02"] = [1080, 1920, doc(1080, 1920, `${NOTA} · ACOPIO_DESPENSA_AVENA_STORY_V02 (reemplaza 2026-11-23-anuncio-despensa-avena-1920) · zona segura 250/300`, `<div class="c"><div class="col" style="padding:250px 50px 300px"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:108px;margin-top:20px">4 kilos de<br>despensa<br><em>por $28.000</em></h1>
<div style="margin-top:20px">${juntos(40)}</div>
<div style="margin-top:22px">${grilla(420, 220, 28, 2)}</div>
<div style="margin-top:20px">${chips(28, "var(--verde)", "#fff", COND)}</div>
${btn(960, 90, 38, "Pedila: WhatsApp 3541 51-9630", "margin-top:20px")}
<div style="margin-top:12px">${pie(22, "var(--gris)")}</div></div></div>`)];

// ---------- DÁTILES V02 ----------
const datFoto = (pos) => `<img class="real" src="2026-11-09-datiles-cajon-1-foto.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${pos}">`;
const velo = (a) => `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,37,28,0) ${a}%,rgba(16,37,28,.92) ${a + 25}%,#10251C 100%)"></div>`;
const sello = (fs, top) => `<div style="position:absolute;top:${top}px;left:40px;background:var(--crema);border-radius:999px;padding:10px 24px 10px 12px"><div class="logo" style="font-size:${fs}px">${logoV}Acopio Saludable</div></div>`;
p["2026-11-25-anuncio-datiles-carozo-1080-v02"] = [1080, 1080, doc(1080, 1080, `${NOTA} · ACOPIO_DATILES_CAROZO_FEED_V02 (reemplaza 2026-11-23-anuncio-datiles-carozo-1080)`, `<div class="c" style="background:var(--verde)">${datFoto("50% 35%")}${velo(30)}${sello(26, 36)}
<div style="position:absolute;left:0;right:0;bottom:34px;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center">
<h1 style="font-size:92px">Dátiles con carozo,<br><span style="color:var(--amarillo)">el kilo a $10.900</span></h1>
<div style="font:700 30px Fig;color:#C9D6CF;margin-top:12px">Bolsa de 1 kg · dulces y carnosos</div>
<div style="margin-top:18px">${chips(24, "var(--amarillo)", "var(--verde)", COND)}</div>
${btn(940, 70, 32, "Pedilos: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:18px")}
<div style="margin-top:10px">${pie(19, "#C9D6CF")}</div></div></div>`)];
p["2026-11-25-anuncio-datiles-carozo-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · ACOPIO_DATILES_CAROZO_STORY_V01 · zona segura 250/300`, `<div class="c" style="background:var(--verde)">${datFoto("50% 30%")}${velo(28)}${sello(30, 250)}
<div style="position:absolute;left:0;right:0;bottom:300px;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center">
<h1 style="font-size:112px">Dátiles<br>con carozo,<br><span style="color:var(--amarillo)">el kilo a<br>$10.900</span></h1>
<div style="font:700 36px Fig;color:#C9D6CF;margin-top:16px">Bolsa de 1 kg · dulces y carnosos</div>
<div style="margin-top:22px">${chips(28, "var(--amarillo)", "var(--verde)", COND)}</div>
${btn(960, 90, 38, "Pedilos: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:22px")}
<div style="margin-top:12px">${pie(22, "#C9D6CF")}</div></div></div>`)];

// ---------- MESA NAVIDEÑA: REGALO EMPRESAS (Paula) y AMIGO INVISIBLE (Juli) ----------
const MESA = [["250 g", "almendras garrapiñadas"], ["500 g", "garrapiñada de maní"], ["400 g", "pan dulce con frutas"], ["400 g", "pasas de uva con chocolate"], ["500 g", "mix clásico con cajú"]];
const lista = (fs, gfs, w) => `<div style="width:${w}px;background:rgba(255,255,255,.07);border-radius:24px;padding:16px 30px;text-align:left">${MESA.map(([g, t], i) => `<div style="display:flex;align-items:baseline;gap:22px;padding:7px 0;${i < MESA.length - 1 ? "border-bottom:1px solid rgba(255,255,255,.12)" : ""}"><span style="font:800 ${gfs}px/1 Brico;color:var(--amarillo);min-width:${Math.round(gfs * 2.9)}px">${g}</span><span style="font:700 ${fs}px/1.2 Fig">${t}</span></div>`).join("")}<div style="font:800 ${Math.round(fs * .85)}px Fig;color:var(--amarillo);margin-top:10px;letter-spacing:.06em">+ BOLSA REGALO NAVIDEÑA</div></div>`;
const sub = "#C9D6CF";
p["2026-11-25-anuncio-regalo-empresas-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · ACOPIO_NAVIDAD_REGALO_EMPRESAS_FEED_V01 (pedido de Paula 24/11)`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:0 60px;color:#fff"><div class="logo" style="color:#fff;font-size:28px">${logoA}Acopio Saludable</div>
<h1 style="font-size:80px;margin-top:12px">Regalos de fin de año<br><span style="color:var(--amarillo)">para tu equipo</span></h1>
<div style="font:800 32px Fig;color:#fff;margin-top:14px">Mesa navideña en bolsa regalo · <span style="color:var(--amarillo)">$46.000 cada una</span></div>
<div style="margin-top:18px">${lista(28, 34, 800)}</div>
<div style="font:800 34px Fig;color:#fff;margin-top:20px">Pedidos por cantidad: escribinos</div>
${btn(940, 72, 32, "WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}
<div style="margin-top:10px;font:700 20px Fig;color:${sub}">acopiosaludable.com · Villa Carlos Paz</div></div></div>`)];
p["2026-11-25-anuncio-regalo-empresas-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · ACOPIO_NAVIDAD_REGALO_EMPRESAS_STORY_V01 (pedido de Paula 24/11) · zona segura 250/300`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 60px 300px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<h1 style="font-size:108px;margin-top:22px">Regalos<br>de fin de año<br><span style="color:var(--amarillo)">para tu equipo</span></h1>
<div style="font:800 38px/1.3 Fig;color:#fff;margin-top:20px">Mesa navideña en bolsa regalo<br><span style="color:var(--amarillo);font-size:60px">$46.000 cada una</span></div>
<div style="margin-top:24px">${lista(34, 42, 920)}</div>
<div style="font:800 40px Fig;color:#fff;margin-top:28px">Pedidos por cantidad: escribinos</div>
${btn(960, 92, 40, "WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:18px")}
<div style="margin-top:12px;font:700 22px Fig;color:${sub}">acopiosaludable.com · Villa Carlos Paz</div></div></div>`)];
p["2026-11-25-amigo-invisible-post-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · ACOPIO_NAVIDAD_AMIGO_INVISIBLE_FEED_V01 (pedido de Juli 22-24/11, tipográfica: no hay foto real de la Mesa navideña)`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:0 60px;color:#fff"><div class="logo" style="color:#fff;font-size:28px">${logoA}Acopio Saludable</div>
<div style="font:800 40px Fig;color:${sub};margin-top:14px">¿Amigo invisible?</div>
<h1 style="font-size:96px;margin-top:2px">Un regalo<br><span style="color:var(--amarillo)">que se come</span></h1>
<div style="margin-top:18px">${lista(28, 34, 800)}</div>
<div style="display:flex;align-items:center;gap:22px;justify-content:center;margin-top:14px"><div style="font:800 88px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$46.000</div><div style="font:800 26px/1.25 Fig;text-align:left;color:${sub}">Mesa navideña<br><span style="text-decoration:line-through">sueltos $47.000</span></div></div>
${btn(940, 70, 32, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}
<div style="margin-top:10px;font:700 20px Fig;color:${sub}">Sin compra mínima en Carlos Paz · envío $3.000 · reparto de lunes a sábado</div></div></div>`)];
p["2026-11-25-amigo-invisible-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · ACOPIO_NAVIDAD_AMIGO_INVISIBLE_STORY_V01 · zona segura 250/300`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 60px 300px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="font:800 52px Fig;color:${sub};margin-top:24px">¿Amigo invisible?</div>
<h1 style="font-size:124px;margin-top:4px">Un regalo<br><span style="color:var(--amarillo)">que se come</span></h1>
<div style="margin-top:26px">${lista(34, 42, 920)}</div>
<div style="font:800 30px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:28px">MESA NAVIDEÑA EN BOLSA REGALO</div>
<div style="font:800 150px/1 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:6px">$46.000</div>
<div style="margin-top:18px">${chips(28, "var(--amarillo)", "var(--verde)", COND)}</div>
${btn(960, 90, 38, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:22px")}
<div style="margin-top:12px">${pie(22, sub)}</div></div></div>`)];

const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(p)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  const pg = await nav.newPage({ viewport: { width: w, height: h } });
  await pg.goto(`file://${src}`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  const over = await pg.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.left < -1 || r.bottom > H + 1 || r.top < -1; }).filter(e => !e.querySelector("img") && !e.matches("img") && !e.style.inset).length, [w, h]);
  const [top, bottom] = await pg.evaluate(() => { const r = [...document.querySelectorAll(".col > *, .c > div[style*=bottom] > *, .c > div[style*=top]")].map(e => e.getBoundingClientRect()); return [Math.min(...r.map(x => x.top)), Math.max(...r.map(x => x.bottom))]; });
  await pg.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over, "contenido:", Math.round(top), "-", Math.round(bottom), "/", h);
}
await nav.close();
