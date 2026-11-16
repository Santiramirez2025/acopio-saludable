// Piezas del 16/11/2026 (Lucas). Precios verificados el 16/11 en /combos/<slug> y /lista-precios.csv:
// Kit semanal $25.500 (por separado $27.600) · transf. 8% → $23.400 (checkout: piso a la centena) · trae granola 1 kg + mix clásico con cajú y girasol 500 g + dátiles con carozo 500 g + mix de semillas 500 g.
// Trío de frutos secos $24.000 / $22.000 transf. · Despensa $28.500 / $26.200 · nuez 1 kg $20.500 · Despensa + nuez $49.000 / $45.000 transf. · pasas $5.900 · semillas $5.200 · dátiles con carozo $10.900.
// Uso: node scripts/piezas-2026-11-16.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const logoA = logoV.replace(/#10251C/g, "#FFC83D").replace(/fill="#fff"/, 'fill="#10251C"');
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const btn = (w, h, t, txt, st = "") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px;${st}">${wa}${txt}</div>`;
const F = {
  gra: ["../../reales/real-granola.jpg", "50% 50%", "Granola tradicional", "1 kg"],
  mix5: ["../../reales/real-mix-500.jpg", "50% 60%", "Mix con cajú y girasol", "500 g"],
  dat5: ["2026-11-04-datiles-plato-foto.jpg", "35% 40%", "Dátiles con carozo", "500 g"],
  sem5: ["2026-11-11-semillas-bolsa-sola-foto.jpg", "50% 50%", "Mix de semillas", "500 g"],
  mix: ["../../reales/real-mix.jpg", "50% 62%;transform:scale(1.55);transform-origin:50% 62%", "Mix con cajú y girasol", "1 kg"],
  dat: ["2026-11-04-datiles-plato-foto.jpg", "35% 40%", "Dátiles con carozo", "1 kg"],
  pas: ["2026-11-10-pasas-cerca-foto.jpg", "50% 75%", "Pasas sin semilla", "1 kg"],
  sem: ["2026-11-11-semillas-bolsa-sola-foto.jpg", "50% 50%", "Mix de semillas", "1 kg"],
  nuez: ["2026-11-09-nuez-foto.jpg", "50% 52%", "Nuez mariposa", "1 kg"],
};
const NOTA = "Lucas 16/11/2026 · precios verificados 16/11 en /combos/<slug> y /lista-precios.csv · sin aprobar ni publicar";
const ft = (k, w, h, r = 26) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:${r}px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`;
const tag = (k, fs, col = "var(--rojo)") => `<div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${F[k][2]} <span style="color:${col}">${F[k][3]}</span></div>`;
const grid = (ks, w, h, fs, col) => `<div style="display:grid;grid-template-columns:repeat(2,${w}px);gap:14px">${ks.map(k => `<div>${ft(k, w, h)}${tag(k, fs, col)}</div>`).join("")}</div>`;
const fila = (ks, w, h, fs, col = "var(--rojo)") => `<div style="display:flex;gap:14px">${ks.map(k => `<div style="width:${w}px">${ft(k, w, h)}<div style="font:800 ${fs}px/1.15 Fig;margin-top:8px">${F[k][2]}<br><span style="color:${col}">${F[k][3]}</span></div></div>`).join("")}</div>`;
const p = {};
const KIT = ["gra", "mix5", "dat5", "sem5"], TRIO = ["mix", "dat", "pas"];
const local = (fs, c) => `<div style="font:800 ${fs}px/1.3 Fig;color:${c}">No tenemos local: te lo llevamos a tu casa,<br>sin cargo en Carlos Paz y la zona</div>`;

// ---------- PAULA: Kit semanal ----------
p["2026-11-16-anuncio-kit-semanal-1350"] = [1080, 1350, doc(1080, 1350, `${NOTA} · Paula: Kit semanal $25.500 / $23.400 transf. 1080x1350`, `<div class="c"><div class="col" style="padding:0 50px"><div class="logo" style="font-size:30px">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:16px">Kit semanal · 4 productos</div>
<h1 style="font-size:96px;margin-top:14px">La semana resuelta:<br><em>2,5 kilos</em></h1>
<div style="margin-top:22px">${fila(KIT, 232, 300, 21)}</div>
<div style="display:flex;align-items:center;gap:26px;margin-top:22px"><div style="font:800 128px/1 Brico;color:var(--rojo);letter-spacing:-.03em">$25.500</div><div style="font:800 34px/1.25 Fig;text-align:left"><span style="background:var(--amarillo);padding:2px 14px;border-radius:10px">$23.400</span><br>por transferencia</div></div>
<div style="margin-top:20px">${btn(960, 82, 36, "Pedilo: WhatsApp 3541 51-9630")}</div>
<div style="margin-top:16px">${local(25, "var(--verde)")}</div><div style="font:600 21px Fig;color:var(--gris);margin-top:6px">Se paga antes de la entrega · acopiosaludable.com/combos/kit-semanal</div></div></div>`)];
p["2026-11-16-anuncio-kit-semanal-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Paula: Kit semanal historia 1080x1920`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:190px 50px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:22px;font:800 28px Fig;letter-spacing:.18em;color:var(--amarillo)">KIT SEMANAL · 4 PRODUCTOS</div>
<h1 style="font-size:110px;margin-top:12px">La semana resuelta:<br><span style="color:var(--amarillo)">2,5 kilos</span></h1>
<div style="margin-top:30px">${grid(KIT, 460, 250, 28, "var(--amarillo)")}</div>
<div style="font:800 160px/1.02 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:18px">$25.500</div>
<div style="font:800 42px Fig"><span style="background:#fff;color:var(--verde);padding:4px 18px;border-radius:12px">$23.400 por transferencia</span></div>
${btn(960, 92, 40, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:28px")}
<div style="margin-top:16px">${local(28, "#fff")}</div><div style="font:600 23px Fig;color:#C9D6CF;margin-top:6px">Se paga antes de la entrega</div></div></div>`)];

// ---------- JULI: Trío finde (+ línea del local de Paula) y Trío responde ----------
const recetas = (fs) => `<div style="display:flex;flex-direction:column;gap:12px;width:980px;margin-top:26px">${["Bolitas de dátiles y frutos secos", "Granola casera para el desayuno", "Dátiles rellenos para la picada"].map((r, i) => `<div style="display:flex;align-items:center;gap:18px;background:rgba(255,255,255,.08);border-radius:20px;padding:14px 22px;text-align:left"><div style="width:52px;height:52px;border-radius:50%;background:var(--amarillo);color:var(--verde);font:800 30px/52px Fig;text-align:center;flex:none">${i + 1}</div><div style="font:800 ${fs}px Fig">${r}</div></div>`).join("")}</div>`;
p["2026-11-18-trio-recetas-finde-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Juli: Trío finde 1080x1920 (reparto lunes a sábado) + línea del local (Paula)`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:190px 50px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:22px;font:800 28px Fig;letter-spacing:.18em;color:var(--amarillo)">TRÍO DE FRUTOS SECOS · 3 KG</div>
<h1 style="font-size:104px;margin-top:12px">3 kilos, 3 recetas.<br><span style="color:var(--amarillo)">La semana resuelta.</span></h1>
<div style="margin-top:28px">${fila(TRIO, 317, 300, 25, "var(--amarillo)")}</div>${recetas(32)}
<div style="font:800 150px/1.02 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:18px">$24.000</div>
<div style="font:800 40px Fig"><span style="background:#fff;color:var(--verde);padding:4px 18px;border-radius:12px">$22.000 por transferencia</span></div>
<div style="font:800 32px/1.3 Fig;margin-top:22px">Pagás antes de las 15 y sale en el<br>reparto del día (lunes a sábado)</div>
<div style="margin-top:14px">${local(26, "#C9D6CF")}</div>
${btn(960, 88, 38, "WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:22px")}</div></div>`)];
p["2026-11-18-trio-responde-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Juli: experimento historia que se responde, Trío 1080x1920`, `<div class="c"><div class="col" style="padding:190px 50px 260px"><div class="logo">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:20px">Trío de frutos secos · 3 kg</div>
<div style="margin-top:28px">${fila(TRIO, 317, 420, 25)}</div>
<div style="display:flex;align-items:center;gap:26px;margin-top:26px"><div style="font:800 140px/1 Brico;color:var(--rojo);letter-spacing:-.03em">$24.000</div><div style="font:800 36px/1.25 Fig;text-align:left"><span style="background:var(--amarillo);padding:2px 14px;border-radius:10px">$22.000</span><br>por transferencia</div></div>
<div style="background:var(--verde);color:#fff;border-radius:40px;padding:40px 36px;margin-top:34px;width:980px"><div style="font:800 74px/1.02 Brico">Respondé esta historia con <span style="background:var(--amarillo);color:var(--verde);padding:0 18px;border-radius:16px">TRÍO</span></div><div style="font:700 38px/1.25 Fig;margin-top:16px;color:#E4ECE7">y te pasamos el link para pedirlo</div></div>
<div style="font:700 28px Fig;color:var(--gris);margin-top:24px">Se paga antes de la entrega · WhatsApp 3541 51-9630</div></div></div>`)];

