// Piezas del 14/11/2026 (Lucas). Precios verificados el 14/11 en /combos/despensa-4-kilos y /lista-precios.csv:
// Despensa de 4 kilos $28.500 (por separado $32.500, ahorrás $4.000) · $26.200 transf. · mix clásico con cajú y girasol $10.500 · dátiles con carozo $10.900 · pasas sin semilla $5.900 · mix de semillas $5.200 · nuez mariposa 1 kg $20.500.
// Paula: Despensa + nuez $49.000 / $45.100 transf. · Juli: carrusel «Qué trae la Despensa de 4 kilos» (6 placas, contador que suma hasta $32.500).
// Uso: node scripts/piezas-2026-11-14.mjs
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
  nuez: ["2026-11-09-nuez-foto.jpg", "50% 52%", "Nuez mariposa"],
};
const NOTA = "Lucas 14/11/2026 · precios verificados 14/11 en /combos/despensa-4-kilos y /lista-precios.csv · sin aprobar ni publicar";
const piezas = {};
const ft = (k, w, h, r = 26) => `<div class="foto" style="width:${w}px;height:${h}px;border-radius:${r}px"><img class="real" src="${F[k][0]}" style="object-position:${F[k][1]}"></div>`;
const tag = (k, fs) => `<div style="font:800 ${fs}px/1.12 Fig;margin-top:8px">${F[k][2]} <span style="color:var(--rojo)">1 kg</span></div>`;

// ---------- PAULA: Despensa + nuez para las fiestas ----------
const cinco = (big, sw, sh, gap) => `<div style="display:grid;grid-template-columns:${big}px repeat(2,${sw}px);gap:${gap}px;align-items:start">
<div style="grid-row:span 2"><div>${ft("nuez", big, sh * 2 + gap + 44, 30)}</div>${tag("nuez", 30)}</div>
${["mix", "dat", "pas", "sem"].map(k => `<div>${ft(k, sw, sh)}${tag(k, 22)}</div>`).join("")}</div>`;
const pieFiestas = (fs) => `<div style="font:700 ${fs}px Fig;color:var(--gris);margin-top:12px">Sin cargo en Carlos Paz y la zona · se paga antes de la entrega</div>`;
piezas["2026-11-14-anuncio-despensa-nuez-1350"] = [1080, 1350, doc(1080, 1350, `${NOTA} · Paula: Despensa + nuez $49.000 / $45.100 transf. 1080x1350`, `<div class="c" style="background:var(--crema)"><div class="col" style="padding:0 46px"><div class="logo" style="font-size:30px">${logoV}Acopio Saludable</div>
<div style="margin-top:16px" class="ceja">Despensa de 4 kilos + 1 kg de nuez</div>
<h1 style="font-size:88px;margin-top:14px;line-height:.96">5 kilos para la<br><em>mesa de fiestas</em></h1>
<div style="margin-top:24px">${cinco(400, 280, 220, 14)}</div>
<div style="font:800 128px/1 Brico;color:var(--rojo);letter-spacing:-.03em;margin-top:14px">$49.000</div>
<div style="font:800 36px Fig;margin-top:6px"><span style="background:var(--amarillo);padding:3px 18px;border-radius:12px">$45.100 por transferencia</span></div>
<div style="margin-top:20px">${btn(960, 82, 36, "Pedilos: WhatsApp 3541 51-9630")}</div>${pieFiestas(23)}</div></div>`)];
piezas["2026-11-14-anuncio-despensa-nuez-1920"] = [1080, 1920, doc(1080, 1920, `${NOTA} · Paula: Despensa + nuez historia 1080x1920`, `<div class="c" style="background:var(--verde)"><div class="col" style="padding:200px 50px 260px;color:#fff"><div class="logo" style="color:#fff">${logoA}Acopio Saludable</div>
<div style="margin-top:22px;font:800 28px Fig;letter-spacing:.18em;color:var(--amarillo)">DESPENSA DE 4 KILOS + 1 KG DE NUEZ</div>
<h1 style="font-size:104px;margin-top:12px;line-height:.96">5 kilos para la<br><span style="color:var(--amarillo)">mesa de fiestas</span></h1>
<div style="margin-top:30px">${cinco(440, 252, 250, 14).replace(/color:var\(--rojo\)/g, "color:var(--amarillo)")}</div>
<div style="font:800 160px/1.02 Brico;color:var(--amarillo);letter-spacing:-.03em;margin-top:16px">$49.000</div>
<div style="font:800 42px Fig"><span style="background:#fff;color:var(--verde);padding:4px 18px;border-radius:12px">$45.100 por transferencia</span></div>
${btn(960, 92, 40, "Pedilos: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:28px")}<div style="font:700 25px Fig;color:#C9D6CF;margin-top:12px">Sin cargo en Carlos Paz y la zona · se paga antes de la entrega</div></div></div>`)];

