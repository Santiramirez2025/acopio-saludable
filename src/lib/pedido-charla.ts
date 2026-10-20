// El pedido que se arma charlando: lo nuevo se suma a lo guardado y la zona ya dicha se reutiliza. Puro.
/** Suma lo nuevo a lo guardado: la misma cosa pisa la cantidad, el resto queda. */
export function sumarLineas(previas: { tipo: "producto" | "combo"; id: string; cantidad: number }[], nuevas: { tipo: "producto" | "combo"; id: string; cantidad: number }[]) {
  const out = previas.map((l) => ({ ...l }));
  for (const n of nuevas) {
    const i = out.findIndex((l) => l.tipo === n.tipo && l.id === n.id);
    if (i >= 0) out[i] = { ...out[i], cantidad: n.cantidad };
    else out.push({ ...n });
  }
  return out;
}

/** De dónde es, si ya lo dijo: el botón de zona, o el «Envío a X:» del vendedor. null si no se sabe. */
export function lugarDelHistorial(historial: { de: "yo" | "acopio"; texto: string }[]): string | null {
  for (const h of [...historial].reverse()) {
    if (h.de === "acopio") {
      const m = h.texto.match(/Envío a ([^:]+):/);
      if (m) return m[1].trim();
      continue;
    }
    const t = h.texto.trim();
    if (/^(carlos paz( y zona)?|villa carlos paz|c[oó]rdoba capital)$/i.test(t)) return t.replace(/ y zona$/i, "");
  }
  return null;
}
