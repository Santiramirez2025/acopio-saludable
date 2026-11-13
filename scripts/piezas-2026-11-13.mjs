// Piezas del 13/11/2026 (Lucas). Precios verificados el 13/11 en /combos/<slug>, /lista-precios.csv y /api/admin/canales:
// Despensa de 4 kilos $28.500 (InStock; trae dátiles con carozo, mix de semillas, mix clásico con cajú y girasol y pasas, 1 kg c/u) · $26.200 por transferencia (8% menos, redondeado).
// Trío del desayuno $21.500 · $19.700 transf. · Dátiles con carozo 1 kg $10.900.
// Fotos reales: semillas bolsa sola (11/11), dátiles plato (4/11), pasas cerca (10/11), mix real (reales/real-mix.jpg, recortado sin rótulo).
// Uso: node scripts/piezas-2026-11-13.mjs
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
  sem: ["2026-11-11-semillas-bolsa-sola-foto.jpg", "50% 50%", "Mix de semillas"],
  dat: ["2026-11-04-datiles-plato-foto.jpg", "35% 40%", "Dátiles con carozo"],
  mix: ["../../reales/real-mix.jpg", "50% 62%;transform:scale(1.55);transform-origin:50% 62%", "Mix clásico con cajú y girasol"],
  pas: ["2026-11-10-pasas-cerca-foto.jpg", "50% 75%", "Pasas sin semilla"],
};
const DESP = ["mix", "dat", "pas", "sem"];
// fila de fotos: n columnas, alto h, etiqueta debajo
const fila = (keys, w, h, cols, fs, color, gap = 14) => `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}px;width:${w}px">${keys.map(k => { const [s, p, t] = F[k]; return `<div><div class="foto" style="height:${h}px;border-radius:26px"><img class="real" src="${s}" style="object-position:${p}"></div><div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${t} <span style="color:${color}">1 kg</span></div></div>`; }).join("")}</div>`;
const NOTA = "Lucas 13/11/2026 · precios verificados 13/11 en /combos y /lista-precios.csv · sin aprobar ni publicar";
const PIE = "Se paga antes de la entrega: transferencia (8% menos) o Mercado Pago";
const piezas = {};

// ---------- DESPENSA: 3 ganchos × 2 formatos ----------
const ganchos = {
  precio: { ceja: "DESPENSA DE 4 KILOS", t1: "4 kilos", t2: "en un solo pedido", fondo: "crema" },
  "sin-minimo": { ceja: "VILLA CARLOS PAZ Y LA ZONA", t1: "Sin compra mínima", t2: "en Carlos Paz", fondo: "verde" },
  "sin-cargo": { ceja: "DESPENSA DE 4 KILOS", t1: "Entrega sin cargo", t2: "desde $20.000", fondo: "amarillo" },
};
const tema = f => f === "verde" ? { bg: "var(--verde)", tx: "#fff", ac: "var(--amarillo)", pr: "var(--amarillo)", chip: "background:#fff;color:var(--verde)", btn: "background:var(--amarillo);color:var(--verde)", pie: "#C9D6CF", logo: logoA }
  : f === "amarillo" ? { bg: "var(--amarillo)", tx: "var(--verde)", ac: "var(--rojo)", pr: "var(--verde)", chip: "background:var(--verde);color:#fff", btn: "", pie: "#3C4A41", logo: logoV }
  : { bg: "var(--crema)", tx: "var(--verde)", ac: "var(--rojo)", pr: "var(--rojo)", chip: "background:var(--amarillo);color:var(--verde)", btn: "", pie: "var(--gris)", logo: logoV };
