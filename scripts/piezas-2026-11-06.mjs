// Piezas del 6/11/2026 (Lucas). Fotos: cuadros de los clips en crudo de Santiago (5/11) y public/img/reales.
// Uso: node scripts/piezas-2026-11-06.mjs  → HTML editable en fuentes/ y JPG en marketing/. MOLDE_ = solo HTML, sin publicar.
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
const producto = (nom, sub, foto, pos, precio, nota, extra = "") => doc(1080, 1920, nota, `<div class="c" style="background:var(--crema)"><div class="col" style="padding:230px 50px 0"><div class="logo">${logoV}Acopio Saludable</div>
<h1 style="font-size:100px;margin-top:22px;white-space:nowrap">${nom}</h1>${sub ? `<div style="font:700 40px Fig;margin-top:8px;color:var(--gris)">${sub}</div>` : ""}
<div class="foto" style="width:980px;height:640px;margin-top:22px"><img class="real" src="${foto}" style="object-position:${pos}">${et}</div>
<div style="display:flex;align-items:baseline;gap:24px;margin-top:14px"><span style="font:800 66px Fig">1 kg</span><span style="font:800 160px/1.05 Brico;color:var(--rojo);letter-spacing:-.03em">${precio}</span></div>${extra}
<div style="margin-top:12px;width:100%">${chips(32)}</div><div style="margin-top:20px">${btn(960, 92, 40)}</div>${pago(26)}</div></div>`);

const lista = (t, g) => [["Dátiles con carozo"], ["Mix de semillas"], ["Mix con cajú y girasol"], ["Pasas de uva"]].map(([n]) => `<div style="display:flex;align-items:baseline;gap:14px;font:700 ${t}px/1.1 Fig;margin-bottom:${g}px;text-align:left"><b style="font:800 ${t}px Brico;color:var(--rojo);white-space:nowrap">1 kg</b>${n}</div>`).join("");

