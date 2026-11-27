// Piezas del 27/11/2026 (Lucas). Verificado hoy 27/11 en la web (200, InStock):
// /combos/alacena-de-frutos-secos $41.000 (mix clásico con cajú 1 kg, nuez mariposa light 1 kg, pasas 1 kg) ·
// /combos/picada-de-navidad $39.500 (nuez 250 g, higos 500 g, pistachos con cáscara 250 g, mix clásico con cajú 500 g) ·
// /producto/TG-MIXCG $10.500 · /producto/TG-MIXC $12.500.
// Política del panel (23/11): sin compra mínima en Carlos Paz, envío $3.000; sin «sin cargo», sin medio de pago, sin descuento, sin salud.
// «El más pedido» (mix con girasol): catálogo /analisis?parte=catalogo masVendidos, TG-MIXCG 66 vs TG-MIXC 8.
// El mix de la Alacena NO lleva girasol: no se usa real-mix.jpg (muestra girasol), va placa tipográfica.
// Uso: node scripts/piezas-2026-11-27-lucas.mjs
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

const NOTA = "Lucas 27/11/2026 · precios verificados 27/11 en la web · sin aprobar ni publicar";
const p = {};
const sub = "#C9D6CF";
const CP = (fs, c) => `<div style="font:700 ${fs}px Fig;color:${c}">Sin compra mínima en Carlos Paz · envío $3.000 · reparto de lunes a sábado</div>`;

// ---------- ALACENA (pedido de Paula 25-26/11) ----------
const fotoA = (src, pos, w, h) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:22px"><img class="real" src="${src}" style="object-position:${pos}"></div>`;
const tipo = (w, h, t) => `<div style="width:${w}px;height:${h}px;border-radius:22px;background:var(--verde);color:var(--amarillo);display:flex;align-items:center;justify-content:center;font:800 ${Math.round(Math.min(w, h * 1.5) / 6.2)}px/1.02 Brico;text-align:center">${t}</div>`;
const celA = (inner, t, fs) => `<div>${inner}<div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${t}<br><span style="color:var(--rojo)">1 kg</span></div></div>`;
const tresKg = (w, h, fs, cols) => `<div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:16px;justify-content:center">${celA(tipo(w, h, "Mix<br>clásico<br>con cajú"), "Mix clásico con cajú", fs)}${celA(fotoA("2026-11-09-nuez-foto.jpg", "50% 45%", w, h), "Nuez mariposa light", fs)}${celA(fotoA("2026-11-10-pasas-cerca-foto.jpg", "50% 75%", w, h), "Pasas sin semilla", fs)}</div>`;
p["2026-11-27-anuncio-alacena-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · ACOPIO_ALACENA_FEED_V01 (pedido de Paula 25/11 y 26/11) · /combos/alacena-de-frutos-secos $41.000, 3 kg`, `<div class="c"><div class="col" style="padding:0 50px"><div class="logo" style="font-size:28px">${logoV}Acopio Saludable</div>
<h1 style="font-size:84px;margin-top:12px">3 kilos de frutos secos<br><em>para todo diciembre</em></h1>
<div style="margin-top:22px">${tresKg(300, 250, 24, 3)}</div>
<div style="display:flex;align-items:center;gap:20px;justify-content:center;margin-top:20px"><div style="font:800 104px/1 Brico;color:var(--rojo);letter-spacing:-.03em">$41.000</div><div style="font:800 26px/1.25 Fig;text-align:left">Combo Alacena<br>3 kg en total</div></div>
${btn(940, 72, 32, "Pedila: WhatsApp 3541 51-9630", "margin-top:18px")}
<div style="margin-top:10px;font:700 22px Fig;color:var(--gris)">Te lo llevamos a tu casa en Carlos Paz</div></div></div>`)];
p["2026-11-27-anuncio-alacena-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · ACOPIO_ALACENA_STORY_V01 · zona segura 250/300`, `<div class="c"><div class="col" style="padding:250px 50px 300px"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:112px;margin-top:22px">3 kilos de<br>frutos secos<br><em>para todo<br>diciembre</em></h1>
<div style="margin-top:26px">${tresKg(310, 300, 26, 3)}</div>
<div style="font:800 30px Fig;letter-spacing:.12em;margin-top:28px">COMBO ALACENA · 3 KG</div>
<div style="font:800 150px/1 Brico;color:var(--rojo);letter-spacing:-.03em;margin-top:4px">$41.000</div>
${btn(960, 92, 40, "Pedila: WhatsApp 3541 51-9630", "margin-top:24px")}
<div style="margin-top:14px;font:700 28px Fig;color:var(--gris)">Te lo llevamos a tu casa en Carlos Paz</div></div></div>`)];

