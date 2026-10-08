// Marcador ("bookmarklet") de sincronización de precios.
// Corre en el navegador del dueño, ya logueado en compras.distrimay.com: le pide el catálogo al sistema
// del proveedor con la sesión que ya está abierta y manda SOLO códigos, nombres y precios a la tienda.
// Nunca lee ni envía usuario, contraseña ni el token de sesión de Distrimay.

/**
 * Lectura del catálogo. `listSearch/0` devuelve todos los artículos; si alguna vez viene paginado,
 * se recorren las páginas. El costo es la lista de precios asignada al cliente (login.customer.listPrice);
 * sin sesión solo se leen precios públicos.
 */
export const CODIGO_LECTURA = `
async function leerDistrimay(){
  var B='https://backend.buhomanager.com:444',Q='?ecommerceAvailable=true&available=true';
  var tk=localStorage.getItem('token'),lista=0;
  try{lista=parseInt(JSON.parse(localStorage.getItem('login')).customer.listPrice,10)||0}catch(e){}
  var h={Accept:'application/json',client:'distrimay'};
  var conSesion=!!tk&&tk!=='null'&&lista>0;
  if(conSesion)h.token2X=tk;
  var pedir=async function(p){var r=await fetch(B+'/itemService/listSearch/'+p+Q,{headers:h});if(!r.ok)throw new Error('Distrimay respondió '+r.status);return r.json()};
  var j=await pedir(0),total=j.pagination?j.pagination.count:j.rows.length,m=new Map();
  var sumar=function(rows){rows.forEach(function(x){if(x&&x.sku!=null&&!m.has(String(x.sku)))m.set(String(x.sku),x)})};
  sumar(j.rows||[]);
  for(var p=1;m.size<total&&j.pagination&&p<=j.pagination.pages+1;p++)sumar((await pedir(p)).rows||[]);
  var campo=lista===1?'unitPrice':'unitPrice'+lista;
  return {modo:conSesion?'costos':'publicos',completo:m.size>=total,items:Array.from(m.values()).map(function(x){return{
    codigo:String(x.sku),producto:x.name||'',presentacion:x.description||'',categoria:x.departamentName||'',
    precioPublico:x.unitPrice>0?x.unitPrice:null,costo:conSesion&&x[campo]>0?x[campo]:null,fotos:x.photos||''}})};
}`;

export function codigoMarcador(sitio: string, token: string): string {
  const cuerpo = `(async function(){try{
if(location.hostname!=='compras.distrimay.com'){alert('Abrí primero compras.distrimay.com y volvé a tocar el marcador.');return}
${CODIGO_LECTURA}
var D=${JSON.stringify(sitio)},T=${JSON.stringify(token)};
var datos=await leerDistrimay();datos.origen='marcador';
var cuerpo=JSON.stringify(datos);
try{
  var r=await fetch(D+'/api/admin/price-sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+T},body:cuerpo});
  var o=await r.json();if(!r.ok)throw new Error(o.error||('HTTP '+r.status));
  alert('Acopio Saludable ('+datos.modo+'): '+o.resumen);window.open(D+'/admin/actualizaciones/'+o.id,'_blank');
}catch(e){
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([cuerpo],{type:'application/json'}));a.download='precios-distrimay.json';document.body.appendChild(a);a.click();a.remove();
  alert('No se pudo enviar a la tienda ('+e.message+'). Se descargó precios-distrimay.json: subilo en Panel → Actualizaciones.');
}
}catch(e){alert('No se pudieron leer los precios: '+e.message)}})();`;
  return `javascript:${encodeURIComponent(cuerpo.replace(/\n\s*/g, ""))}`;
}
