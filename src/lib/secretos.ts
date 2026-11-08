// Busca secretos (claves de API, tokens, contraseñas en URLs de base) en texto agregado a un PR.
// Lo usa scripts/buscar-secretos.ts en el chequeo «Seguridad» de GitHub y se puede correr a mano antes
// de subir algo. Nunca devuelve el secreto: solo la regla, el archivo, la línea y un recorte tapado.
// Sin imports a propósito: corre igual en CI que en los tests.

export type Hallazgo = { regla: string; archivo: string; linea: number; recorte: string };

// Cada patrón apunta a un formato concreto de proveedor que usamos (no «cualquier string largo»),
// para que el chequeo no frene PRs por falsos positivos.
export const REGLAS: { regla: string; patron: RegExp }[] = [
  { regla: "clave de agentes (x-agente-clave)", patron: /\bag_[A-Za-z0-9_-]{30,}/ },
  { regla: "Anthropic", patron: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { regla: "OpenAI", patron: /\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{20,}/ },
  { regla: "Mercado Pago (access token)", patron: /\b(?:APP_USR|TEST)-\d{6,}-\d{6}-[a-f0-9]{32}-\d{6,}/ },
  { regla: "Meta / WhatsApp (token)", patron: /\bEAA[A-Za-z0-9]{60,}/ },
  { regla: "Resend", patron: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/ },
  { regla: "GitHub", patron: /\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{40,}/ },
  { regla: "Vercel Blob", patron: /\bvercel_blob_rw_[A-Za-z0-9]{10,}_[A-Za-z0-9]{20,}/ },
  { regla: "AWS", patron: /\bAKIA[0-9A-Z]{16}\b/ },
  { regla: "clave privada", patron: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  // URL de Neon con usuario, dos puntos, contraseña y arroba. Sin contraseña o con ${...} no cuenta.
  { regla: "URL de base con contraseña", patron: /\bpostgres(?:ql)?:\/\/[^\s:@/"'`]+:(?!\$\{|<|\*)[^\s@"'`]{6,}@[^\s"'`]+/ },
];

// Una línea con esta marca se saltea (ej. un ejemplo inventado en un comentario). Se nota en el PR.
export const MARCA_IGNORAR = "secretos:ignorar";

// Archivos donde los formatos aparecen por otras razones (hashes de integridad, binarios).
const ARCHIVOS_FUERA = [/(^|\/)package-lock\.json$/, /\.(png|jpe?g|webp|gif|mp4|mov|pdf|woff2?|ttf|ico)$/i];

/** Tapa todo menos los primeros 4 caracteres de lo que coincidió. */
export function tapar(coincidencia: string): string {
  return `${coincidencia.slice(0, 4)}${"*".repeat(Math.min(12, Math.max(4, coincidencia.length - 4)))}`;
}

export function buscarEnLinea(texto: string, archivo: string, linea: number): Hallazgo[] {
  if (texto.includes(MARCA_IGNORAR)) return [];
  if (ARCHIVOS_FUERA.some((r) => r.test(archivo))) return [];
  const hallazgos: Hallazgo[] = [];
  for (const { regla, patron } of REGLAS) {
    const m = texto.match(patron);
    if (m) hallazgos.push({ regla, archivo, linea, recorte: tapar(m[0]) });
  }
  return hallazgos;
}

/**
 * Recorre un diff unificado (git diff -U0) y revisa solo las líneas AGREGADAS: lo que ya estaba en main
 * no frena un PR nuevo. Devuelve los hallazgos con archivo y número de línea del lado nuevo.
 */
export function buscarEnDiff(diff: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  let archivo = "";
  let linea = 0;
  for (const crudo of diff.split("\n")) {
    if (crudo.startsWith("+++ ")) {
      archivo = crudo.slice(4).replace(/^b\//, "").trim();
      continue;
    }
    if (crudo.startsWith("--- ")) continue;
    const h = crudo.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (h) {
      linea = Number(h[1]);
      continue;
    }
    if (!archivo || archivo === "/dev/null") continue;
    if (crudo.startsWith("+")) {
      hallazgos.push(...buscarEnLinea(crudo.slice(1), archivo, linea));
      linea++;
    } else if (crudo.startsWith(" ")) {
      linea++;
    }
  }
  return hallazgos;
}