// ---------- JULI: «La mesa de fiestas, resuelta» post + historia ----------
const cinco = (big, sw, sh, gap, col = "var(--rojo)", tf = 22) => `<div style="display:grid;grid-template-columns:${big}px repeat(2,${sw}px);gap:${gap}px;align-items:start">
<div style="grid-row:span 2"><div>${ft("nuez", big, sh * 2 + gap + 44, 30)}</div>${tag("nuez", 30, col)}</div>
${["mix", "dat", "pas", "sem"].map(k => `<div>${ft(k, sw, sh)}${tag(k, tf, col)}</div>`).join("")}</div>`;
p["2026-11-16-mesa-fiestas-post-1350"] = [1080, 1350, doc(1080, 1350, `${NOTA} · Juli: La mesa de fiestas, resuelta 1080x1350`, `<div class="c"><div class="col" style="padding:0 46px"><div class="logo" style="font-size:30px">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:14px">Despensa de 4 kilos + 1 kg de nuez</div>
<h1 style="font-size:92px;margin-top:12px">La mesa de fiestas,<br><em>resuelta</em></h1>
<div style="margin-top:20px">${cinco(400, 280, 210, 14)}</div>
<div style="display:flex;align-items:center;gap:24px;margin-top:12px"><div style="font:800 120px/1 Brico;color:var(--rojo);letter-spacing:-.03em">$49.000</div><div style="font:800 32px/1.25 Fig;text-align:left"><span style="background:var(--amarillo);padding:2px 14px;border-radius:10px">$45.000</span><br>por transferencia</div></div>
<div style="font:700 24px Fig;color:var(--gris);margin-top:6px">Pedilo por WhatsApp o sumando los dos al carrito</div>
<div style="margin-top:14px">${btn(960, 80, 35, "WhatsApp 3541 51-9630")}</div>
<div style="font:700 22px Fig;color:var(--gris);margin-top:12px">Sin compra mínima en Carlos Paz y la zona · se paga antes de la entrega</div></div></div>`)];
p["2026-11-16-mesa-fiestas-historia-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Juli: La mesa de fiestas, resuelta 1080x1920`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:190px 50px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:22px;font:800 28px Fig;letter-spacing:.18em;color:var(--amarillo)">DESPENSA DE 4 KILOS + 1 KG DE NUEZ</div>
<h1 style="font-size:106px;margin-top:12px">La mesa de fiestas,<br><span style="color:var(--amarillo)">resuelta</span></h1>
<div style="margin-top:30px">${cinco(440, 252, 250, 14, "var(--amarillo)", 19)}</div>
<div style="font:800 160px/1.02 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:16px">$49.000</div>
<div style="font:800 42px Fig"><span style="background:#fff;color:var(--verde);padding:4px 18px;border-radius:12px">$45.000 por transferencia</span></div>
<div style="font:700 28px Fig;color:#E4ECE7;margin-top:18px">Pedilo por WhatsApp o sumando los dos al carrito</div>
${btn(960, 90, 40, "WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:18px")}<div style="font:700 25px Fig;color:#C9D6CF;margin-top:12px">Sin compra mínima en Carlos Paz y la zona · se paga antes de la entrega</div></div></div>`)];

// ---------- JULI: «La despensa sin mínimo» post ----------
p["2026-11-16-despensa-sin-minimo-post-1350"] = [1080, 1350, doc(1080, 1350, `${NOTA} · Juli: La despensa sin mínimo 1080x1350`, `<div class="c"><div class="col" style="padding:0 50px"><div class="logo" style="font-size:30px">${logoV}Acopio Saludable</div>
<h1 style="font-size:100px;margin-top:22px">Pedí lo que<br><em>necesites</em></h1>
<div class="sub" style="margin-top:12px;font-weight:700">Sin compra mínima en Carlos Paz y la zona</div>
<div style="display:flex;gap:16px;margin-top:30px">${["pas", "sem", "dat"].map(k => `<div style="width:316px;background:#fff;border-radius:30px;padding:12px 12px 18px">${ft(k, 292, 400, 22)}<div style="font:800 26px/1.15 Fig;margin-top:12px">${F[k][2]}<br><span style="color:var(--gris);font-size:22px">1 kg</span></div><div style="font:800 64px/1.05 Brico;color:var(--rojo);letter-spacing:-.02em">$${{ pas: "5.900", sem: "5.200", dat: "10.900" }[k]}</div></div>`).join("")}</div>
<div style="font:700 26px/1.4 Fig;color:var(--gris);margin-top:24px">Envío $3.000 si no llegás a $20.000 · sin cargo desde $20.000<br>8% menos por transferencia · se paga antes de la entrega</div>
<div style="margin-top:22px">${btn(960, 84, 37, "Pedí por WhatsApp 3541 51-9630")}</div></div></div>`)];

const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(p)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  const pg = await nav.newPage({ viewport: { width: w, height: h } });
  await pg.goto(`file://${src}`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  const over = await pg.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1 || r.top < -1; }).length, [w, h]);
  const [top, bottom] = await pg.evaluate(() => { const r = [...document.querySelectorAll(".col > *")].map(e => e.getBoundingClientRect()); return [Math.min(...r.map(x => x.top)), Math.max(...r.map(x => x.bottom))]; });
  await pg.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over, "contenido:", Math.round(top), "-", Math.round(bottom), "/", h);
}
await nav.close();