// ---------- JULI: carrusel «Qué trae la Despensa de 4 kilos» (6 placas 1080x1350) ----------
const PR = { mix: 10500, dat: 10900, pas: 5900, sem: 5200 };
const ORD = ["mix", "dat", "pas", "sem"];
const $ = n => "$" + n.toLocaleString("es-AR").replace(/,/g, ".");
const pag = (i) => `<div style="position:absolute;top:44px;right:50px;font:800 26px Fig;color:var(--gris)">${i}/6</div>`;
const swipe = `<div style="position:absolute;bottom:40px;right:50px;font:800 26px Fig;color:var(--gris)">Deslizá →</div>`;
const CAR = "2026-11-14-carrusel-despensa";
piezas[`${CAR}-1`] = [1080, 1350, doc(1080, 1350, `${NOTA} · Juli carrusel 1/6 portada`, `<div class="c" style="background:var(--crema)">${pag(1)}<div class="col" style="padding:0 50px"><div class="logo" style="font-size:30px">${logoV}Acopio Saludable</div>
<div class="ceja" style="margin-top:22px">Qué trae la Despensa</div>
<h1 style="font-size:116px;margin-top:18px;line-height:.94">4 kilos,<br>4 productos,<br><em>$28.500</em></h1>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;width:980px;margin-top:34px">${ORD.map(k => `<div>${ft(k, 236, 300, 24)}<div style="font:800 21px/1.15 Fig;margin-top:8px">${F[k][2]}</div></div>`).join("")}</div>
<div style="font:600 30px Fig;color:var(--gris);margin-top:26px">Un kilo de cada uno. Mirá lo que pagarías por separado →</div></div></div>`)];
let acum = 0;
ORD.forEach((k, i) => {
  acum += PR[k];
  piezas[`${CAR}-${i + 2}`] = [1080, 1350, doc(1080, 1350, `${NOTA} · Juli carrusel ${i + 2}/6 ${F[k][2]}`, `<div class="c" style="background:var(--crema)">${pag(i + 2)}<div class="col" style="padding:0 50px;justify-content:center"><div style="font:800 28px Fig;letter-spacing:.18em;color:var(--rojo)">PRODUCTO ${i + 1} DE 4</div>
<h1 style="font-size:${F[k][2].length > 22 ? 70 : 86}px;margin-top:12px;line-height:.98">${F[k][2]}</h1>
<div style="margin-top:26px">${ft(k, 980, 800, 34)}</div>
<div style="display:flex;justify-content:space-between;align-items:center;width:980px;margin-top:26px"><div style="text-align:left"><div style="font:800 34px Fig">1 kg suelto</div><div style="font:800 104px/1 Brico;color:var(--rojo);letter-spacing:-.03em">${$(PR[k])}</div></div>
<div style="background:var(--verde);color:#fff;border-radius:28px;padding:18px 28px;text-align:right"><div style="font:700 24px Fig;color:#C9D6CF">Por separado, vas sumando</div><div style="font:800 64px/1.05 Brico;color:var(--amarillo)">${$(acum)}</div></div></div></div>${i < 3 ? swipe : ""}</div>`)];
});
piezas[`${CAR}-6`] = [1080, 1350, doc(1080, 1350, `${NOTA} · Juli carrusel 6/6 cierre ahorro`, `<div class="c" style="background:var(--verde)">${pag(6).replace("var(--gris)", "#C9D6CF")}<div class="col" style="padding:0 50px;color:#fff"><div class="logo" style="color:#fff;font-size:30px">${logoA}Acopio Saludable</div>
<div style="font:700 40px Fig;color:#C9D6CF;margin-top:30px">Por separado</div>
<div style="font:800 100px/1 Brico;color:#C9D6CF;text-decoration:line-through;text-decoration-thickness:8px;text-decoration-color:var(--rojo)">$32.500</div>
<div style="font:800 46px Fig;margin-top:18px">En la Despensa de 4 kilos</div>
<div style="font:800 190px/1 Brico;color:var(--amarillo);letter-spacing:-.03em">$28.500</div>
<div style="background:var(--rojo);color:#fff;border-radius:999px;padding:12px 40px;font:800 50px Fig;margin-top:12px">Ahorrás $4.000</div>
<div style="font:800 40px Fig;margin-top:22px"><span style="background:#fff;color:var(--verde);padding:4px 18px;border-radius:12px">$26.200 por transferencia</span></div>
${btn(960, 88, 38, "Pedila: WhatsApp 3541 51-9630", "background:var(--amarillo);color:var(--verde);margin-top:36px")}
<div style="font:700 24px/1.4 Fig;color:#C9D6CF;margin-top:16px">Sin compra mínima en Carlos Paz y la zona · se paga antes de la entrega</div></div></div>`)];
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