const linea = { precio: "Mix con cajú y girasol, dátiles, pasas y semillas", "sin-minimo": "Pedí lo que necesites. Envío $3.000 debajo de $20.000; sin cargo desde $20.000.", "sin-cargo": "La Despensa de 4 kilos ya la pasa: llega sin cargo a tu casa en Carlos Paz y la zona" };
for (const [g, d] of Object.entries(ganchos)) {
  const T = tema(d.fondo);
  const h1 = g === "precio" ? `${d.t1}<br><span style="color:${T.ac}">${d.t2}</span>` : `${d.t1}<br><span style="color:${T.ac}">${d.t2}</span>`;
  piezas[`2026-11-13-anuncio-despensa-${g}-1080`] = [1080, 1080, doc(1080, 1080, `${NOTA} · Despensa ${g} 1080x1080`, `<div class="c" style="background:${T.bg}"><div class="col" style="padding:0 44px;color:${T.tx}"><div class="logo" style="color:${T.tx};font-size:30px">${T.logo}Acopio Saludable</div>
<h1 style="font-size:${g === "precio" ? 82 : 76}px;margin-top:12px;line-height:.98">${h1}</h1>
<div style="margin-top:20px">${fila(DESP, 992, 300, 4, 22, T.ac, 12)}</div>
<div style="display:flex;align-items:center;gap:22px;margin-top:16px"><div style="font:800 30px/1.05 Fig;text-align:right">Despensa<br>4 kilos</div><div style="font:800 104px/1 Brico;color:${T.pr};letter-spacing:-.03em">$28.500</div></div>
<div style="font:800 33px Fig;margin-top:6px"><span style="${T.chip};padding:3px 16px;border-radius:12px">$26.200 por transferencia</span></div>
<div style="margin-top:18px">${btn(960, 76, 34, "Pedila: WhatsApp 3541 51-9630", T.btn)}</div><div style="font:600 21px Fig;color:${T.pie};margin-top:10px">${g === "sin-minimo" ? "Sin compra mínima en Carlos Paz y la zona" : "Entrega sin cargo en Carlos Paz y la zona"} · Se paga antes de la entrega</div></div></div>`)];
  piezas[`2026-11-13-anuncio-despensa-${g}-1920`] = [1080, 1920, doc(1080, 1920, `${NOTA} · Despensa ${g} 1080x1920`, `<div class="c" style="background:${T.bg}"><div class="col" style="padding:200px 50px 250px;color:${T.tx}"><div class="logo" style="color:${T.tx}">${T.logo}Acopio Saludable</div>
<div style="margin-top:22px;font:800 30px Fig;letter-spacing:.2em;color:${T.ac}">${d.ceja}</div>
<h1 style="font-size:${g === "precio" ? 96 : 88}px;margin-top:10px;line-height:.98">${h1}</h1>
<div style="font:600 32px/1.3 Fig;margin-top:16px;max-width:900px">${linea[g]}</div>
<div style="margin-top:26px">${fila(DESP, 960, 280, 2, 28, T.ac, 14)}</div>
<div style="font:800 132px/1.02 Brico;color:${T.pr};letter-spacing:-.03em;margin-top:14px">$28.500</div>
<div style="font:800 42px Fig;margin-top:4px"><span style="${T.chip};padding:4px 18px;border-radius:12px">$26.200 por transferencia</span></div>
${btn(960, 92, 40, "Pedila: WhatsApp 3541 51-9630", T.btn + ";margin-top:26px")}<div style="font:600 25px Fig;color:${T.pie};margin-top:12px">${PIE}</div></div></div>`)];
}

