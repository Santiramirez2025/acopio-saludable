import { test } from "node:test";
import assert from "node:assert/strict";
import { esReclamoDeProducto, esperaElPedido, textoReclamo } from "./atencion-reglas";

test("25/11: los reclamos reales de Beatriz y Ricardo se detectan", () => {
  for (const t of [
    "Bn dia soy beatriz de colinas en la bolsita q venian las mesclas no venian nueces",
    "Yo encargue ese pero nueces no habia",
    "No tengo redes  y aparte el 1rer. Producto. Que me vendieron. No quede conforme",
    "Las \"nueces \" ni con lupa las encontras",
    "Me faltó la bolsa de pasas",
    "Los dátiles estaban rancios",
    "me llegó abierto el paquete",
    "Quiero hacer un reclamo",
  ]) assert.equal(esReclamoDeProducto(t), true, t);
});

test("lo que no es reclamo no se deriva", () => {
  for (const t of [
    "No vino el cadete",
    "Fslta la miel",
    "Hola, quiero el Trío con las 3 recetas",
    "¿El mix trae nueces?",
    "Datiles c carozo",
    "Me encantó todo, gracias!",
    "¿Tienen mix sin maní?",
    "No tengo efectivo, ¿puedo transferir?",
  ]) assert.equal(esReclamoDeProducto(t), false, t);
  assert.equal(esperaElPedido("No vino el cadete"), true);
});

test("la respuesta al reclamo no vende: sin precios, sin botones, sin explicar", () => {
  const t = textoReclamo("Beatriz");
  assert.equal(t, "Uy, perdón, Beatriz. Lo veo ya con el equipo y te escribo hoy por acá.");
  assert.doesNotMatch(t, /\$|Botones|listo|caj[uú]/i);
  assert.equal(textoReclamo(null), "Uy, perdón. Lo veo ya con el equipo y te escribo hoy por acá.");
});
