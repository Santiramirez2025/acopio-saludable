// Piezas del 7/11/2026 (Lucas). Fotos: cuadro del clip crudo de la Despensa armada (video/tomas) y public/img/reales.
// Uso: node scripts/piezas-2026-11-07.mjs  → HTML editable en fuentes/ y JPG en marketing/. MOLDE_ = solo HTML, sin publicar.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync } from "node:fs";
const DIR = new URL("../public/img/marketing/", import.meta.url).pathname;
const pas = readFileSync(DIR + "fuentes/2026-11-05-pasas-historia.html", "utf8");
const logoV = pas.match(/<svg.*?<\/svg>/s)[0];
const wa = pas.match(/<div class="btn"[^>]*>(<svg.*?<\/svg>)/s)[1];
const logoA = logoV.replace(/#10251C/g, "#FFC83D").replace(/fill="#fff"/, 'fill="#10251C"');
const doc = (w, h, nota, b) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="acopio-piezas.css"><style>body,.c{width:${w}px;height:${h}px}.col{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center}</style></head><body><!-- ${nota} -->${b}</body></html>`;
const et = `<div class="et" style="background:var(--amarillo);color:var(--verde)">Foto real</div>`;
const btn = (w, h, t, txt = "WhatsApp 3541 51-9630", st = "") => `<div class="btn" style="width:${w}px;height:${h}px;font-size:${t}px;${st}">${wa}${txt}</div>`;
const pago = (t) => `<div style="font:600 ${t}px Fig;color:var(--gris);margin-top:12px">Pagás antes de la entrega: transferencia o Mercado Pago</div>`;
const chips = (t) => `<div class="chips" style="gap:12px"><span class="chip a" style="font-size:${t}px;padding:12px 26px">Sin compra mínima en Carlos Paz</span><span class="chip v" style="font-size:${t}px;padding:12px 26px">Entrega sin cargo desde $20.000</span></div>`;

const piezas = {
  // Juli E9: historia mix de semillas 1 kg, foto real distinta, UNA pregunta grande. Hueco libre para el sticker nativo de preguntas.
  "2026-11-07-semillas-pregunta-historia": [1080, 1920, doc(1080, 1920, "Lucas 07/11/2026 · Juli E9; precio en catálogo 7/11 ($5.200). Hueco 300-560 para el sticker de preguntas de Instagram", `<div class="c" style="background:var(--crema)"><div class="col" style="padding:230px 50px 0"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:112px;margin-top:26px;white-space:nowrap">¿Con qué lo <em>comés</em>?</h1><div style="font:700 44px Fig;margin-top:14px;color:var(--gris)">Respondé esta historia</div>
<div style="height:250px"></div>
<div class="foto" style="width:980px;height:560px"><img class="real" src="2026-11-07-semillas-bolsa-foto.jpg" style="object-position:60% 55%">${et}</div>
<div style="display:flex;align-items:baseline;gap:22px;margin-top:20px;white-space:nowrap"><span style="font:800 54px Fig">Mix de semillas 1 kg</span><span style="font:800 104px/1 Brico;color:var(--rojo);letter-spacing:-.03em">$5.200</span></div>
<div style="margin-top:18px"><span class="chip a" style="font-size:32px;padding:12px 28px">Sin compra mínima en Carlos Paz</span></div><div style="margin-top:20px">${btn(960, 92, 40)}</div>${pago(26)}</div></div>`)],
  // Juli: Faltan 47 con pasas + precio, cierra en WhatsApp. Sin nuez, almendra ni Kit; sin fecha de entrega.
  "2026-11-07-faltan-47-historia": [1080, 1920, doc(1080, 1920, "Lucas 07/11/2026 · Juli: cuenta regresiva con producto + precio; precio en catálogo 7/11 ($5.900)", `<div class="c" style="background:#10251C"><div class="col" style="padding:230px 60px 0;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:26px;font:800 36px Fig;letter-spacing:.3em;color:var(--amarillo)">FALTAN</div><div style="font:800 250px/1 Brico;color:var(--amarillo);letter-spacing:-.04em">47</div><div style="font:800 74px Brico;letter-spacing:-.02em">días para Nochebuena</div>
<div class="foto" style="width:960px;height:520px;margin-top:30px"><img class="real" src="../../reales/real-pasas.jpg" style="transform:scale(1.25);object-position:40% 60%">${et}</div>
<div style="font:800 50px Brico;margin-top:24px;white-space:nowrap">Las pasas de tu pan dulce casero</div>
<div style="display:flex;align-items:baseline;gap:22px;margin-top:6px;white-space:nowrap"><span style="font:800 54px Fig">1 kg</span><span style="font:800 130px/1.05 Brico;color:var(--amarillo);letter-spacing:-.03em">$5.900</span></div>
${btn(960, 92, 40, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}<div style="font:600 26px Fig;color:#C9D6CF;margin-top:12px">Sin compra mínima en Carlos Paz · Pagás antes de la entrega</div></div></div>`)],
};

const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(piezas)) {
  writeFileSync(`${DIR}fuentes/${base}.html`, html);
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${DIR}fuentes/${base}.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1 || (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).display !== "inline"); }).length, [w, h]);
  const fondo = await p.evaluate(() => Math.max(...[...document.querySelectorAll(".col > *")].map(e => e.getBoundingClientRect().bottom)));
  await p.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over, "último elemento termina en y=", Math.round(fondo));
}
await nav.close();
