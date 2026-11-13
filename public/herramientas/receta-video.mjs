// Receta en video, horizontal (1920x1080, YouTube) y vertical (1080x1920, Reels/Shorts/TikTok), desde el recetario.
// Uso: node receta-video.mjs <slug|hoy> [salida]   (requiere playwright y ffmpeg)
// «hoy» elige la receta del día rotando el recetario. Los datos y las fotos salen de acopiosaludable.com.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SITIO = process.env.SITIO || "https://www.acopiosaludable.com";
const [, , pedido = "hoy", salida = "receta-video"] = process.argv;
const R = await (await fetch(`${SITIO}/herramientas/recetas.json`)).json();
const dia = Math.floor(Date.now() / 86400000);
const r = pedido === "hoy" ? R[dia % R.length] : R.find((x) => x.slug === pedido);
if (!r) throw new Error(`No existe la receta ${pedido}`);
const b64 = async (p) => { const res = await fetch(SITIO + p); if (!res.ok) return null; const t = res.headers.get("content-type") || "image/jpeg"; return `data:${t};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`; };
const foto = r.foto ? await b64(r.foto) : null;
const LOGO = await (await fetch(`${SITIO}/marca/acopio-logo-horizontal-negativo.svg`)).text();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const url = `acopiosaludable.com/recetas/${r.slug}`;

// Escenas: [html interior, segundos]
const escenas = [
  [`<div class="k">RECETA · ${esc(r.momento.toUpperCase())}</div><h1>${esc(r.titulo)}</h1><p class="baj">${esc(r.bajada)}</p><div class="chips"><span>⏱ ${r.minutos} min${r.espera ? " + " + esc(r.espera) : ""}</span><span>🍽 ${esc(r.rinde)}</span></div>`, 5],
  [`<div class="k">INGREDIENTES</div><ul class="ing">${r.ingredientes.map((i) => `<li class="${i.codigo ? "a" : ""}"><b>${esc(i.cantidad)}</b> ${esc(i.que)}</li>`).join("")}</ul><div class="nota">● fraccionado en el día en Acopio</div>`, 3 + r.ingredientes.length * 1.1],
  ...r.pasos.map((p, i) => [`<div class="k">PASO ${i + 1} DE ${r.pasos.length}</div><div class="num">${i + 1}</div><p class="paso">${esc(p)}</p>`, Math.max(4.5, Math.min(9, p.length / 16))]),
  [`<div class="k">POR QUÉ FUNCIONA</div><ul class="cl">${r.claves.slice(0, 3).map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`, 9],
  [`<div class="k">CÓMO SE GUARDA</div><p class="paso">${esc(r.guardar)}</p>`, 5],
  [`<div class="k">LA RECETA COMPLETA</div><h1 class="u">${url}</h1><p class="baj">Todo lo que lleva, fraccionado en el día y entregado en Villa Carlos Paz. Si algo se nos terminó, te lo llevamos al día siguiente.</p>`, 6],
];

const css = (w, h) => {
  const v = h > w;
  return `*{margin:0;padding:0;box-sizing:border-box}body{width:${w}px;height:${h}px;overflow:hidden;font-family:Inter,sans-serif;color:#fff;background:#10251C;position:relative}
.bg{position:absolute;inset:0;${foto ? `background:url('${foto}') center/cover;filter:blur(${v ? 0 : 0}px) brightness(.38)` : "background:radial-gradient(circle at 75% 25%,#2d7a5a,#10251C 70%)"}}
.lado{position:absolute;${v ? "left:0;right:0;top:0;height:42%" : "right:0;top:0;bottom:0;width:40%"};${foto ? `background:url('${foto}') center/cover` : "display:none"}}
.box{position:absolute;${v ? "left:70px;right:70px;top:46%;bottom:200px" : "left:110px;top:150px;bottom:150px;width:52%"};display:flex;flex-direction:column;justify-content:center}
.logo{position:absolute;${v ? "left:70px;top:60px" : "left:110px;top:56px"};width:${v ? 300 : 280}px;background:rgba(16,37,28,.85);border-radius:22px;padding:12px 18px}.logo svg{width:100%;height:auto;display:block}
.k{color:#F7C948;font-weight:800;letter-spacing:5px;font-size:${v ? 34 : 30}px;margin-bottom:22px}
h1{font-weight:900;font-size:${v ? 92 : 88}px;line-height:1.02;letter-spacing:-2px;text-wrap:balance}h1.u{font-size:${v ? 58 : 60}px;color:#F7C948;word-break:break-all}
.baj{margin-top:26px;font-size:${v ? 40 : 36}px;line-height:1.35;color:#dbe8e0}
.chips{margin-top:30px;display:flex;gap:14px;flex-wrap:wrap}.chips span{background:#F7C948;color:#111;border-radius:40px;padding:12px 24px;font-weight:800;font-size:${v ? 32 : 28}px}
.ing{list-style:none;font-size:${v ? 40 : 38}px;line-height:1.3}.ing li{margin-bottom:14px}.ing li.a:before{content:'● ';color:#F7C948}.ing li:not(.a):before{content:'○ ';color:#8aa}
.nota{margin-top:18px;font-size:26px;color:#cfe3d8}
.num{font-size:${v ? 200 : 180}px;font-weight:900;color:#F7C948;line-height:1}.paso{font-size:${v ? 56 : 54}px;line-height:1.28;font-weight:600;margin-top:10px}
.cl{list-style:none;font-size:${v ? 42 : 40}px;line-height:1.32}.cl li{margin-bottom:26px;padding-left:46px;position:relative}.cl li:before{content:'→';position:absolute;left:0;color:#F7C948}
.pie{position:absolute;left:0;right:0;bottom:0;height:${v ? 120 : 90}px;background:#F7C948;color:#10251C;display:flex;align-items:center;justify-content:space-between;padding:0 ${v ? 60 : 110}px;font-weight:800;font-size:${v ? 32 : 30}px}`;
};
const html = (w, h, interior) => `<!doctype html><meta charset="utf-8"><style>${css(w, h)}</style><div class="bg"></div><div class="lado"></div><div class="logo">${LOGO}</div><div class="box">${interior}</div><div class="pie"><span>Acopio Saludable · Villa Carlos Paz</span><span>${w > h ? url : "acopiosaludable.com/recetas"}</span></div>`;