// ---------- PICADA DE NAVIDAD (brief de Juli 26/11) — tipográfica, estructura lista→precio→CTA ----------
const PIC = [["500 g", "mix clásico con cajú"], ["500 g", "higos negros secos"], ["250 g", "nuez mariposa"], ["250 g", "pistachos con cáscara"]];
const lista = (fs, gfs, w) => `<div style="width:${w}px;background:rgba(255,255,255,.07);border-radius:24px;padding:16px 30px;text-align:left">${PIC.map(([g, t], i) => `<div style="display:flex;align-items:baseline;gap:22px;padding:8px 0;${i < PIC.length - 1 ? "border-bottom:1px solid rgba(255,255,255,.12)" : ""}"><span style="font:800 ${gfs}px/1 Brico;color:var(--amarillo);min-width:${Math.round(gfs * 2.9)}px">${g}</span><span style="font:700 ${fs}px/1.2 Fig">${t}</span></div>`).join("")}<div style="font:800 ${Math.round(fs * .85)}px Fig;color:var(--amarillo);margin-top:10px;letter-spacing:.06em">1,5 KG EN TOTAL</div></div>`;
p["2026-11-27-picada-navidad-post-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · ACOPIO_NAVIDAD_PICADA_FEED_V01 (brief de Juli 26/11) · /combos/picada-de-navidad $39.500 · tipográfica: no hay fotos reales de higos ni pistachos`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:0 60px;color:#fff"><div class="logo" style="color:#fff;font-size:28px">${logoA}Acopio Saludable</div>
<div style="font:800 38px Fig;color:${sub};margin-top:14px">Picada de Navidad</div>
<h1 style="font-size:92px;margin-top:2px">La picada de las fiestas,<br><span style="color:var(--amarillo)">resuelta</span></h1>
<div style="margin-top:18px">${lista(30, 36, 800)}</div>
<div style="font:800 100px/1 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:16px">$39.500</div>
${btn(940, 70, 32, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}
<div style="margin-top:10px">${CP(20, sub)}</div></div></div>`)];
p["2026-11-27-picada-navidad-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · ACOPIO_NAVIDAD_PICADA_STORY_V01 · zona segura 250/300`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 60px 300px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="font:800 50px Fig;color:${sub};margin-top:24px">Picada de Navidad</div>
<h1 style="font-size:120px;margin-top:4px">La picada<br>de las fiestas,<br><span style="color:var(--amarillo)">resuelta</span></h1>
<div style="margin-top:28px">${lista(36, 44, 920)}</div>
<div style="font:800 160px/1 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:26px">$39.500</div>
${btn(960, 92, 40, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:24px")}
<div style="margin-top:14px">${chips(28, "var(--amarillo)", "var(--verde)", ["Sin compra mínima en Carlos Paz", "Envío en Carlos Paz $3.000"])}</div></div></div>`)];

// ---------- DOS MIXES (brief de Juli 25/11, sáb 28/11 13:00) — tipográfica, dos columnas ----------
const colM = (w, h, fs, tit, dif, precio, fondo, color, acento) => `<div style="width:${w}px;height:${h}px;border-radius:26px;background:${fondo};color:${color};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box"><div style="font:800 ${fs}px/1.05 Brico">${tit}</div><div style="font:800 ${Math.round(fs * .42)}px/1.25 Fig;margin-top:14px;color:${acento}">${dif}</div><div style="font:800 ${Math.round(fs * 1.25)}px/1 Brico;letter-spacing:-.03em;margin-top:22px">${precio}</div><div style="font:700 ${Math.round(fs * .36)}px Fig;margin-top:6px">el kilo</div></div>`;
const dosCol = (w, h, fs, gap) => `<div style="display:flex;gap:${gap}px;justify-content:center">${colM(w, h, fs, "Mix clásico<br>con cajú<br>y girasol", "el más pedido", "$10.500", "var(--verde)", "#fff", "var(--amarillo)")}${colM(w, h, fs, "Mix clásico<br>con cajú", "sin girasol", "$12.500", "var(--amarillo)", "var(--verde)", "var(--rojo)")}</div>`;
p["2026-11-27-dos-mixes-post-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · ACOPIO_DOS_MIXES_FEED_V01 (brief de Juli 25/11) · /producto/TG-MIXCG $10.500 y /producto/TG-MIXC $12.500 · tipográfica: no hay foto real del mix sin girasol`, `<div class="c"><div class="col" style="padding:0 50px"><div class="logo" style="font-size:28px">${logoV}Acopio Saludable</div>
<h1 style="font-size:96px;margin-top:12px">¿Con o sin <em>girasol</em>?</h1>
<div style="font:700 30px Fig;color:var(--gris);margin-top:8px">Nuestros dos mixes de la casa, por kilo</div>
<div style="margin-top:24px">${dosCol(440, 470, 58, 24)}</div>
${btn(940, 72, 32, "Pedilo: WhatsApp 3541 51-9630", "margin-top:24px")}
<div style="margin-top:10px">${CP(20, "var(--gris)")}</div></div></div>`)];
// La historia de Dos mixes la hizo Juli hoy (2026-11-27-dos-mixes-historia-1920.jpg): no se duplica.

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
