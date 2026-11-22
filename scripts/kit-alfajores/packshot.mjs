// 21/11 (Santiago): fotos con el envase ORIGINAL (Natuzen y Trini), mejoradas con la marca de Acopio.
// Uso: node scripts/kit-alfajores/packshot.mjs tapitas|ddl|kit salida.webp|png
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/claude/acopio-saludable/x.js")("playwright");
import fs from "node:fs";
import path from "node:path";
const dir = path.dirname(new URL(import.meta.url).pathname);
const [,, modo, salida] = process.argv;
const b64 = (f) => "data:image/png;base64," + fs.readFileSync(path.join(dir, f)).toString("base64");
const caja = b64("hq_tapitas.png"), frasco = b64("hq_ddl.png");
const css = `*{margin:0;padding:0;box-sizing:border-box}body{width:1200px;height:1200px;overflow:hidden;font-family:Inter,"DejaVu Sans",sans-serif;background:radial-gradient(circle at 50% 36%,#FFFDF6,#F1E7D2 70%,#E7D9BB)}
.mesa{position:absolute;left:0;right:0;top:820px;height:380px;background:linear-gradient(#E9DBBC,#DCC79F)}
.p{position:absolute;filter:drop-shadow(0 30px 28px rgba(60,40,15,.32)) drop-shadow(0 6px 6px rgba(60,40,15,.18))}
.marca{position:absolute;top:36px;left:36px;background:#10251C;color:#F6F1E4;font-weight:800;font-size:30px;padding:14px 26px;border-radius:999px}
.sello{position:absolute;top:36px;right:36px;background:#0F6B4F;color:#fff;font-weight:800;font-size:28px;padding:14px 24px;border-radius:999px}
.banda{position:absolute;left:0;right:0;bottom:0;height:320px;background:linear-gradient(rgba(16,37,28,0),#10251C 42%)}
.txt{position:absolute;left:52px;right:52px;bottom:48px;color:#F6F1E4}
.chip{display:inline-block;background:#FFC83D;color:#10251C;font-weight:800;font-size:32px;padding:10px 20px;border-radius:14px}
h1{font-size:66px;font-weight:900;margin-top:14px;line-height:1.05;letter-spacing:-1px} .sub{font-size:32px;color:#FFC83D;margin-top:10px;font-weight:600}`;
const arriba = `<div class="marca">Acopio Saludable</div><div class="sello">Sin TACC</div><div class="banda"></div>`;
let cuerpo = `<div class="mesa"></div>`;
if (modo === "tapitas") {
  cuerpo += `<img class="p" src="${caja}" style="left:290px;top:150px;height:760px">` + arriba
    + `<div class="txt"><span class="chip">200 g · Natuzen</span><h1>Tapitas para alfajor sin TACC</h1><div class="sub">Rellenás y listo: sin horno</div></div>`;
} else if (modo === "ddl") {
  cuerpo += `<img class="p" src="${frasco}" style="left:410px;top:130px;height:800px">` + arriba
    + `<div class="txt"><span class="chip">400 g · Trini</span><h1>Dulce de leche con stevia</h1><div class="sub">Sin azúcar agregada · sin TACC</div></div>`;
} else {
  cuerpo += `<img class="p" src="${caja}" style="left:60px;top:300px;height:560px;transform:rotate(-5deg)">`
    + `<img class="p" src="${caja}" style="left:330px;top:290px;height:580px">`
    + `<img class="p" src="${frasco}" style="left:830px;top:300px;height:560px">` + arriba
    + `<div class="txt"><span class="chip">3 productos</span><h1>Kit alfajores sin TACC</h1><div class="sub">2 tapitas Natuzen + dulce de leche Trini con stevia</div></div>`;
}
const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1200, height: 1200 } });
await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${cuerpo}</body></html>`);
const png = salida.replace(/\.webp$/, ".png");
await p.screenshot({ path: png, type: "png" });
await br.close();
console.log(png);
