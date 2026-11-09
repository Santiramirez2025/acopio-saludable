// Piezas del 9/11/2026 (Lucas). Fotos reales: public/img/reales (pasas, semillas, nuez) y cuadros de crudo-datiles-cajon-egipto.mp4.
// Precios verificados en la ficha de la web el 9/11: pasas 1 kg $5.900, mix semillas 1 kg $5.200, nuez 1 kg $20.500, dátiles 1 kg $10.900.
// Uso: node scripts/piezas-2026-11-09.mjs  → HTML editable en fuentes/ y JPG en marketing/ (ML en img/ml/).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const ML = new URL("../public/img/ml/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const logoA = logoV.replace(/#10251C/g, "#FFC83D").replace(/fill="#fff"/, 'fill="#10251C"');
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center}.foto img{width:100%;height:100%;object-fit:cover;display:block}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const et = `<div class="et" style="background:var(--amarillo);color:var(--verde)">Foto real</div>`;
const btn = (w, h, t, txt = "WhatsApp 3541 51-9630", st = "") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px;${st}">${wa}${txt}</div>`;
const pie = (c = "var(--gris)", s = 24) => `<div style="font:600 ${s}px Fig;color:${c};margin-top:10px">Pagás antes de la entrega: transferencia (8% menos) o Mercado Pago</div>`;

const piezas = {
  // Juli 8/11 pedido 1: pasas, «La que más se llevan».
  "2026-11-09-pasas-mas-pedida-post": [1080, 1350, DIR, doc(1080, 1350, "Lucas 09/11/2026 · Juli: pasas 1 kg $5.900 verificado en la ficha 9/11. Foto real-pasas (recorte sin el rótulo quemado)", `<div class="c" style="background:var(--crema)"><div class="col" style="padding:56px 50px 0"><div class="logo">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:20px">La que más se llevan</div>
<h1 style="font-size:88px;margin-top:16px;line-height:1">Pasas de uva negras<br><em>sin semilla</em></h1>
<div class="foto" style="width:980px;height:560px;margin-top:24px"><img src="2026-11-09-pasas-foto.jpg" style="object-position:50% 35%">${et}</div>
<div style="display:flex;align-items:baseline;gap:22px;margin-top:16px;white-space:nowrap"><span style="font:800 54px Fig">1 kg</span><span style="font:800 104px/1 Brico;color:var(--rojo);letter-spacing:-.03em">$5.900</span></div>
<div class="chips" style="gap:12px;margin-top:14px"><span class="chip a" style="font-size:27px;padding:10px 22px">Sin compra mínima en Carlos Paz</span><span class="chip v" style="font-size:27px;padding:10px 22px">Envío sin cargo desde $20.000</span></div>
<div style="margin-top:16px">${btn(960, 84, 38, "WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde)")}</div>${pie()}</div></div>`)],
  // Juli 8/11 pedido 2: Faltan 45, mix de semillas.
  "2026-11-09-faltan-45-historia": [1080, 1920, DIR, doc(1080, 1920, "Lucas 09/11/2026 · Juli: Faltan 45 con mix de semillas 1 kg $5.200 verificado 9/11. Foto real-semillas", `<div class="c" style="background:#10251C"><div class="col" style="padding:230px 60px 0;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:22px;font:800 36px Fig;letter-spacing:.3em;color:var(--amarillo)">FALTAN</div><div style="font:800 230px/1 Brico;color:var(--amarillo);letter-spacing:-.04em">45</div><div style="font:800 70px Brico;letter-spacing:-.02em">días para Nochebuena</div>
<div class="foto" style="width:960px;height:560px;margin-top:28px"><img src="2026-11-09-semillas-foto.jpg" style="object-position:50% 40%">${et}</div>
<div style="font:800 48px Brico;margin-top:24px;white-space:nowrap">Para el desayuno de todos los días</div>
<div style="display:flex;align-items:baseline;gap:22px;margin-top:6px;white-space:nowrap"><span style="font:800 50px Fig">Mix de semillas 1 kg</span><span style="font:800 108px/1.05 Brico;color:var(--amarillo);letter-spacing:-.03em">$5.200</span></div>
${btn(960, 92, 40, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}<div style="font:600 26px Fig;color:#C9D6CF;margin-top:12px">Sin compra mínima en Carlos Paz · Pagás antes de la entrega</div></div></div>`)],
};

