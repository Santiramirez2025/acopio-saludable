"use client";

// Voz de la oficina en el navegador.
// - Con voz natural (OPENAI_API_KEY en el servidor): graba el micrófono, corta solo cuando te callás,
//   lo transcribe en el servidor y el agente contesta con su propia voz (mp3).
// - Sin clave: usa el reconocimiento y la voz del navegador.
// Mientras un agente habla se emite el evento «acopio-boca» { agente, nivel 0..1 } para mover su boca en 3D.

let natural: Promise<boolean> | null = null;
export function hayVozNatural(): Promise<boolean> {
  natural ??= fetch("/api/admin/agentes/oir")
    .then((r) => (r.ok ? r.json() : { vozNatural: false }))
    .then((d: { vozNatural?: boolean }) => !!d.vozNatural)
    .catch(() => false);
  return natural;
}

function boca(agente: string, nivel: number) {
  window.dispatchEvent(new CustomEvent("acopio-boca", { detail: { agente, nivel } }));
}

let actual: { parar: () => void } | null = null;
export function callar() {
  actual?.parar();
  actual = null;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* nada */
  }
}

/** El agente dice el texto. Llama a alTerminar cuando termina (o si falla). */
export async function decir(texto: string, agente: string, alTerminar?: () => void): Promise<void> {
  callar();
  const terminar = () => {
    boca(agente, 0);
    alTerminar?.();
  };
  if (await hayVozNatural()) {
    try {
      const r = await fetch("/api/admin/agentes/voz", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ texto, agente }) });
      if (!r.ok) throw new Error(String(r.status));
      const url = URL.createObjectURL(await r.blob());
      const audio = new Audio(url);
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audio);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      an.connect(ctx.destination);
      const datos = new Uint8Array(an.fftSize);
      let vivo = true;
      const paso = () => {
        if (!vivo) return;
        an.getByteTimeDomainData(datos);
        let s = 0;
        for (const v of datos) s += ((v - 128) / 128) ** 2;
        boca(agente, Math.min(1, Math.sqrt(s / datos.length) * 5));
        requestAnimationFrame(paso);
      };
      const fin = () => {
        vivo = false;
        URL.revokeObjectURL(url);
        void ctx.close();
        actual = null;
        terminar();
      };
      audio.onended = fin;
      audio.onerror = fin;
      actual = {
        parar: () => {
          audio.pause();
          vivo = false;
          boca(agente, 0);
          void ctx.close();
        },
      };
      await audio.play();
      paso();
      return;
    } catch {
      /* cae a la voz del navegador */
    }
  }
  try {
    const u = new SpeechSynthesisUtterance(texto.replace(/[*_#`]/g, ""));
    u.lang = "es-AR";
    const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("es"));
    if (v) u.voice = v;
    let vivo = true;
    const paso = () => {
      if (!vivo) return;
      boca(agente, 0.25 + 0.35 * Math.abs(Math.sin(performance.now() / 90)));
      requestAnimationFrame(paso);
    };
    u.onend = () => {
      vivo = false;
      terminar();
    };
    actual = { parar: () => { vivo = false; boca(agente, 0); } };
    window.speechSynthesis.speak(u);
    paso();
  } catch {
    terminar();
  }
}

type Reco = { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };

/**
 * Escucha a Santiago. Con voz natural graba y corta solo tras ~1,2 s de silencio (o a los 20 s).
 * Devuelve una función para cortar antes. onTexto recibe lo que dijo ("" si no dijo nada).
 */
export async function escuchar(onTexto: (t: string) => void, onEstado: (e: "escuchando" | "pensando" | "listo" | "error", detalle?: string) => void): Promise<() => void> {
  callar();
  if (await hayVozNatural()) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const tipo = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: tipo });
      const partes: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      const datos = new Uint8Array(an.fftSize);
      const inicio = performance.now();
      let hablo = false;
      let ultimaVoz = inicio;
      let cortado = false;
      const cortar = () => {
        if (cortado) return;
        cortado = true;
        if (rec.state !== "inactive") rec.stop();
      };
      const vigilar = () => {
        if (cortado) return;
        an.getByteTimeDomainData(datos);
        let s = 0;
        for (const v of datos) s += ((v - 128) / 128) ** 2;
        const nivel = Math.sqrt(s / datos.length);
        const ahora = performance.now();
        if (nivel > 0.035) {
          hablo = true;
          ultimaVoz = ahora;
        }
        if ((hablo && ahora - ultimaVoz > 1200) || ahora - inicio > 20_000 || (!hablo && ahora - inicio > 9000)) return cortar();
        requestAnimationFrame(vigilar);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        if (!hablo) {
          onEstado("listo");
          return onTexto("");
        }
        onEstado("pensando");
        const f = new FormData();
        f.append("audio", new Blob(partes, { type: tipo }), tipo.includes("mp4") ? "voz.m4a" : "voz.webm");
        try {
          const r = await fetch("/api/admin/agentes/oir", { method: "POST", body: f });
          const d = (await r.json()) as { texto?: string; error?: string };
          if (!r.ok) throw new Error(d.error ?? String(r.status));
          onEstado("listo");
          onTexto(d.texto ?? "");
        } catch (e) {
          onEstado("error", String(e instanceof Error ? e.message : e));
        }
      };
      rec.start(250);
      onEstado("escuchando");
      vigilar();
      return cortar;
    } catch (e) {
      onEstado("error", "No tengo permiso para el micrófono: habilitalo en el navegador.");
      return () => undefined;
    }
  }
  const w = window as unknown as { SpeechRecognition?: new () => Reco; webkitSpeechRecognition?: new () => Reco };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) {
    onEstado("error", "Este navegador no reconoce voz. Probá con Chrome.");
    return () => undefined;
  }
  const r = new C();
  r.lang = "es-AR";
  r.interimResults = false;
  let dicho = "";
  r.onresult = (e) => {
    dicho = Array.from(e.results).map((x) => x[0]?.transcript ?? "").join(" ");
  };
  r.onend = () => {
    onEstado("listo");
    onTexto(dicho);
  };
  r.onerror = () => onEstado("listo");
  onEstado("escuchando");
  r.start();
  return () => r.stop();
}
