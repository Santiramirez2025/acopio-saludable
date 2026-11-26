import { test } from "node:test";
import assert from "node:assert/strict";
import { respuestaTransferencia, textoTransferirAlRecibir, textoDatosSinApuro } from "./transferencia-zona";
import { videoDatilesVieneAlCaso, fotosOportunas } from "./galeria";
import { quiereRetirar, textoDondeEstanSinIA } from "./whatsapp-interactivo";
import { pesos } from "./precios";

test("26/11 María Ilda: en la zona «te transfiero» no manda el CVU ni pide pagar antes", () => {
  assert.equal(respuestaTransferencia({ zona: "propia", pidioDatos: false }), "al_recibir");
  assert.equal(respuestaTransferencia({ zona: "capital", pidioDatos: false }), "al_recibir");
  assert.equal(respuestaTransferencia({ zona: "propia", pidioDatos: true }), "datos_sin_apuro");
  assert.equal(respuestaTransferencia({ zona: "correo", pidioDatos: false }), "datos");
  assert.equal(respuestaTransferencia({ zona: null, pidioDatos: false }), "datos");
  const t = textoTransferirAlRecibir({ quien: ", María", monto: "$ 27.000", pedido: "AS-00180" });
  assert.match(t, /cuando te lo llevamos/);
  assert.doesNotMatch(t, /CVU|alias:|antes de las 15|comprobante/i);
  const d = textoDatosSinApuro({ quien: "", monto: "$ 27.000", pedido: "AS-00180", datos: "Alias: x" });
  assert.match(d, /Alias: x/);
  assert.doesNotMatch(d, /antes de las 15|Mandame el comprobante/);
});

test("26/11 Ester y Teresita: el video de los dátiles solo cuando viene al caso", () => {
  for (const t of ["Le voy a mandar la dirección a mi hija que vive en icho cruz", "Pásame dirección lo paso a retirar …", "Yo me vine la semana pasada", "Te transfiero cuando llegue", "San Martín 100"])
    assert.equal(videoDatilesVieneAlCaso(t), false, t);
  for (const t of ["De Carlos Paz", "Carlos Paz", "¿Cómo son los dátiles?", "qué trae el trío?"]) assert.equal(videoDatilesVieneAlCaso(t), true, t);
  const h = [{ de: "acopio", texto: "[Foto] Trío de frutos secos: mix con cajú, dátiles y pasas · $24.000" }];
  const f = fotosOportunas({ entrante: "Le voy a mandar la dirección a mi hija que vive en icho cruz", respuesta: "Dale.", historial: h as never });
  assert.ok(!f.some((x) => /lg-datil-mudo/.test(x.url)));
});

test("26/11 Teresita: «lo paso a retirar» recibe la YPF del centro, nunca «no damos dirección»", () => {
  assert.equal(quiereRetirar("Pásame dirección lo paso a retirar"), true);
  assert.equal(quiereRetirar("¿Dónde están ubicados?"), false);
  const t = textoDondeEstanSinIA({ nombre: "Teresita", sinCargoDesde: 20000, envioZona: 3000, pesos, texto: "Pásame dirección lo paso a retirar" });
  assert.match(t, /YPF del centro/);
  assert.doesNotMatch(t, /no damos/i);
  const s = textoDondeEstanSinIA({ nombre: null, sinCargoDesde: 20000, envioZona: 3000, pesos, texto: "dónde están?" });
  assert.doesNotMatch(s, /YPF/);
});
