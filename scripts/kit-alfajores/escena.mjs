import { createRequire } from "node:module";
const { chromium } = createRequire("/home/claude/acopio-saludable/x.js")("playwright");
import fs from "node:fs";
const [,, modo, salida] = process.argv; // modo: kit | tapitas | escena
const ddl = "data:image/png;base64," + fs.readFileSync("/tmp/kit/ddl.png").toString("base64");
const tapa = (x, y, s = 1) => `<div class="pl" style="left:${x}px;top:${y}px;transform:scale(${s})"></div>`;
const alfajor = (x, y, s = 1) => `<div class="alf" style="left:${x}px;top:${y}px;transform:scale(${s})"><div class="t1"></div><div class="dl"></div><div class="t2"></div></div>`;
const pila = (x, y, n) => Array.from({ length: n }, (_, i) => `<div class="pl" style="left:${x}px;top:${y - i * 15}px"></div>`).join("");
const css = `*{margin:0;padding:0;box-sizing:border-box}body{width:1200px;height:1200px;overflow:hidden;font-family:Inter,"DejaVu Sans",sans-serif;background:radial-gradient(circle at 50% 38%,#FBF6EA,#EFE5CF 75%)}
.mesa{position:absolute;left:0;right:0;top:760px;height:440px;background:linear-gradient(#E6D6B4,#D9C49C)}
.tapa{position:absolute;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#F7E3B5,#E9C98A 62%,#D7AE68);box-shadow:inset 0 0 0 7px rgba(200,150,80,.35),inset 0 -8px 14px rgba(150,100,40,.25),0 14px 22px -10px rgba(80,50,20,.45)}
.tapa:after{content:"";position:absolute;inset:26px;border-radius:50%;border:3px dotted rgba(180,130,60,.35)}
.pl{position:absolute;width:230px;height:62px;border-radius:50%;background:linear-gradient(#F3DCA8,#DDB574);box-shadow:inset 0 -6px 0 rgba(170,120,60,.45),0 6px 10px -6px rgba(80,50,20,.5)}
.alf{position:absolute;width:220px;height:120px}
.alf .t1,.alf .t2{position:absolute;left:0;width:220px;height:70px;border-radius:50%;background:linear-gradient(#F6E2B0,#DFB877)}
.alf .t1{top:50px;box-shadow:0 10px 14px -8px rgba(80,50,20,.5)} .alf .t2{top:0;box-shadow:inset 0 -5px 0 rgba(170,120,60,.4)}
.alf .dl{position:absolute;left:6px;top:38px;width:208px;height:44px;border-radius:50%;background:linear-gradient(#9A5A22,#6E3A12)}
.frasco{position:absolute;filter:drop-shadow(0 28px 26px rgba(60,35,15,.35))}
.marca{position:absolute;top:36px;left:36px;background:#10251C;color:#F6F1E4;font-weight:800;font-size:30px;padding:14px 26px;border-radius:999px}
.sello{position:absolute;top:36px;right:36px;background:#0F6B4F;color:#fff;font-weight:800;font-size:28px;padding:14px 24px;border-radius:999px}
.banda{position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(transparent,#10251C 38%)}
.txt{position:absolute;left:52px;right:52px;bottom:48px;color:#F6F1E4}
.chip{display:inline-block;background:#FFC83D;color:#10251C;font-weight:800;font-size:32px;padding:10px 20px;border-radius:14px}
h1{font-size:64px;font-weight:900;margin-top:14px;line-height:1.05} .sub{font-size:32px;color:#FFC83D;margin-top:10px;font-weight:600}`;
let cuerpo = `<div class="mesa"></div>`;
if (modo === "tapitas") {
  cuerpo += pila(110, 760, 12) + pila(380, 800, 8) + alfajor(640, 720, 1.25) + alfajor(820, 860, 1.05) + tapa(600, 900, 1)
    + `<div class="marca">Acopio Saludable</div><div class="sello">Sin TACC</div><div class="banda"></div><div class="txt"><span class="chip">200 g · Natuzen</span><h1>Tapitas para alfajor sin TACC</h1><div class="sub">Rellenás y listo: sin horno</div></div>`;
} else {
  cuerpo += pila(110, 720, 9) + pila(300, 760, 7) + alfajor(170, 800, 1) + alfajor(380, 840, 0.95) + tapa(560, 830, 0.8)
    + `<img class="frasco" src="${ddl}" style="left:640px;top:250px;height:${modo === "escena" ? 640 : 600}px">`;
  if (modo === "kit") cuerpo += `<div class="marca">Acopio Saludable</div><div class="sello">Sin TACC</div><div class="banda"></div><div class="txt"><span class="chip">3 productos</span><h1>Kit alfajores sin TACC</h1><div class="sub">2 tapitas Natuzen + dulce de leche Trini con stevia</div></div>`;
}
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 1200 } });
await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${cuerpo}</body></html>`);
await p.screenshot({ path: salida, type: salida.endsWith(".png") ? "png" : "jpeg", quality: salida.endsWith(".png") ? undefined : 90 });
await b.close();
