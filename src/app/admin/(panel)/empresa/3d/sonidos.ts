"use client";

// Efectos de sonido de la oficina 3D, sintetizados con WebAudio (sin archivos: cargan al instante).
// Suaves y cortos, para acompañar sin molestar: pasos, el «tum» del salto a una oficina, el destino
// del doble clic, cuando te acercás a alguien y cuando abrís su ficha. Se apagan con el botón 🔊.
import { contextoAudio } from "../voz-cliente";

export type Sonido = "paso" | "tum" | "destino" | "cerca" | "abrir" | "click";

const CLAVE = "acopio-sonido";
let activo = true;
try {
  activo = typeof window === "undefined" || localStorage.getItem(CLAVE) !== "0";
} catch {
  /* sin almacenamiento */
}

export const sonidoActivo = () => activo;
export function activarSonido(si: boolean) {
  activo = si;
  try {
    localStorage.setItem(CLAVE, si ? "1" : "0");
  } catch {
    /* nada */
  }
}

let ruido: AudioBuffer | null = null;
function bufferRuido(ctx: AudioContext): AudioBuffer {
  if (ruido) return ruido;
  ruido = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ruido;
}

/** Un tono con envolvente (ataque corto, caída exponencial). */
function tono(ctx: AudioContext, salida: AudioNode, f0: number, f1: number, dur: number, vol: number, tipo: OscillatorType = "sine", demora = 0) {
  const t = ctx.currentTime + demora;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(salida);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Un golpe de ruido filtrado (pasos, aire). */
function soplo(ctx: AudioContext, salida: AudioNode, frec: number, q: number, dur: number, vol: number, demora = 0) {
  const t = ctx.currentTime + demora;
  const s = ctx.createBufferSource();
  s.buffer = bufferRuido(ctx);
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = frec;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(salida);
  s.start(t, Math.random() * 0.2);
  s.stop(t + dur + 0.02);
}

let pie = 0;
export function sonar(tipo: Sonido) {
  if (!activo) return;
  const ctx = contextoAudio();
  if (!ctx || ctx.state !== "running") return;
  const salida = ctx.createGain();
  salida.gain.value = 0.55;
  salida.connect(ctx.destination);
  switch (tipo) {
    case "paso": {
      // Pisada suave sobre piso de madera; alterna pie izquierdo y derecho.
      pie = 1 - pie;
      soplo(ctx, salida, pie ? 260 : 300, 1.2, 0.09, 0.05);
      tono(ctx, salida, pie ? 95 : 110, 60, 0.07, 0.035);
      break;
    }
    case "tum": {
      // El salto: un «tum» grave con un brillo arriba.
      tono(ctx, salida, 140, 48, 0.35, 0.32);
      soplo(ctx, salida, 900, 0.7, 0.22, 0.06);
      tono(ctx, salida, 880, 1320, 0.18, 0.05, "triangle", 0.05);
      tono(ctx, salida, 1320, 1760, 0.22, 0.035, "sine", 0.1);
      break;
    }
    case "destino": {
      // Doble clic en el piso: un «pip» que sube.
      tono(ctx, salida, 520, 780, 0.12, 0.07, "triangle");
      tono(ctx, salida, 780, 1040, 0.14, 0.04, "sine", 0.06);
      break;
    }
    case "cerca": {
      tono(ctx, salida, 660, 660, 0.09, 0.035, "sine");
      tono(ctx, salida, 990, 990, 0.12, 0.03, "sine", 0.07);
      break;
    }
    case "abrir": {
      // Abrir la ficha de alguien: acorde corto.
      tono(ctx, salida, 523, 523, 0.3, 0.05, "sine");
      tono(ctx, salida, 659, 659, 0.3, 0.04, "sine", 0.04);
      tono(ctx, salida, 784, 784, 0.35, 0.035, "sine", 0.08);
      break;
    }
    case "click": {
      tono(ctx, salida, 1200, 900, 0.05, 0.04, "square");
      break;
    }
  }
  setTimeout(() => salida.disconnect(), 1200);
}
