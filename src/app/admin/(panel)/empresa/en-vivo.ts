"use client";

import { contextoAudio } from "./voz-cliente";

// Llamada en vivo con un agente (OpenAI Realtime por WebRTC): hablás y te contesta al instante con su voz,
// podés interrumpirlo, y lo que dice mueve su boca en 3D (evento «acopio-boca»).

export type EstadoLlamada = "conectando" | "escuchando" | "hablando" | "pensando" | "cortada" | "error";

type Opciones = {
  agente: string;
  onEstado: (e: EstadoLlamada, detalle?: string) => void;
  /** Texto de la charla: rol, texto, y si ya está completo. */
  onTexto: (rol: "user" | "assistant", texto: string, final: boolean) => void;
  onOrden: (orden: string, para: string) => void;
};

export type Llamada = { cortar: () => void; silenciar: (si: boolean) => void };

function boca(agente: string, nivel: number) {
  window.dispatchEvent(new CustomEvent("acopio-boca", { detail: { agente, nivel } }));
}

export async function llamar(o: Opciones): Promise<Llamada> {
  o.onEstado("conectando");
  let vivo = true;
  const limpiar: (() => void)[] = [];
  const cortar = () => {
    if (!vivo) return;
    vivo = false;
    boca(o.agente, 0);
    limpiar.forEach((f) => {
      try {
        f();
      } catch {
        /* nada */
      }
    });
    o.onEstado("cortada");
  };

  try {
    const r = await fetch("/api/admin/agentes/en-vivo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agente: o.agente }) });
    const d = (await r.json().catch(() => ({}))) as { clave?: string; error?: string };
    if (!r.ok || !d.clave) throw new Error(d.error ?? `No se pudo abrir la llamada (${r.status})`);

    const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    limpiar.push(() => mic.getTracks().forEach((t) => t.stop()));

    const pc = new RTCPeerConnection();
    limpiar.push(() => pc.close());
    const audio = new Audio();
    audio.autoplay = true;
    limpiar.push(() => {
      audio.pause();
      audio.srcObject = null;
    });
    const ctx = contextoAudio();

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      audio.srcObject = stream;
      void audio.play().catch(() => undefined);
      // Boca: nivel de la voz del agente.
      if (!ctx) return;
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      const fuente = ctx.createMediaStreamSource(stream);
      fuente.connect(an);
      limpiar.push(() => fuente.disconnect());
      const datos = new Uint8Array(an.fftSize);
      const paso = () => {
        if (!vivo) return;
        an.getByteTimeDomainData(datos);
        let s = 0;
        for (const v of datos) s += ((v - 128) / 128) ** 2;
        boca(o.agente, Math.min(1, Math.sqrt(s / datos.length) * 5));
        requestAnimationFrame(paso);
      };
      paso();
    };
    pc.addTrack(mic.getAudioTracks()[0], mic);

    const dc = pc.createDataChannel("oai-events");
    const enviar = (ev: unknown) => dc.readyState === "open" && dc.send(JSON.stringify(ev));
    let dicho = "";
    dc.onopen = () => {
      o.onEstado("escuchando");
      // Que salude primero, corto.
      enviar({ type: "response.create" });
    };
    dc.onmessage = (m) => {
      let ev: Record<string, unknown>;
      try {
        ev = JSON.parse(String(m.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      const tipo = String(ev.type ?? "");
      if (tipo === "input_audio_buffer.speech_started") {
        o.onEstado("escuchando");
      } else if (tipo === "input_audio_buffer.speech_stopped") {
        o.onEstado("pensando");
      } else if (tipo === "conversation.item.input_audio_transcription.completed") {
        const t = String(ev.transcript ?? "").trim();
        if (t) o.onTexto("user", t, true);
      } else if (tipo === "response.output_audio_transcript.delta" || tipo === "response.audio_transcript.delta") {
        dicho += String(ev.delta ?? "");
        o.onEstado("hablando");
        o.onTexto("assistant", dicho, false);
      } else if (tipo === "response.output_audio_transcript.done" || tipo === "response.audio_transcript.done") {
        const t = String(ev.transcript ?? dicho);
        dicho = "";
        o.onTexto("assistant", t, true);
      } else if (tipo === "output_audio_buffer.stopped" || tipo === "response.done") {
        if (tipo === "response.done") {
          const salida = ((ev.response as { output?: { type?: string; name?: string; call_id?: string; arguments?: string }[] })?.output ?? []);
          for (const it of salida) {
            if (it.type !== "function_call" || it.name !== "guardar_orden") continue;
            let orden = "";
            let para = o.agente;
            try {
              const args = JSON.parse(it.arguments ?? "{}") as { orden?: string; para?: string };
              orden = String(args.orden ?? "");
              if (args.para) para = String(args.para);
            } catch {
              /* nada */
            }
            void (async () => {
              let ok = false;
              if (orden.trim()) {
                const g = await fetch("/api/admin/agentes/orden", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agente: para, texto: para === o.agente ? orden : `${orden} (te lo pasó ${o.agente} en una llamada con Santiago)` }) }).catch(() => null);
                ok = !!g?.ok;
                if (ok) o.onOrden(orden, para);
              }
              enviar({ type: "conversation.item.create", item: { type: "function_call_output", call_id: it.call_id, output: JSON.stringify({ guardada: ok }) } });
              enviar({ type: "response.create" });
            })();
          }
        }
        if (tipo === "output_audio_buffer.stopped") o.onEstado("escuchando");
      } else if (tipo === "error") {
        const msg = (ev.error as { message?: string })?.message ?? "error";
        o.onEstado("error", msg);
      }
    };
    dc.onclose = () => cortar();

    const oferta = await pc.createOffer();
    await pc.setLocalDescription(oferta);
    const sdp = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: oferta.sdp,
      headers: { authorization: `Bearer ${d.clave}`, "content-type": "application/sdp" },
    });
    if (!sdp.ok) throw new Error(`OpenAI no respondió la llamada (${sdp.status}): ${(await sdp.text()).slice(0, 160)}`);
    await pc.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) cortar();
    };

    return {
      cortar,
      silenciar: (si) => mic.getAudioTracks().forEach((t) => (t.enabled = !si)),
    };
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    cortar();
    o.onEstado("error", /Permission|NotAllowed/i.test(msg) ? "Habilitá el micrófono en el navegador (candadito de la barra de direcciones)." : msg);
    return { cortar, silenciar: () => undefined };
  }
}
