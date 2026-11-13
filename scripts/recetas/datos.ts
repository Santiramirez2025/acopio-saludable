// Exporta el recetario a public/herramientas/recetas.json (lo usan las tarjetas, el PDF y el video).
import { RECETAS } from "../../src/lib/recetas";
import { writeFileSync } from "node:fs";
writeFileSync("public/herramientas/recetas.json", JSON.stringify(RECETAS));
console.log(RECETAS.length, "recetas");
