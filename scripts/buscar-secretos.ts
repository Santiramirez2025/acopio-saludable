// Revisa que un PR no agregue secretos. Uso: npx tsx scripts/buscar-secretos.ts [rama-base]
// (por defecto origin/main). Mira solo las líneas agregadas respecto de la base y sale con 1 si encuentra
// algo, sin mostrar el secreto. Lo corre .github/workflows/seguridad.yml en cada PR.
// Si salta: NO alcanza con borrarlo en otro commit, el secreto ya quedó en la historia: avisale a Rodri
// (seguridad) para que Santiago lo rote.
import { execFileSync } from "node:child_process";
import { buscarEnDiff } from "../src/lib/secretos";

const base = process.argv[2] || "origin/main";
if (!/^[\w./-]+$/.test(base)) {
  console.error("Rama base inválida");
  process.exit(2);
}
const diff = execFileSync("git", ["diff", "-U0", "--no-color", "--no-ext-diff", `${base}...HEAD`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const hallazgos = buscarEnDiff(diff);
if (!hallazgos.length) {
  console.log(`Sin secretos en lo agregado respecto de ${base}.`);
  process.exit(0);
}
for (const h of hallazgos) {
  // Formato de anotación de GitHub: marca la línea en el PR.
  console.log(`::error file=${h.archivo},line=${h.linea}::Posible secreto (${h.regla}): ${h.recorte}`);
}
console.error(`${hallazgos.length} posible(s) secreto(s). Si es un ejemplo inventado, agregá «secretos:ignorar» en esa línea.`);
process.exit(1);
