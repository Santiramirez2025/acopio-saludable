// Piezas del 18/11/2026 (Lucas). Precios verificados el 18/11 en /combos/despensa-4-kilos y /producto/LG-DATIL:
// Despensa de 4 kilos $28.500 (por separado $32.500, ahorrás $4.000) · transf. 8% → $26.200 (checkout: piso a la centena).
// Trae 1 kg de cada uno: dátiles con carozo, mix de semillas, mix clásico con cajú y girasol, pasas de uva sin semilla.
// Dátiles con carozo 1 kg $10.900 · transf. → $10.000.
// Política 3/11: en Carlos Paz y la zona sin compra mínima; envío $3.000 debajo de $20.000, sin cargo desde $20.000. Se cobra antes de entregar.
// 3 ganchos de anuncio para la Despensa (precio / entrega / ahorro), cada uno 1080x1080 y 1080x1920, + dátiles 1080x1080 y 1080x1920.
// Uso: node scripts/piezas-2026-11-18.mjs
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
  sem: ["2026-11-11-semillas-bolsa-sola-foto.jpg", "50% 50%", "Mix de semillas"],
  mix: ["../../reales/real-mix.jpg", "50% 62%;transform:scale(1.55);transform-origin:50% 62%", "Mix con cajú y girasol"],
  pas: ["2026-11-10-pasas-cerca-foto.jpg", "50% 75%", "Pasas sin semilla"],
};
const D4 = ["dat", "mix", "pas", "sem"];
const NOTA = "Lucas 18/11/2026 · precios verificados 18/11 en /combos/despensa-4-kilos y /producto/LG-DATIL · sin aprobar ni publicar";
const ft = (k, w, h, r = 22) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:${r}px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`;
// 4 fotos con nombre + «1 kg»
const cuatro = (w, h, fs, col = "var(--rojo)", cols = 4) => `<div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:12px">${D4.map(k => `<div>${ft(k, w, h)}<div style="font:800 ${fs}px/1.12 Fig;margin-top:7px">${F[k][2]}<br><span style="color:${col}">1 kg</span></div></div>`).join("")}</div>`;
// las dos condiciones de zona, siempre juntas
const cond = (fs, fondo, color) => `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${["Sin compra mínima en Carlos Paz", "Entrega sin cargo desde $20.000"].map(t => `<span style="background:${fondo};color:${color};border-radius:999px;padding:10px 22px;font:800 ${fs}px Fig;white-space:nowrap">${t}</span>`).join("")}</div>`;
const precio = (fs, sub, col = "var(--rojo)", chip = "var(--amarillo)", chipTxt = "var(--verde)", txt = "var(--verde)") => `<div style="display:flex;align-items:center;gap:24px;justify-content:center"><div style="font:800 ${fs}px/1 Brico;color:${col};letter-spacing:-.03em">$28.500</div><div style="font:800 ${sub}px/1.25 Fig;text-align:left;color:${txt}"><span style="background:${chip};color:${chipTxt};padding:2px 14px;border-radius:10px">$26.200</span><br>por transferencia</div></div>`;
const pie = (fs, c) => `<div style="font:700 ${fs}px Fig;color:${c}">Carlos Paz y la zona · se paga antes de la entrega · acopiosaludable.com</div>`;
const p = {};

// ---------- A · gancho PRECIO/CANTIDAD: «4 kilos de despensa, $28.500» ----------
p["2026-11-18-anuncio-despensa-precio-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · A precio 1080x1080`, `<div class="c"><div class="col" style="padding:0 40px"><div class="logo" style="font-size:28px">${logoV}Acopio Saludable</div>
<h1 style="font-size:96px;margin-top:14px">4 kilos de despensa,<br><em>un solo pedido</em></h1>
<div style="margin-top:22px">${cuatro(238, 230, 20)}</div>
<div style="margin-top:16px">${precio(112, 30)}</div>
<div style="margin-top:16px">${cond(23, "var(--verde)", "#fff")}</div>
<div style="margin-top:14px">${btn(940, 70, 32, "Pedila: WhatsApp 3541 51-9630")}</div>
<div style="margin-top:10px">${pie(19, "var(--gris)")}</div></div></div>`)];
p["2026-11-18-anuncio-despensa-precio-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · A precio 1080x1920 (zona segura 250 arriba / 300 abajo)`, `<div class="c"><div class="col" style="padding:250px 50px 260px"><div class="logo">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:22px">Despensa · 4 productos</div>
<h1 style="font-size:104px;margin-top:16px">4 kilos de<br>despensa,<br><em>un solo pedido</em></h1>
<div style="margin-top:30px">${cuatro(475, 185, 30, "var(--rojo)", 2)}</div>
<div style="margin-top:22px">${precio(150, 38)}</div>
<div style="margin-top:22px">${cond(28, "var(--verde)", "#fff")}</div>
${btn(960, 90, 38, "Pedila: WhatsApp 3541 51-9630", "margin-top:22px")}
<div style="margin-top:12px">${pie(22, "var(--gris)")}</div></div></div>`)];