// Paula 8/11: anuncio «Lo de tu pan dulce casero», nuez 1 kg + pasas 1 kg = $26.400; transf. 8% menos = $24.288 → $24.300.
const panDulce = (w, h) => {
  const alto = h === 1920;
  const fh = alto ? 640 : 590;
  return doc(w, h, `Lucas 09/11/2026 · Paula: anuncio pan dulce casero ${w}x${h}; nuez $20.500 + pasas $5.900 verificados en la ficha 9/11. NO PUBLICAR hasta que Juli/Ana liberen la nuez (control físico) y vuelva Meta.`, `<div class="c" style="background:var(--crema)"><div class="col" style="padding:${alto ? 200 : 54}px 50px 0"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:${alto ? 104 : 92}px;margin-top:18px;line-height:1">Lo de tu<br><em>pan dulce casero</em></h1>
<div style="display:flex;gap:16px;margin-top:26px"><div class="foto" style="width:482px;height:${fh}px"><img src="2026-11-09-nuez-foto.jpg" style="height:calc(100% + 120px);object-position:50% 0">${et}</div><div class="foto" style="width:482px;height:${fh}px"><img src="2026-11-09-pasas-foto.jpg" style="height:calc(100% + 120px);object-position:50% 0"></div></div>
<div style="display:flex;gap:16px;width:980px;margin-top:12px;font:800 ${alto ? 36 : 32}px Fig"><div style="flex:1">Nuez mariposa 1 kg</div><div style="flex:1">Pasas sin semilla 1 kg</div></div>
<div style="font:800 ${alto ? 130 : 112}px/1 Brico;color:var(--rojo);letter-spacing:-.03em;margin-top:${alto ? 34 : 18}px">$26.400</div>
<div style="font:800 ${alto ? 42 : 38}px Fig;margin-top:6px"><span style="background:var(--amarillo);padding:4px 16px;border-radius:12px">$24.300 por transferencia</span></div>
<div style="margin-top:${alto ? 40 : 22}px">${btn(960, 84, 38)}</div><div style="font:600 ${alto ? 27 : 24}px Fig;color:var(--gris);margin-top:12px">Envío sin cargo en Carlos Paz y la zona · se paga antes de la entrega</div></div></div>`);
};
piezas["2026-11-09-anuncio-pan-dulce-nuez-pasas-1350"] = [1080, 1350, DIR, panDulce(1080, 1350)];
piezas["2026-11-09-anuncio-pan-dulce-nuez-pasas-1920"] = [1080, 1920, DIR, panDulce(1080, 1920)];

// Diego 8/11: fotos ML dátiles 5 kg, 1200x1200, sin textos de contacto, precio ni origen. Solo logo chico.
const ml = (src, pos, nota, extra = "") => doc(1200, 1200, `Lucas 09/11/2026 · ML dátiles 5 kg (Diego): ${nota}`, `<div class="c" style="background:#fff"><div class="foto" style="position:absolute;inset:0;border-radius:0"><img src="${src}" style="object-position:${pos}"></div>${extra}<div style="position:absolute;right:28px;bottom:28px;background:rgba(255,255,255,.92);border-radius:999px;padding:10px 22px"><div class="logo" style="font-size:26px">${logoV}Acopio Saludable</div></div></div>`);
piezas["datiles-5kg-1"] = [1200, 1200, ML, (ml("2026-11-09-datiles-cajon-1-foto.jpg", "50% 45%", "foto principal, cuadro 1,3 s de crudo-datiles-cajon-egipto (cajón real)"))];
piezas["datiles-5kg-2"] = [1200, 1200, ML, (ml("2026-11-09-datiles-cajon-2-foto.jpg", "50% 50%", "cantidad: cajón a granel, cuadro 5,5 s"))];
piezas["datiles-5kg-3"] = [1200, 1200, ML, (ml("2026-11-09-datil-abierto-foto.jpg", "60% 48%", "dátil abierto en la mano, cuadro 3,3 s"))];

const nav = await chromium.launch();
for (const [base, [w, h, out, html]] of Object.entries(piezas)) {
  const src = out === ML ? `${DIR}fuentes/2026-11-09-ml-${base}.html` : `${DIR}fuentes/${base}.html`;
  writeFileSync(src, html);
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${src}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1; }).length, [w, h]);
  const fondo = await p.evaluate(() => Math.max(0, ...[...document.querySelectorAll(".col > *")].map(e => e.getBoundingClientRect().bottom)));
  await p.screenshot({ path: `${out}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over, "fin y=", Math.round(fondo));
}
await nav.close();