// ---------- DÁTILES CON CAROZO ----------
const datFotos = (h) => `<div style="display:grid;grid-template-columns:1.25fr 1fr;gap:14px;width:980px"><div class="foto" style="height:${h}px"><img class="real" src="2026-11-04-datiles-plato-foto.jpg" style="object-position:35% 40%"></div><div class="foto" style="height:${h}px"><img class="real" src="2026-11-09-datil-abierto-foto.jpg" style="object-position:50% 50%"></div></div>`;
piezas["2026-11-13-anuncio-datiles-carozo-1080"] = [1080, 1080, doc(1080, 1080, `${NOTA} · Dátiles con carozo 1 kg $10.900`, `<div class="c" style="background:var(--crema)"><div class="col" style="padding:0 50px"><div class="logo" style="font-size:30px">${logoV}Acopio Saludable</div>
<h1 style="font-size:84px;margin-top:12px;line-height:.98">Dátiles con carozo<br><em>1 kilo</em></h1>
<div style="margin-top:22px">${datFotos(400)}</div>
<div style="font:800 120px/1 Brico;color:var(--rojo);letter-spacing:-.03em;margin-top:18px">$10.900</div>
<div style="font:800 30px Fig;margin-top:6px"><span style="background:var(--amarillo);padding:3px 16px;border-radius:12px">8% menos por transferencia</span></div>
<div style="margin-top:16px">${btn(960, 74, 34, "Pedilos: WhatsApp 3541 51-9630")}</div><div style="font:600 21px Fig;color:var(--gris);margin-top:10px">Sin compra mínima en Carlos Paz · envío $3.000, sin cargo desde $20.000</div></div></div>`)];
piezas["2026-11-13-anuncio-datiles-carozo-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Dátiles con carozo 1 kg $10.900 historia`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:200px 50px 250px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:24px;font:800 30px Fig;letter-spacing:.2em;color:var(--amarillo)">DE LOS MÁS PEDIDOS DE LA TIENDA</div>
<h1 style="font-size:110px;margin-top:12px;line-height:.98">Dátiles<br><span style="color:var(--amarillo)">con carozo</span></h1>
<div style="margin-top:30px">${datFotos(560)}</div>
<div style="font:800 40px Fig;margin-top:22px">Bolsa de 1 kg</div>
<div style="font:800 168px/1.02 Brico;color:var(--amarillo);letter-spacing:-.03em">$10.900</div>
<div style="font:800 40px Fig"><span style="background:#fff;color:var(--verde);padding:4px 18px;border-radius:12px">8% menos por transferencia</span></div>
${btn(960, 92, 40, "Pedilos: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:28px")}<div style="font:600 25px Fig;color:#C9D6CF;margin-top:12px">Sin compra mínima en Carlos Paz · ${PIE.split(":")[0]}</div></div></div>`)];

// ---------- JULI: 3 cosas que te preguntan (Trío) ----------
const QA = [["¿Tienen local? ¿Puedo retirar?", "Somos online, sin local: te lo llevamos a tu casa."], ["¿Cómo se paga?", "Antes de la entrega: transferencia (8% menos) o Mercado Pago."], ["¿Hay compra mínima?", "En Carlos Paz y la zona, no: envío $3.000 debajo de $20.000 y sin cargo desde $20.000. Otras localidades: mínimo $60.000 por correo."]];
const qa = (fq, fa, gap, bg, num) => QA.map(([q, a], i) => `<div style="display:flex;gap:22px;text-align:left;background:${bg};border-radius:28px;padding:${gap}px 30px;width:980px;margin-top:16px"><div style="flex:none;width:62px;height:62px;border-radius:50%;background:${num};color:#fff;font:800 36px/62px Brico;text-align:center">${i + 1}</div><div><div style="font:800 ${fq}px/1.1 Brico">${q}</div><div style="font:600 ${fa}px/1.28 Fig;margin-top:6px;color:#33473C">${a}</div></div></div>`).join("");
const TRIO = ["sem", "dat", "pas"];
piezas["2026-11-13-tres-preguntas-v2-post"] = [1080, 1350, doc(1080, 1350, `${NOTA} · Juli: 3 cosas que te preguntan v2 (preguntas reales de Agus) · Trío $21.500 / $19.700 transf.`, `<div class="c" style="background:var(--crema)"><div class="col" style="padding:0 50px"><div class="logo" style="font-size:30px">${logoV}Acopio Saludable</div>
<h1 style="font-size:86px;margin-top:10px;line-height:.98">3 cosas que<br><em>nos preguntan</em></h1>
<div style="margin-top:8px">${qa(40, 30, 26, "#fff", "var(--rojo)")}</div>
<div style="display:flex;gap:22px;align-items:center;margin-top:22px;width:980px;background:var(--verde);color:#fff;border-radius:28px;padding:18px 24px"><div style="display:flex;gap:8px">${TRIO.map(k => `<div class="foto" style="width:130px;height:130px;border-radius:18px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`).join("")}</div><div style="text-align:left"><div style="font:800 28px Fig">Para arrancar: Trío del desayuno</div><div style="font:600 21px Fig;color:#C9D6CF">Semillas, dátiles con carozo y pasas · 1 kg c/u</div><div style="font:800 54px/1.05 Brico;color:var(--amarillo)">$21.500 <span style="font:800 26px Fig;color:#fff">· $19.700 transf.</span></div></div></div>
<div style="margin-top:20px">${btn(960, 80, 36, "Consultanos: WhatsApp 3541 51-9630")}</div></div></div>`)];
piezas["2026-11-13-tres-preguntas-v2-historia"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Juli: 3 cosas que te preguntan v2 historia`, `<div class="c" style="background:var(--crema)"><div class="col" style="padding:200px 50px 250px"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:92px;margin-top:12px;line-height:.98">3 cosas que<br><em>nos preguntan</em></h1>
<div style="margin-top:20px">${qa(40, 29, 22, "#fff", "var(--rojo)")}</div>
<div style="margin-top:30px;width:980px;background:var(--verde);color:#fff;border-radius:32px;padding:26px 30px"><div style="font:800 34px Fig">Para arrancar: Trío del desayuno</div><div style="font:600 26px Fig;color:#C9D6CF;margin-top:4px">Mix de semillas, dátiles con carozo y pasas · 1 kg c/u</div><div style="display:flex;gap:12px;justify-content:center;margin-top:16px">${TRIO.map(k => `<div class="foto" style="width:200px;height:140px;border-radius:22px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`).join("")}</div><div style="font:800 96px/1.05 Brico;color:var(--amarillo);margin-top:12px">$21.500</div><div style="font:800 34px Fig">$19.700 por transferencia</div></div>
${btn(960, 92, 40, "Consultanos: WhatsApp 3541 51-9630", "margin-top:28px")}</div></div>`)];

const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(piezas)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${src}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1; }).length, [w, h]);
  const bottom = await p.evaluate(() => Math.max(...[...document.querySelectorAll(".col > *")].map(e => e.getBoundingClientRect().bottom)));
  await p.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over, "fondo contenido:", Math.round(bottom), "/", h);
}
await nav.close();
