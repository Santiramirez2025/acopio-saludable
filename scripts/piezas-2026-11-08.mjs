// Piezas del 8/11/2026 (Lucas). Fotos: cuadros del video real licuado-datiles (tomas.json, ia:false), sin texto quemado.
// Uso: node scripts/piezas-2026-11-08.mjs  → HTML editable en fuentes/ y JPG en marketing/.
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

const piezas = {
  // Juli 7/11, pedido 1: Faltan 46 con producto + precio, foto distinta de la semana, cierre WhatsApp. Dátiles (no depende de la almendra).
  "2026-11-08-faltan-46-historia": [1080, 1920, doc(1080, 1920, "Lucas 08/11/2026 · Juli: cuenta regresiva con producto + precio; dátiles 1 kg $10.900 verificado en la web 8/11. Foto: cuadro 0,05 s de licuado-1 (video real)", `<div class="c" style="background:#10251C"><div class="col" style="padding:230px 60px 0;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:22px;font:800 36px Fig;letter-spacing:.3em;color:var(--amarillo)">FALTAN</div><div style="font:800 230px/1 Brico;color:var(--amarillo);letter-spacing:-.04em">46</div><div style="font:800 70px Brico;letter-spacing:-.02em">días para Nochebuena</div>
<div class="foto" style="width:960px;height:560px;margin-top:28px"><img class="real" src="2026-11-08-datiles-licuadora-foto.jpg" style="object-position:50% 52%">${et}</div>
<div style="font:800 48px Brico;margin-top:24px;white-space:nowrap">Del licuado de hoy a la mesa dulce</div>
<div style="display:flex;align-items:baseline;gap:22px;margin-top:6px;white-space:nowrap"><span style="font:800 50px Fig">Dátiles con carozo 1 kg</span><span style="font:800 108px/1.05 Brico;color:var(--amarillo);letter-spacing:-.03em">$10.900</span></div>
${btn(960, 92, 40, "Pedilo: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:14px")}<div style="font:600 26px Fig;color:#C9D6CF;margin-top:12px">Sin compra mínima en Carlos Paz · Pagás antes de la entrega</div></div></div>`)],
  // Juli 7/11, pedido 2 (lun 9/11, reemplazo de la Despensa) + encargo dátiles 3/11: post 1080x1350 con producto asegurado.
  "2026-11-08-datiles-licuado-post": [1080, 1350, doc(1080, 1350, "Lucas 08/11/2026 · post de reemplazo lun 9/11; dátiles 1 kg $10.900 verificado en la web 8/11. Foto: cuadro 0,05 s de licuado-5 (video real)", `<div class="c" style="background:var(--crema)"><div class="col" style="padding:60px 50px 0"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:92px;margin-top:16px;line-height:1">Endulzá tu licuado<br>con <em>dátiles</em></h1>
<div class="foto" style="width:980px;height:600px;margin-top:26px"><img class="real" src="2026-11-08-datiles-licuadora-2-foto.jpg" style="object-position:50% 52%">${et}</div>
<div style="display:flex;align-items:baseline;gap:22px;margin-top:18px;white-space:nowrap"><span style="font:800 50px Fig">Dátiles con carozo 1 kg</span><span style="font:800 100px/1 Brico;color:var(--rojo);letter-spacing:-.03em">$10.900</span></div>
<div class="chips" style="gap:12px;margin-top:16px"><span class="chip a" style="font-size:28px;padding:10px 24px">Sin compra mínima en Carlos Paz</span><span class="chip v" style="font-size:28px;padding:10px 24px">Entrega sin cargo desde $20.000</span></div>
<div style="margin-top:16px">${btn(960, 84, 38)}</div><div style="font:600 24px Fig;color:var(--gris);margin-top:10px">Pagás antes de la entrega: transferencia (8% menos) o Mercado Pago</div></div></div>`)],
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
