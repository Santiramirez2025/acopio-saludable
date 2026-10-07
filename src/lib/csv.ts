// Lector de CSV sin dependencias (RFC 4180: comillas, comas y saltos de línea dentro de campos).
// Todos los valores salen como TEXTO: los códigos jamás pasan por Number().

export function parseCsv(texto: string): Record<string, string>[] {
  const s = texto.replace(/^﻿/, "");
  const filas: string[][] = [];
  let campo = "";
  let fila: string[] = [];
  let enComillas = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (enComillas) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          campo += '"';
          i++;
        } else enComillas = false;
      } else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      fila.push(campo);
      campo = "";
      if (fila.length > 1 || fila[0] !== "") filas.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo !== "" || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  if (!filas.length) return [];
  const encabezado = filas[0].map((h) => h.trim());
  return filas.slice(1).map((f) => Object.fromEntries(encabezado.map((h, i) => [h, (f[i] ?? "").trim()])));
}
