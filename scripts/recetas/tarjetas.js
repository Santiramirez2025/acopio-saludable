const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const PUB = require('path').resolve(__dirname, '../../public');
const R = JSON.parse(fs.readFileSync(PUB + '/herramientas/recetas.json','utf8'));
const img = (p) => { const ext = p.endsWith('.webp') ? 'webp' : 'jpeg'; return `data:image/${ext};base64,` + fs.readFileSync(path.join(PUB, p)).toString('base64'); };
const LOGO = fs.readFileSync(PUB + '/marca/acopio-logo-horizontal-negativo.svg','utf8');
const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const html = (r) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1350px;background:#F4F0E6;font-family:Inter,sans-serif;color:#10251C;position:relative;overflow:hidden}
.ph{position:absolute;left:40px;top:40px;width:1000px;height:400px;border-radius:32px;${r.foto?`background:url('${img(r.foto)}') center/cover`:'background:radial-gradient(circle at 80% 20%,#2d7a5a,#10251C 70%)'}}
.ph .big{position:absolute;left:60px;right:60px;top:150px;color:#F7C948;font-weight:900;font-size:64px;letter-spacing:-1.5px;line-height:1}.ph .sub{position:absolute;left:62px;top:110px;color:#cfe3d8;font-size:22px;letter-spacing:3px;font-weight:700}
.logo{position:absolute;left:64px;top:64px;background:rgba(16,37,28,.88);border-radius:22px;padding:12px 20px;width:250px}.logo svg{width:100%;height:auto;display:block}
.badge{position:absolute;right:64px;top:68px;background:#F7C948;color:#111;border-radius:40px;padding:12px 22px;font-weight:800;font-size:24px}
.meta{position:absolute;left:64px;top:372px;display:flex;gap:10px}
.meta span{background:#10251C;color:#fff;border-radius:16px;padding:9px 16px;font-size:21px;font-weight:600}
.k{position:absolute;left:60px;top:462px;font-weight:800;letter-spacing:3px;color:#1B6B4F;font-size:22px}
h1{text-wrap:balance;position:absolute;left:60px;right:60px;top:494px;font-weight:900;font-size:${r.titulo.length>38?50:58}px;letter-spacing:-1.5px;line-height:1.02}
.cols{position:absolute;left:60px;right:60px;top:${r.titulo.length>34?640:590}px;bottom:200px;display:grid;grid-template-columns:350px 1fr;gap:34px}
h2{font-size:21px;letter-spacing:2.5px;color:#1B6B4F;font-weight:800;margin-bottom:10px}
.ing li{list-style:none;font-size:var(--fs);line-height:1.28;margin-bottom:7px}.ing b{color:#10251C}
.ing li.a{color:#10251C}.ing li.a:before{content:'● ';color:#F7C948}
.ing li.n:before{content:'○ ';color:#bbb}
ol{counter-reset:p}ol li{list-style:none;counter-increment:p;font-size:var(--fs);line-height:1.3;margin-bottom:9px;padding-left:44px;position:relative}
ol li:before{content:counter(p);position:absolute;left:0;top:-1px;width:31px;height:31px;border-radius:50%;background:#10251C;color:#F7C948;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center}
.clave{position:absolute;left:40px;right:40px;bottom:112px;background:#10251C;color:#fff;border-radius:24px;padding:18px 26px;font-size:21px;line-height:1.32}
.clave b{color:#F7C948}
.f{position:absolute;left:0;right:0;bottom:0;height:84px;display:flex;justify-content:space-between;align-items:center;padding:0 60px;font-size:23px;color:#10251C}
.f b{color:#1B6B4F}
</style></head><body>
<div class="ph">${r.foto?"":`<div class="sub">INGREDIENTE ESTRELLA</div><div class="big">${esc((r.ingredientes.find(i=>i.codigo)||r.ingredientes[0]).que)}</div>`}</div><div class="logo">${LOGO}</div><div class="badge">Receta · ${r.dificultad}</div>
<div class="meta"><span>⏱ ${r.minutos} min${r.espera?' + espera':''}</span><span>🍽 ${esc(r.rinde)}</span></div>
<div class="k">${r.momento.toUpperCase()}</div><h1>${esc(r.titulo)}</h1>
<div class="cols"><div><h2>INGREDIENTES</h2><ul class="ing">${r.ingredientes.map(i=>`<li class="${i.codigo?'a':'n'}"><b>${esc(i.cantidad)}</b> ${esc(i.que)}</li>`).join('')}</ul></div>
<div><h2>PASO A PASO</h2><ol>${r.pasos.map(p=>`<li>${esc(p)}</li>`).join('')}</ol></div></div>
<div class="clave"><b>La clave:</b> ${esc(r.claves[0])}${r.claves[1]?`<br><b>Truco:</b> ${esc(r.claves[1])}`:""}</div>
<div class="f"><span><span style="color:#F7C948">●</span> = lo tenemos en Acopio · fraccionado en el día</span><b>acopiosaludable.com/recetas</b></div>
</body></html>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  fs.mkdirSync(PUB + '/img/recetas', { recursive: true });
  for (const r of R.filter(r => !process.argv[2] || r.slug === process.argv[2])) {
    await p.setContent(html(r), { waitUntil: 'load' }); await p.waitForTimeout(200);
    for (let fs_ = 26; fs_ >= 17; fs_ -= 0.5) { await p.evaluate((v) => document.body.style.setProperty('--fs', v + 'px'), fs_); const o = await p.evaluate(() => { const cl = document.querySelector('.clave').getBoundingClientRect().top; return [...document.querySelectorAll('.cols li')].some(l => l.getBoundingClientRect().bottom > cl - 24); }); if (!o) break; }
    const over = await p.evaluate(() => { const c = document.querySelector('.cols'); const cl = document.querySelector('.clave').getBoundingClientRect().top; return [...c.querySelectorAll('li')].some(l => l.getBoundingClientRect().bottom > cl - 8); });
    await p.screenshot({ path: `${PUB}/img/recetas/${r.slug}.jpg`, type: 'jpeg', quality: 85 });
    console.log(r.slug, over ? 'DESBORDA' : 'ok');
  }
  await b.close();
})();
