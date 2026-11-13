const { chromium } = require('playwright'); const fs = require('fs');
const PUB=require('path').resolve(__dirname, '../../public');
const R = JSON.parse(fs.readFileSync(PUB + '/herramientas/recetas.json','utf8'));
const img = (p) => `data:image/${p.endsWith('.webp')?'webp':'jpeg'};base64,` + fs.readFileSync(PUB+p).toString('base64');
const LOGO = fs.readFileSync(PUB + '/marca/acopio-logo-horizontal-negativo.svg','utf8');
const fotos = ['/img/reales/real-mix.jpg','/img/reales/real-datiles.jpg','/img/reales/real-almendras.jpg','/img/reales/real-semillas.jpg'];
const html = `<!doctype html><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1350px;background:#10251C;color:#fff;font-family:Inter,sans-serif;position:relative;overflow:hidden}
.g{position:absolute;inset:0 0 auto 0;height:560px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.g div{background-size:cover;background-position:center;opacity:.85}
.logo{position:absolute;left:70px;top:610px;width:330px}.logo svg{width:100%;height:auto}
h1{position:absolute;left:70px;right:70px;top:720px;font-size:96px;font-weight:900;letter-spacing:-3px;line-height:.98}
p{position:absolute;left:70px;right:90px;top:960px;font-size:30px;line-height:1.4;color:#d9e5dd}
ul{position:absolute;left:70px;right:70px;top:1110px;list-style:none;display:flex;flex-wrap:wrap;gap:10px}
li{background:#F7C948;color:#111;border-radius:30px;padding:10px 18px;font-weight:700;font-size:22px}
.f{position:absolute;left:70px;bottom:40px;font-size:24px;color:#F7C948;font-weight:700}</style>
<div class="g">${fotos.map(f=>`<div style="background-image:url('${img(f)}')"></div>`).join('')}</div>
<div class="logo">${LOGO}</div><h1>Recetario<br>Acopio</h1>
<p>${R.length} recetas con lo que comprás: medidas claras, paso a paso y el porqué de cada truco. Sin humo.</p>
<ul>${['Desayunos','Meriendas','Snacks sin horno','Leches y untables','Pan con semillas','Legumbres'].map(x=>`<li>${x}</li>`).join('')}</ul>
<div class="f">acopiosaludable.com/recetas · Villa Carlos Paz</div>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1350}});await p.setContent(html,{waitUntil:'load'});await p.waitForTimeout(200);await p.screenshot({path:PUB+'/img/recetas/tapa-recetario.jpg',type:'jpeg',quality:85});await b.close();})();
