// Piezas del 10/11/2026 (Lucas). Fotos reales: real-pasas recortada y aclarada (fuentes/2026-11-10-pasas-cerca-foto.jpg) y dátiles en plato (fuentes/2026-11-04-datiles-plato-foto.jpg).
// Precios verificados en /lista-precios.csv de la web el 10/11: pasas 1 kg $5.900, dátiles con carozo 1 kg $10.900.
// Combo Paula: pasas 2 kg + dátiles 1 kg = $22.700; transferencia 8% menos = $20.884 → $20.900.
// Uso: node scripts/piezas-2026-11-10.mjs → HTML editable en fuentes/ y JPG en marketing/.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const logoA = logoV.replace(/#10251C/g, "#FFC83D").replace(/fill="#fff"/, 'fill="#10251C"');
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center}.foto img{width:100%;height:100%;object-fit:cover;display:block}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const et = `<div class="et" style="background:var(--amarillo);color:var(--verde)">Foto real</div>`;
const btn = (w, h, t, txt = "WhatsApp 3541 51-9630", st = "") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px;${st}">${wa}${txt}</div>`;
const PAS = "2026-11-10-pasas-cerca-foto.jpg", DAT = "2026-11-04-datiles-plato-foto.jpg";

const piezas = {};
// Juli 9/11 pedido 1 (ALTA mar 10/11): Faltan 44, pasas, «el pan dulce casero empieza acá».
piezas["2026-11-10-faltan-44-historia"] = [1080, 1920, doc(1080, 1920, "Lucas 10/11/2026 · Juli: Faltan 44, pasas 1 kg $5.900 verificado 10/11. Foto real-pasas recortada y aclarada", `<div class="c" style="background:#10251C"><div class="col" style="padding:220px 60px 0;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:22px;font:800 36px Fig;letter-spacing:.3em;color:var(--amarillo)">FALTAN</div><div style="font:800 220px/1 Brico;color:var(--amarillo);letter-spacing:-.04em">44</div><div style="font:800 66px Brico;letter-spacing:-.02em">días para Nochebuena</div>
<div style="font:800 54px/1.08 Brico;margin-top:34px">El pan dulce casero<br><span style="color:var(--amarillo)">empieza acá</span></div>
<div class="foto" style="width:960px;height:540px;margin-top:26px"><img src="${PAS}" style="object-position:50% 40%">${et}</div>
<div style="display:flex;align-items:baseline;gap:22px;margin-top:22px;white-space:nowrap"><span style="font:800 46px Fig">Pasas sin semilla 1 kg</span><span style="font:800 104px/1.05 Brico;color:var(--amarillo);letter-spacing:-.03em">$5.900</span></div>
${btn(960, 92, 40, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}<div style="font:600 27px Fig;color:#C9D6CF;margin-top:12px">Sin compra mínima en Carlos Paz · Pagás antes de la entrega</div></div></div>`)];

// Paula 9/11: anuncio pan dulce v02 SIN NUEZ.
const panDulce = (w, h) => {
  const alto = h === 1920, fh = alto ? 640 : 590;
  return doc(w, h, `Lucas 10/11/2026 · Paula: anuncio pan dulce sin nuez ${w}x${h}; pasas 2 kg ($5.900 x 2) + dátiles 1 kg ($10.900) = $22.700 / $20.900 transf., verificados 10/11. No se publica hasta que vuelva Meta.`, `<div class="c" style="background:var(--crema)"><div class="col" style="padding:${alto ? 200 : 54}px 50px 0"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:${alto ? 104 : 92}px;margin-top:18px;line-height:1">Lo de tu<br><em>pan dulce casero</em></h1>
<div style="display:flex;gap:16px;margin-top:26px"><div class="foto" style="width:482px;height:${fh}px"><img src="${PAS}" style="object-position:50% 45%">${et}</div><div class="foto" style="width:482px;height:${fh}px"><img src="${DAT}" style="object-position:40% 50%"></div></div>
<div style="display:flex;gap:16px;width:980px;margin-top:12px;font:800 ${alto ? 36 : 32}px Fig"><div style="flex:1">Pasas sin semilla 2 kg</div><div style="flex:1">Dátiles con carozo 1 kg</div></div>
<div style="font:800 ${alto ? 130 : 112}px/1 Brico;color:var(--rojo);letter-spacing:-.03em;margin-top:${alto ? 34 : 18}px">$22.700</div>
<div style="font:800 ${alto ? 42 : 38}px Fig;margin-top:6px"><span style="background:var(--amarillo);padding:4px 16px;border-radius:12px">$20.900 por transferencia</span></div>
<div style="margin-top:${alto ? 40 : 22}px">${btn(960, 84, 38)}</div><div style="font:600 ${alto ? 27 : 24}px Fig;color:var(--gris);margin-top:12px">Envío sin cargo en Carlos Paz y la zona · Se paga antes de la entrega</div></div></div>`);
};
piezas["2026-11-10-anuncio-pan-dulce-pasas-datiles-1350"] = [1080, 1350, panDulce(1080, 1350)];
piezas["2026-11-10-anuncio-pan-dulce-pasas-datiles-1920"] = [1080, 1920, panDulce(1080, 1920)];

// Juli 9/11 pedido 2 (mié 11/11): «3 cosas que te preguntan», con las preguntas de respaldo (Agus no las pasó todavía).
const qa = (n, q, a) => `<div style="display:flex;gap:26px;text-align:left;width:960px;margin-top:48px"><div style="flex:none;width:84px;height:84px;border-radius:50%;background:var(--amarillo);color:var(--verde);font:800 50px/84px Brico;text-align:center">${n}</div><div><div style="font:800 52px/1.05 Brico;color:#10251C">${q}</div><div style="font:600 31px/1.3 Fig;color:#2c3a33;margin-top:10px">${a}</div></div></div>`;
piezas["2026-11-10-tres-preguntas-post"] = [1080, 1350, doc(1080, 1350, "Lucas 10/11/2026 · Juli: post mié 11/11 «3 cosas que te preguntan», preguntas de respaldo; condiciones de la política 3/11", `<div class="c" style="background:var(--crema)"><div class="col" style="padding:110px 60px 0"><div class="logo">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:22px">Lo que más nos preguntan</div>
<h1 style="font-size:84px;margin-top:14px;line-height:1">3 cosas que<br><em>te preguntan</em></h1>
${qa(1, "¿Hay compra mínima?", "En Carlos Paz y la zona, no. Envío $3.000 si el pedido no llega a $20.000, y sin cargo desde $20.000. Otras localidades: mínimo $60.000 por correo.")}
${qa(2, "¿Cómo se paga?", "Antes de la entrega: por transferencia (8% menos) o con Mercado Pago.")}
${qa(3, "¿Llegan a mi barrio?", "Repartimos en Carlos Paz y la zona. Pasanos tu barrio por WhatsApp y te confirmamos.")}
<div style="margin-top:40px">${btn(960, 88, 38, "WhatsApp 3541 51-9630", "background:#10251C;color:#fff")}</div><div style="font:600 26px Fig;color:var(--gris);margin-top:12px">acopiosaludable.com</div></div></div>`)];

const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(piezas)) {
  const src = `${DIR}fuentes/${base}.html`;
  writeFileSync(src, html);
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${src}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1; }).length, [w, h]);
  const fondo = await p.evaluate(() => Math.max(0, ...[...document.querySelectorAll(".col > *")].map(e => e.getBoundingClientRect().bottom)));
  await p.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over, "fin y=", Math.round(fondo));
}
await nav.close();