const piezas = {
  // Juli: historia producto + precio, otra foto que la del 4/11
  "2026-11-06-datiles-cajon-historia": [1080, 1920, producto("Dátiles con carozo", "de Egipto", "2026-11-06-datiles-cajon-foto.jpg", "50% 30%", "$10.900", "Lucas 06/11/2026 · pedido de Juli, foto nueva del clip 5/11; precio en ficha 6/11")],
  // Juli: Faltan 48, semillas, sin precio ni fecha de entrega
  "2026-11-06-faltan-48-historia": [1080, 1920, doc(1080, 1920, "Lucas 06/11/2026 · Juli: sin precio ni fecha de entrega", `<div class="c" style="background:#10251C"><div class="col" style="padding:230px 60px 0;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:30px;font:800 36px Fig;letter-spacing:.3em;color:var(--amarillo)">FALTAN</div><div style="font:800 280px/1 Brico;color:var(--amarillo);letter-spacing:-.04em">48</div><div style="font:800 78px Brico;letter-spacing:-.02em">días para Nochebuena</div>
<div class="foto" style="width:960px;height:560px;margin-top:30px"><img class="real" src="../../reales/real-semillas.jpg" style="transform:scale(1.15);object-position:50% 40%">${et}</div>
<div style="font:800 54px Brico;margin-top:26px;white-space:nowrap">Las semillas de tu pan casero.</div>${btn(960, 92, 40, "Escribinos: 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:24px")}</div></div>`)],
  // Paula: «¿Qué te llevás con $28.500?» + condiciones del encargo 3/11
  "2026-11-06-anuncio-con-28500-1080": [1080, 1080, doc(1080, 1080, "Lucas 06/11/2026 · pedido de Paula; ficha combos/despensa-4-kilos", `<div class="c"><div style="position:absolute;left:44px;right:44px;top:34px"><div class="logo" style="font-size:28px">${logoV}Acopio Saludable</div><h1 style="font-size:76px;margin-top:14px;white-space:nowrap">¿Qué te llevás con <em>$28.500</em>?</h1></div>
<div class="foto" style="position:absolute;left:44px;top:210px;width:480px;height:600px"><img class="real" src="2026-11-06-despensa-4-bolsas-foto.jpg" style="object-position:50% 58%">${et}</div>
<div style="position:absolute;left:556px;right:40px;top:226px">${lista(40, 26)}<div style="margin-top:26px;background:var(--verde);color:#fff;border-radius:24px;padding:18px 24px;font:800 36px/1.15 Fig">4 kilos en total<br><span style="color:var(--amarillo)">$26.200 por transferencia</span></div></div>
<div style="position:absolute;left:40px;right:40px;top:832px;text-align:center"><div class="chips" style="gap:10px;flex-wrap:nowrap"><span class="chip a" style="font-size:28px;padding:11px 20px">Sin compra mínima en Carlos Paz</span><span class="chip v" style="font-size:28px;padding:11px 20px">Entrega sin cargo desde $20.000</span></div>
<div style="display:flex;justify-content:center;margin-top:14px">${btn(960, 76, 36)}</div><div style="font:600 24px Fig;color:var(--gris);margin-top:10px">Pagás antes de la entrega: transferencia o Mercado Pago</div></div></div>`)],
  "2026-11-06-anuncio-con-28500-1920": [1080, 1920, doc(1080, 1920, "Lucas 06/11/2026 · pedido de Paula; ficha combos/despensa-4-kilos", `<div class="c"><div class="col" style="padding:230px 50px 0"><div class="logo">${logoV}Acopio Saludable</div><h1 style="font-size:104px;margin-top:18px;line-height:1">¿Qué te llevás<br>con <em>$28.500</em>?</h1>
<div style="display:flex;gap:24px;margin-top:26px;width:980px"><div class="foto" style="width:500px;height:680px;flex:none"><img class="real" src="2026-11-06-despensa-4-bolsas-foto.jpg" style="object-position:50% 58%">${et}</div><div style="padding-top:22px">${lista(44, 30)}</div></div>
<div style="margin-top:22px;background:var(--verde);color:#fff;border-radius:24px;padding:14px 40px;font:800 44px Fig">4 kilos · <span style="color:var(--amarillo)">$26.200 por transferencia</span></div><div style="margin-top:18px">${chips(32)}</div><div style="margin-top:16px">${btn(960, 88, 40)}</div>${pago(26)}</div></div>`)],
};
// Juli, lun 9/11: «3 kilos, $22.000»
const tres = [["real-pasas", "Pasas de uva", "$5.900"], ["real-datiles", "Dátiles con carozo", "$10.900"], ["real-semillas", "Mix de semillas", "$5.200"]];
const fila = (h, t) => tres.map(([f, n, p]) => `<div style="flex:1;min-width:0"><div class="foto" style="height:${h}px;border-radius:24px"><img class="real" src="../../reales/${f}.jpg" style="transform:scale(1.4);object-position:55% 40%"></div><div style="font:800 ${t}px/1.1 Fig;margin-top:12px">1 kg ${n}</div><div style="font:800 ${t + 6}px Brico;color:var(--rojo);margin-top:4px">${p}</div></div>`).join("");
const sumas = (t) => `<div style="background:var(--amarillo);border-radius:26px;padding:20px 28px;font:800 ${t}px/1.15 Fig">Sumás $6.500 y es la Despensa de $28.500<div style="font:600 ${Math.round(t * .72)}px Fig;margin-top:6px">te llevás además 1 kg de mix con cajú y girasol</div></div>`;
const tresDoc = (w, h, top, foto, ht, s) => doc(w, h, "Lucas 06/11/2026 · Juli, sale lun 9/11; rechequear precios ese día", `<div class="c"><div class="col" style="padding:${top}px 50px 0"><div class="logo">${logoV}Acopio Saludable</div><h1 style="font-size:${ht}px;margin-top:16px;line-height:1">3 kilos, <em>$22.000</em></h1><div style="font:800 ${s}px Fig;margin-top:12px">Envío sin cargo en Carlos Paz y la zona</div>
<div style="display:flex;gap:18px;width:980px;margin-top:24px">${fila(foto, 32)}</div><div style="margin-top:24px;width:980px">${sumas(44)}</div><div style="margin-top:20px">${btn(960, 88, 40)}</div>${pago(26)}</div></div>`);
piezas["2026-11-06-tres-kilos-22000-post"] = [1080, 1350, tresDoc(1080, 1350, 44, 320, 130, 42)];
piezas["2026-11-06-tres-kilos-22000-historia"] = [1080, 1920, tresDoc(1080, 1920, 240, 500, 150, 46)];
// Molde sin publicar (Juli): hasta que confirmen almendra
writeFileSync(DIR + "fuentes/MOLDE_mix-con-caju-historia.html", producto("Mix con cajú", "sin girasol", "../../reales/real-mix.jpg", "50% 40%", "$12.500", "MOLDE, NO PUBLICAR hasta que confirmen almendra (Juli 5/11). $11.500 por transferencia; verificar el día", `<div style="font:800 38px Fig;color:var(--verde2)">$11.500 por transferencia</div>`));

const nav = await chromium.launch();
for (const [base, [w, h, html]] of Object.entries(piezas)) {
  writeFileSync(`${DIR}fuentes/${base}.html`, html);
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${DIR}fuentes/${base}.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll("h1,div,span")].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1 || (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).display !== "inline"); }).length, [w, h]);
  await p.screenshot({ path: `${DIR}${base}.jpg`, type: "jpeg", quality: 85 });
  console.log(base, "desbordes:", over);
}
await nav.close();