const b = await chromium.launch();
mkdirSync(salida, { recursive: true });
for (const [nombre, w, h] of [["horizontal", 1920, 1080], ["vertical", 1080, 1920]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const lista = [];
  for (let i = 0; i < escenas.length; i++) {
    await p.setContent(html(w, h, escenas[i][0]), { waitUntil: "load" });
    await p.waitForTimeout(150);
    const png = join(salida, `${nombre}-${String(i).padStart(2, "0")}.png`);
    await p.screenshot({ path: png });
    lista.push([png, escenas[i][1]]);
  }
  await p.close();
  // Cada escena con un zoom lento y fundido entre escenas.
  const partes = [];
  for (const [png, seg] of lista) {
    const mp4 = png.replace(".png", ".mp4");
    const fr = Math.round(seg * 30);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-i", png, "-vf", `scale=${w * 2}:${h * 2},zoompan=z='min(zoom+0.0004,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${fr}:s=${w}x${h}:fps=30,fade=t=in:st=0:d=0.35,fade=t=out:st=${(seg - 0.35).toFixed(2)}:d=0.35,format=yuv420p`, "-t", String(seg), "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "24", mp4]);
    partes.push(`file '${mp4.split("/").pop()}'`);
  }
  writeFileSync(join(salida, `${nombre}.txt`), partes.join("\n"));
  const final = join(salida, `receta-${r.slug}-${nombre}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(salida, `${nombre}.txt`), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest", "-c:v", "copy", "-c:a", "aac", "-movflags", "+faststart", final]);
  console.log(final);
}
await b.close();
// Con AGENTE_CLAVE, sube los dos mp4 al almacén y devuelve las URLs públicas para programarlos.
if (process.env.AGENTE_CLAVE) {
  const { readFileSync } = await import("node:fs");
  for (const nombre of ["horizontal", "vertical"]) {
    const archivo = join(salida, `receta-${r.slug}-${nombre}.mp4`);
    const res = await fetch(`${SITIO}/api/admin/agentes/imagen`, { method: "POST", headers: { "content-type": "application/json", "x-agente-clave": process.env.AGENTE_CLAVE }, body: JSON.stringify({ nombre: `receta-${r.slug}-${nombre}`, tipo: "video/mp4", datos: readFileSync(archivo).toString("base64") }) });
    console.log(nombre, "URL:", (await res.json()).url ?? res.status);
  }
}
const titulo = `${r.titulo} | Receta fácil paso a paso`;
writeFileSync(join(salida, `receta-${r.slug}.txt`), [
  `TÍTULO: ${titulo}`,
  `DESCRIPCIÓN:\n${r.bajada}\n\nIngredientes:\n${r.ingredientes.map((i) => `• ${i.cantidad} ${i.que}`).join("\n")}\n\nPaso a paso:\n${r.pasos.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\nPor qué funciona:\n${r.claves.map((c) => `→ ${c}`).join("\n")}\n\nCómo se guarda: ${r.guardar}\n\nLa receta completa y todo lo que lleva, fraccionado en el día: https://www.${url}\nAcopio Saludable · Villa Carlos Paz, Córdoba`,
  `ETIQUETAS: receta fácil, ${r.titulo.toLowerCase()}, ${r.momento.toLowerCase()}, recetas saludables, frutos secos, cocina casera, Villa Carlos Paz`,
].join("\n\n"));
