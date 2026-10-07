// Uso: npm run fotos -- [ruta.json] [--pisar]
import { readFileSync } from "node:fs";
import { crearPrisma } from "../src/lib/prisma";
import { aplicarFotos } from "../src/lib/catalogo";
import { leerJsonFotos } from "../src/lib/fotos";

const args = process.argv.slice(2);
const ruta = args.find((a) => !a.startsWith("--")) ?? "data/distrimay_fotos.json";
const db = crearPrisma();
aplicarFotos(db, leerJsonFotos(readFileSync(ruta, "utf8")), { pisar: args.includes("--pisar") })
  .then((r) => console.log(r))
  .finally(() => db.$disconnect());
