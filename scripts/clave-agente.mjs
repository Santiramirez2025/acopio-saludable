// Genera una clave por agente, en la compu de quien la corre. Uso: node scripts/clave-agente.mjs seguridad
// Muestra la clave (una sola vez, va en la tarea programada de ese agente) y la entrada para AGENTES_CLAVES_JSON
// (solo el hash). Ajustá «leer» y «escribir» a lo que ese agente usa. No guarda nada ni toca producción.
import { createHash, randomBytes } from "node:crypto";

const agente = process.argv[2];
if (!/^[a-z0-9-]+$/.test(agente ?? "")) {
  console.error("Uso: node scripts/clave-agente.mjs <agente>");
  process.exit(1);
}
const clave = `ag_${randomBytes(24).toString("base64url")}`;
const sha256 = createHash("sha256").update(clave).digest("hex");
console.log(`Clave de ${agente}: ${clave}`);
console.log(JSON.stringify({ agente, sha256, leer: ["/salud", "/agentes"], escribir: ["/agentes", "/agentes/orden"] }));
