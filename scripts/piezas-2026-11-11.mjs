// Piezas del 11/11/2026 (Lucas). Solo fotos reales de fuentes/: dátiles en plato (2026-11-04), semillas en bolsa sola (2026-11-09, recortada abajo para sacar el rótulo viejo), pasas de cerca (2026-11-10).
// Precios verificados en /lista-precios.csv de la web el 11/11: dátiles con carozo 1 kg $10.900, mix de semillas 1 kg $5.200, pasas 1 kg $5.900.
// Paula (orden 10/11): dátiles 2 kg + semillas 2 kg = $32.200; transferencia 8% menos = $29.624 → $29.600.
// Tomi (orden 10/11): fotos 4:3 sin precio para los combos trio-del-desayuno y pan-dulce-casero.
// Uso: node scripts/piezas-2026-11-11.mjs → HTML editable en fuentes/, JPG en marketing/ y WebP 4:3 en img/combos/v3/.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const COMBOS = new URL("../public/img/combos/v3/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const logoA = logoV.replace(/#10251C/g, "#FFC83D").replace(/fill="#fff"/, 'fill="#10251C"');
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center}.foto img{width:100%;height:100%;object-fit:cover;display:block}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const et = (t = "Foto real") => `<div class="et" style="background:var(--amarillo);color:var(--verde)">${t}</div>`;
const btn = (w, h, t, txt = "WhatsApp 3541 51-9630", st = "") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px;${st}">${wa}${txt}</div>`;
const DAT = "2026-11-04-datiles-plato-foto.jpg", SEM = "2026-11-11-semillas-bolsa-sola-foto.jpg", PAS = "2026-11-10-pasas-cerca-foto.jpg";

const piezas = {};
// 1) Paula: «Licuados y bowls de la semana» v01. Misión de compra (guía AdSpyder 2026: combos armados por misión, no un producto suelto).
const licuados = (w, h) => {
  const alto = h === 1920, fh = alto ? 700 : 560;
  return doc(w, h, `Lucas 11/11/2026 · Paula: licuados y bowls v01 ${w}x${h}; dátiles 2 kg (2 x $10.900) + semillas 2 kg (2 x $5.200) = $32.200 / $29.600 transf., verificados 11/11. No se publica hasta que vuelva Meta.`, `<div class="c" style="background:var(--crema)"><div class="col" style="padding:${alto ? 200 : 54}px 50px 0"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:${alto ? 100 : 88}px;margin-top:18px;line-height:1">4 kilos para tus<br><em>licuados y bowls</em></h1>
<div style="display:flex;gap:16px;margin-top:26px"><div class="foto" style="width:482px;height:${fh}px"><img class="real" src="${DAT}" style="object-position:35% 40%">${et()}</div><div class="foto" style="width:482px;height:${fh}px"><img class="real" src="${SEM}" style="object-position:50% 50%"></div></div>
<div style="display:flex;gap:16px;width:980px;margin-top:12px;font:800 ${alto ? 36 : 32}px Fig"><div style="flex:1">Dátiles con carozo 2 kg</div><div style="flex:1">Mix de semillas 2 kg</div></div>
<div style="font:800 ${alto ? 130 : 112}px/1 Brico;color:var(--rojo);letter-spacing:-.03em;margin-top:${alto ? 34 : 18}px">$32.200</div>
<div style="font:800 ${alto ? 42 : 38}px Fig;margin-top:6px"><span style="background:var(--amarillo);padding:4px 16px;border-radius:12px">$29.600 por transferencia</span></div>
<div style="margin-top:${alto ? 40 : 22}px">${btn(960, 84, 38)}</div><div style="font:600 ${alto ? 27 : 24}px Fig;color:var(--gris);margin-top:12px">Envío sin cargo en Carlos Paz y la zona · Se paga antes de la entrega</div></div></div>`);
};
piezas["2026-11-11-anuncio-licuados-bowls-1350"] = [1080, 1350, licuados(1080, 1350)];
piezas["2026-11-11-anuncio-licuados-bowls-1920"] = [1080, 1920, licuados(1080, 1920)];

// 2) Faltan 43 (propuesta para Juli, sigue la serie): dátiles con carozo 1 kg $10.900. Pieza de dátiles del encargo 3/11 actualizada.
piezas["2026-11-11-faltan-43-historia"] = [1080, 1920, doc(1080, 1920, "Lucas 11/11/2026 · Faltan 43, dátiles con carozo 1 kg $10.900 verificado 11/11. Foto real dátiles en plato.", `<div class="c" style="background:#10251C"><div class="col" style="padding:220px 60px 0;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:22px;font:800 36px Fig;letter-spacing:.3em;color:var(--amarillo)">FALTAN</div><div style="font:800 220px/1 Brico;color:var(--amarillo);letter-spacing:-.04em">43</div><div style="font:800 66px Brico;letter-spacing:-.02em">días para Nochebuena</div>
<div style="font:800 54px/1.08 Brico;margin-top:34px">Dátiles para el pan dulce<br><span style="color:var(--amarillo)">y la mesa dulce</span></div>
<div class="foto" style="width:960px;height:540px;margin-top:26px"><img class="real" src="${DAT}" style="object-position:40% 35%">${et()}</div>
<div style="display:flex;align-items:baseline;gap:22px;margin-top:22px;white-space:nowrap"><span style="font:800 46px Fig">Dátiles con carozo 1 kg</span><span style="font:800 104px/1.05 Brico;color:var(--amarillo);letter-spacing:-.03em">$10.900</span></div>
${btn(960, 92, 40, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}<div style="font:600 27px Fig;color:#C9D6CF;margin-top:12px">Sin compra mínima en Carlos Paz · Pagás antes de la entrega</div></div></div>`)];

// 3) Tomi: fotos 4:3 de combos, sin precio ni texto de venta (solo qué trae).
const portada = (fotos) => doc(1200, 900, "Lucas 11/11/2026 · Tomi: portada 4:3 de combo, sin precio", `<div class="c" style="background:var(--crema);padding:28px;display:flex;gap:16px">${fotos.map(([src, pos, txt]) => `<div class="foto" style="flex:1;height:844px"><img class="real" src="${src}" style="object-position:${pos}"><div class="et" style="font-size:30px;padding:10px 22px">${txt}</div></div>`).join("")}</div>`);
const combos = {
  "trio-del-desayuno": portada([[SEM, "50% 50%", "Semillas 1 kg"], [DAT, "35% 40%", "Dátiles 1 kg"], [PAS, "50% 45%", "Pasas 1 kg"]]),
  "pan-dulce-casero": portada([[PAS, "50% 45%", "Pasas sin semilla 2 kg"], [DAT, "35% 40%", "Dátiles con carozo 1 kg"]]),
};

const nav = await chromium.launch();
const render = async (src, w, h, out, type) => {
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${src}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1; }).length, [w, h]);
  await p.screenshot({ path: out, type, quality: 85 });
  console.log(out.split("/").pop(), "desbordes:", over);
};
for (const [base, [w, h, html]] of Object.entries(piezas)) {
  const src = `${DIR}fuentes/${base}.html`; writeFileSync(src, html);
  await render(src, w, h, `${DIR}${base}.jpg`, "jpeg");
}
for (const [slug, html] of Object.entries(combos)) {
  const src = `${DIR}fuentes/2026-11-11-combo-${slug}-portada.html`; writeFileSync(src, html);
  await render(src, 1200, 900, `${DIR}fuentes/2026-11-11-combo-${slug}-portada.jpg`, "jpeg");
}
await nav.close();