// ---------- B · gancho ENTREGA: «Pedís hoy, te la llevamos sin cargo» (fondo verde) ----------
p["2026-11-18-anuncio-despensa-entrega-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · B entrega 1080x1080`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:0 40px;color:#fff"><div class="logo" style="color:#fff;font-size:28px">${logoA}Acopio Saludable</div>
<h1 style="font-size:92px;margin-top:14px">Tu despensa,<br><span style="color:var(--amarillo)">llevada a tu casa</span></h1>
<div style="font:700 30px Fig;color:#E4ECE7;margin-top:10px">Sin compra mínima en Carlos Paz · sin cargo desde $20.000</div>
<div style="margin-top:20px">${cuatro(238, 210, 20, "var(--amarillo)")}</div>
<div style="font:800 24px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:16px">DESPENSA DE 4 KILOS</div>
<div style="margin-top:4px">${precio(104, 28, "var(--amarillo)", "#fff", "var(--verde)", "#fff")}</div>
${btn(940, 70, 32, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:18px")}
<div style="margin-top:10px">${pie(19, "#C9D6CF")}</div></div></div>`)];
p["2026-11-18-anuncio-despensa-entrega-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · B entrega 1080x1920`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:250px 50px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<h1 style="font-size:108px;margin-top:22px">Tu despensa,<br><span style="color:var(--amarillo)">llevada<br>a tu casa</span></h1>
<div style="margin-top:22px">${cond(28, "var(--amarillo)", "var(--verde)")}</div>
<div style="margin-top:28px">${cuatro(475, 185, 30, "var(--amarillo)", 2)}</div>
<div style="font:800 28px Fig;color:var(--amarillo);letter-spacing:.14em;margin-top:22px">DESPENSA DE 4 KILOS</div>
<div style="margin-top:6px">${precio(150, 38, "var(--amarillo)", "#fff", "var(--verde)", "#fff")}</div>
${btn(960, 90, 38, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:24px")}
<div style="margin-top:12px">${pie(22, "#C9D6CF")}</div></div></div>`)];

// ---------- C · gancho AHORRO: «Ahorrás $4.000 contra comprarlos sueltos» ----------
const ahorro = (fs) => `<div style="display:inline-flex;align-items:center;gap:14px;font:800 ${fs}px Fig"><span style="text-decoration:line-through;color:var(--gris)">Sueltos $32.500</span><span>→</span><span style="background:var(--rojo);color:#fff;padding:4px 16px;border-radius:12px">Juntos $28.500</span></div>`;
p["2026-11-18-anuncio-despensa-ahorro-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · C ahorro 1080x1080`, `<div class="c"><div class="col" style="padding:0 40px"><div class="logo" style="font-size:28px">${logoV}Acopio Saludable</div>
<h1 style="font-size:104px;margin-top:14px">Llevá los 4 y<br><em>ahorrás $4.000</em></h1>
<div style="margin-top:16px">${ahorro(32)}</div>
<div style="margin-top:20px">${cuatro(238, 220, 20)}</div>
<div style="font:800 30px Fig;margin-top:16px">Por transferencia: <span style="background:var(--amarillo);padding:2px 14px;border-radius:10px">$26.200</span></div>
<div style="margin-top:14px">${cond(23, "var(--verde)", "#fff")}</div>
<div style="margin-top:14px">${btn(940, 70, 32, "Pedila: WhatsApp 3541 51-9630")}</div>
<div style="margin-top:10px">${pie(19, "var(--gris)")}</div></div></div>`)];
p["2026-11-18-anuncio-despensa-ahorro-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · C ahorro 1080x1920`, `<div class="c"><div class="col" style="padding:250px 50px 260px"><div class="logo">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:22px">Despensa de 4 kilos</div>
<h1 style="font-size:108px;margin-top:16px">Llevá los 4 y<br><em>ahorrás<br>$4.000</em></h1>
<div style="margin-top:22px">${ahorro(38)}</div>
<div style="margin-top:28px">${cuatro(475, 180, 30, "var(--rojo)", 2)}</div>
<div style="font:800 38px Fig;margin-top:22px">Por transferencia: <span style="background:var(--amarillo);padding:2px 16px;border-radius:12px">$26.200</span></div>
<div style="margin-top:20px">${cond(28, "var(--verde)", "#fff")}</div>
${btn(960, 90, 38, "Pedila: WhatsApp 3541 51-9630", "margin-top:22px")}
<div style="margin-top:12px">${pie(22, "var(--gris)")}</div></div></div>`)];

// ---------- DÁTILES CON CAROZO 1 kg: foto de cajón a sangre ----------
const datFoto = `<img class="real" src="2026-11-09-datiles-cajon-1-foto.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 35%">`;
const velo = (a) => `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,37,28,.0) ${a}%,rgba(16,37,28,.92) ${a + 22}%,#10251C 100%)"></div>`;
p["2026-11-18-anuncio-datiles-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · Dátiles con carozo 1080x1080`, `<div class="c" style="background:var(--verde)">${datFoto}${velo(34)}
<div style="position:absolute;top:36px;left:40px;background:var(--crema);border-radius:999px;padding:10px 24px 10px 12px"><div class="logo" style="font-size:26px">${logoV}Acopio Saludable</div></div>
<div style="position:absolute;left:0;right:0;bottom:36px;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center">
<h1 style="font-size:100px">Dátiles con carozo,<br><span style="color:var(--amarillo)">el kilo a $10.900</span></h1>
<div style="font:800 32px Fig;margin-top:14px"><span style="background:#fff;color:var(--verde);padding:4px 16px;border-radius:12px">$10.000 por transferencia</span></div>
<div style="font:700 25px/1.35 Fig;color:#E4ECE7;margin-top:14px">Sin compra mínima en Carlos Paz y la zona · envío $3.000,<br>sin cargo si sumás $20.000 · se paga antes de la entrega</div>
${btn(940, 70, 32, "Pedilos: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:16px")}</div></div>`)];
p["2026-11-18-anuncio-datiles-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Dátiles con carozo 1080x1920`, `<div class="c" style="background:var(--verde)">${datFoto}${velo(30)}
<div style="position:absolute;top:250px;left:0;right:0;display:flex;justify-content:center"><div style="background:var(--crema);border-radius:999px;padding:12px 28px 12px 14px"><div class="logo">${logoV}Acopio Saludable</div></div></div>
<div style="position:absolute;left:0;right:0;bottom:300px;text-align:center;color:#fff;display:flex;flex-direction:column;align-items:center">
<div style="font:800 30px Fig;letter-spacing:.18em;color:var(--amarillo)">BOLSA DE 1 KG</div>
<h1 style="font-size:124px;margin-top:10px">Dátiles<br>con carozo</h1>
<div style="font:800 180px/1.02 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:10px">$10.900</div>
<div style="font:800 40px Fig"><span style="background:#fff;color:var(--verde);padding:4px 18px;border-radius:12px">$10.000 por transferencia</span></div>
<div style="font:700 29px/1.35 Fig;color:#E4ECE7;margin-top:20px">Sin compra mínima en Carlos Paz y la zona<br>Envío $3.000 · sin cargo si sumás $20.000</div>
${btn(960, 90, 38, "Pedilos: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:22px")}
<div style="font:700 23px Fig;color:#C9D6CF;margin-top:12px">Se paga antes de la entrega · acopiosaludable.com</div></div></div>`)];

const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(p)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  const pg = await nav.newPage({ viewport: { width: w, height: h } });
  await pg.goto(`file://${src}`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  const over = await pg.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.left < -1 || r.bottom > H + 1 || r.top < -1; }).filter(e => !e.querySelector("img")).length, [w, h]);
  const [top, bottom] = await pg.evaluate(() => { const r = [...document.querySelectorAll(".col > *, .c > div[style*=bottom] > *")].map(e => e.getBoundingClientRect()); return [Math.min(...r.map(x => x.top)), Math.max(...r.map(x => x.bottom))]; });
  await pg.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over, "contenido:", Math.round(top), "-", Math.round(bottom), "/", h);
}
await nav.close();
