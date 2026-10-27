// Tarjeta imprimible 10x15 cm para los kits de bienvenida de cabañas (Flor / Lucas).
// Uso:  node scripts/tarjeta-cabana.mjs CODIGO [salida.html]
// Ej.:  node scripts/tarjeta-cabana.mjs SOL10  → tarjeta-cabana-SOL10.html
// Abrí el HTML en Chrome → Imprimir → tamaño 10x15 cm (o A4: entra una por hoja), márgenes "Ninguno".
// El QR abre WhatsApp 3541 51-9630 con «Hola, vengo de la cabaña, código CODIGO». Sin precios.
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";

const codigo = (process.argv[2] || "XXX10").trim().toUpperCase();
const salida = process.argv[3] || `tarjeta-cabana-${codigo}.html`;
const texto = `Hola, vengo de la cabaña, código ${codigo}`;
const url = `https://wa.me/5493541519630?text=${encodeURIComponent(texto)}`;

const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#10251C", light: "#0000" } });
const iso = `<svg viewBox="0 0 100 100" width="11mm" height="11mm"><circle cx="50" cy="50" r="50" fill="#10251C"/><g transform="translate(50,50) scale(.78) translate(-50,-50)"><g fill="#F6EFDC"><path transform="translate(36.7,50) rotate(23)" d="M0,-34 C17,-17 17,15 0,34 C-17,15 -17,-17 0,-34Z"/><path transform="translate(63.3,50) rotate(-23)" d="M0,-34 C17,-17 17,15 0,34 C-17,15 -17,-17 0,-34Z"/></g><circle cx="50" cy="68" r="8" fill="#F2C440"/></g></svg>`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tarjeta cabaña ${codigo}</title>
<style>
@page{size:100mm 150mm;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,"Helvetica Neue",Arial,sans-serif;color:#10251C;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.t{width:100mm;height:150mm;background:#F6EFDC;position:relative;overflow:hidden;padding:7mm 7mm 0;text-align:center}
.marca{display:flex;align-items:center;justify-content:center;gap:3mm;font-weight:800;font-size:5mm}
.chip{display:inline-block;margin-top:3.5mm;background:#10251C;color:#F2C440;font-weight:800;font-size:3mm;letter-spacing:.8mm;padding:1.6mm 4mm;border-radius:10mm}
h1{font-size:8.4mm;line-height:1;letter-spacing:-.3mm;font-weight:900;margin-top:3mm}
p.s{font-size:3.6mm;line-height:1.3;margin:2.5mm 2mm 0}
.qr{width:42mm;height:42mm;margin:4mm auto 0;padding:3mm;background:#fff;border-radius:4mm;box-shadow:0 .6mm 2mm rgba(0,0,0,.12)}
.qr svg{width:100%;height:100%;display:block}
.cod{margin-top:3.5mm;font-size:3.4mm;display:flex;align-items:center;justify-content:center;gap:1.5mm}
.cod b{display:inline-block;margin-left:1.5mm;font-size:5.6mm;letter-spacing:.6mm;border:.5mm dashed #10251C;padding:.8mm 3mm;border-radius:2mm;background:#fff}
.pie{position:absolute;left:0;right:0;bottom:0;background:#10251C;color:#F6EFDC;font-size:3.3mm;line-height:1.35;padding:3.2mm 6mm}
.pie strong{color:#F2C440}
</style></head><body>
<div class="t">
 <div class="marca">${iso}<span>Acopio Saludable</span></div>
 <span class="chip">BIENVENIDA A LAS SIERRAS</span>
 <h1>Un regalito para tu estadía</h1>
 <p class="s">Frutos secos, mixes y snacks sanos. Escaneá, pedí por WhatsApp y te lo llevamos a la cabaña.</p>
 <div class="qr">${qr}</div>
 <div class="cod">Tu código de huésped <b>${codigo}</b></div>
 <div class="pie"><strong>WhatsApp 3541 51-9630</strong> · acopiosaludable.com<br>Pagás al recibir · Envío sin cargo en Carlos Paz y la zona</div>
</div>
</body></html>`;

writeFileSync(salida, html);
console.log(`Listo: ${salida}\nQR → ${url}`);
