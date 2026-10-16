// Cargar en el carrito de Distrimay lo que hay que comprar para los pedidos abiertos.
//
// La web de Distrimay no tiene API ni importación de pedidos, y el carrito vive encriptado en el
// navegador. Así que el botón (un marcador) usa la misma página, en la sesión de Santiago: busca
// cada código, toca 🛒 tantas veces como unidades hagan falta y deja el carrito listo.
// Finalizar la compra (pagar) lo hace él: el marcador nunca toca «Finalizar compra».
//
// Para pedir la lista desde distrimay.com no hay cookie del panel: va una clave derivada del
// secreto del sitio, que solo ve el administrador en la página de Compras y reparto.

import { createHmac, timingSafeEqual } from "node:crypto";

export function claveCompras(): string {
  const secreto = process.env.NEXTAUTH_SECRET ?? "";
  return createHmac("sha256", secreto).update("compras-distrimay").digest("hex").slice(0, 32);
}

export function claveComprasValida(k: string | null): boolean {
  if (!k || !process.env.NEXTAUTH_SECRET) return false;
  const a = Buffer.from(k);
  const b = Buffer.from(claveCompras());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** El marcador. Corre en compras.distrimay.com con la sesión de Santiago. */
export function codigoCargarDistrimay(sitio: string, clave: string): string {
  const cuerpo = `(async function(){try{
if(location.hostname!=='compras.distrimay.com'){alert('Abrí primero compras.distrimay.com (con tu sesión) y volvé a tocar el botón.');return}
var D=${JSON.stringify(sitio)},K=${JSON.stringify(clave)};
var r=await fetch(D+'/api/compras/distrimay?k='+K);var d=await r.json();if(!r.ok)throw new Error(d.error||('HTTP '+r.status));
if(!d.items.length){alert('No hay nada para comprar ahora.');return}
var lista=d.items.map(function(i){return i.cantidad+' x '+i.producto+' ('+i.codigo+')'}).join('\\n');
if(!confirm('Cargar en el carrito lo de '+d.pedidos.join(', ')+':\\n\\n'+lista+'\\n\\nSi el carrito tiene otras cosas, conviene vaciarlo antes.'))return;
var esperar=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
var falta=[];
for(var x=0;x<d.items.length;x++){var it=d.items[x];
location.hash='#/search/'+encodeURIComponent(it.codigo);var btn=null;
for(var t=0;t<50&&!btn;t++){await esperar(250);
var as=[].slice.call(document.querySelectorAll('a[href]')).filter(function(a){return a.getAttribute('href').replace(/\\/$/,'').split('/product/')[1]===it.codigo});
for(var j=0;j<as.length&&!btn;j++){var c=as[j];for(var k=0;k<8&&c&&!btn;k++){c=c.parentElement;if(c)btn=[].slice.call(c.querySelectorAll('button')).find(function(b){return /add_shopping_cart/.test(b.innerText)})||null}}}
if(!btn){falta.push(it.codigo+' '+it.producto);continue}
for(var n=0;n<it.cantidad;n++){btn.click();await esperar(400)}}
location.hash='#/home/cart';
alert(falta.length?'Cargué el resto, pero no encontré: '+falta.join(', ')+'. Agregalos a mano.':'Listo: carrito cargado. Revisalo, tocá Finalizar compra y después «Ya lo compré» en el panel de Acopio.');
}catch(e){alert('No se pudo cargar: '+e.message)}})();`;
  return `javascript:${encodeURIComponent(cuerpo.replace(/\n\s*/g, ""))}`;
}
