// Gráfica de la promo semanal (1080×1080) para la plantilla de WhatsApp.
// Uso: node scripts/grafica-promo.mjs datos.json salida.jpg
// datos.json: { "etiqueta": "PROMO DE LA SEMANA", "nombre": "Mix clásico con cajú", "detalle": "x 500 g",
//               "precio": "$6.500", "antes": "$9.400", "foto": "/ruta/foto.png" o "https://…", "pie": "Hasta el domingo 29/11" }
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // el playwright global del entorno
import fs from "node:fs";
import path from "node:path";

const [, , entrada, salida = "promo.jpg"] = process.argv;
const d = JSON.parse(fs.readFileSync(entrada, "utf8"));
const raiz = path.dirname(new URL(import.meta.url).pathname);
const logo = fs.readFileSync(path.join(raiz, "../public/marca/acopio-logo-horizontal-negativo.svg"), "utf8");
const foto = /^https?:/.test(d.foto) ? d.foto : `data:image/png;base64,${fs.readFileSync(d.foto).toString("base64")}`;
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;font-family:Inter,"DejaVu Sans",sans-serif;background:#10251C;color:#F6F1E4;overflow:hidden}
.foto{position:absolute;inset:0 0 360px 0;background:url("${foto}") center/cover}
.foto:after{content:"";position:absolute;inset:auto 0 0 0;height:180px;background:linear-gradient(transparent,#10251C)}
.chip{position:absolute;top:48px;left:48px;background:#FFC83D;color:#10251C;font-weight:800;font-size:34px;letter-spacing:2px;padding:14px 26px;border-radius:999px}
.desc{position:absolute;top:44px;right:48px;background:#0F6B4F;color:#fff;font-weight:800;font-size:44px;padding:18px 26px;border-radius:24px;display:${d.descuento ? "block" : "none"}}
.abajo{position:absolute;left:56px;right:56px;bottom:56px}
.nombre{font-size:66px;font-weight:800;line-height:1.05}
.detalle{font-size:36px;opacity:.8;margin-top:10px}
.precios{display:flex;align-items:baseline;gap:28px;margin-top:22px}
.precio{font-size:120px;font-weight:900;color:#FFC83D;line-height:1}
.antes{font-size:48px;text-decoration:line-through;opacity:.6}
.pie{display:flex;justify-content:space-between;align-items:center;margin-top:30px;font-size:30px;opacity:.9}
.pie svg{height:56px;width:auto}
</style></head><body>
<div class="foto"></div>
<div class="chip">${esc(d.etiqueta || "PROMO DE LA SEMANA")}</div>
<div class="desc">${esc(d.descuento || "")}</div>
<div class="abajo">
  <div class="nombre">${esc(d.nombre)}</div>
  <div class="detalle">${esc(d.detalle || "")}</div>
  <div class="precios"><div class="precio">${esc(d.precio)}</div>${d.antes ? `<div class="antes">${esc(d.antes)}</div>` : ""}</div>
  <div class="pie"><span>${esc(d.pie || "Te lo llevamos a tu casa")}</span>${logo}</div>
</div></body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
await p.setContent(html, { waitUntil: "networkidle" });
await p.screenshot({ path: salida, type: "jpeg", quality: 88 });
await b.close();
console.log(salida);
