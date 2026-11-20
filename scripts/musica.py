"""Música propia para los reels (sin derechos de terceros): pistas de 30 s generadas por código.
Uso: python3 scripts/musica.py public/audio/musica
Cada pista: batería (bombo, palmas, hi-hat), bajo y acordes en arpegio. Estilos con distinto tempo y tonalidad,
para variar entre reels y testear cuál retiene más.
"""
import os, sys, numpy as np
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(7)

def env(n, a=0.005, d=0.25):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.exp(-t / d)
    return e

def kick(n):
    t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.18)

def clap(n):
    return rng.standard_normal(n) * env(n, 0.001, 0.05) * 0.3

def hat(n):
    x = rng.standard_normal(n)
    x = np.diff(np.concatenate([[0], x]))  # agudos
    return x * env(n, 0.0005, 0.02) * 0.12

def nota(freq, n, tipo="pluck", d=0.3):
    t = np.arange(n) / SR
    if tipo == "pluck":
        w = np.sin(2 * np.pi * freq * t) * 0.8 + 0.2 * np.sin(4 * np.pi * freq * t) + 0.1 * np.sin(6 * np.pi * freq * t)
        return w * env(n, 0.003, d)
    if tipo == "bajo":
        w = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(4 * np.pi * freq * t)
        return w * env(n, 0.005, d)
    if tipo == "pad":
        w = sum(np.sin(2 * np.pi * freq * k * t + k) / k for k in (1, 2, 3))
        return w * np.minimum(1, t / 0.15) * np.exp(-t / 1.5)
    return np.sin(2 * np.pi * freq * t) * env(n, 0.01, d)

def hz(m):  # midi a Hz
    return 440 * 2 ** ((m - 69) / 12)

ESTILOS = {
    # nombre: (bpm, tónica midi, progresión en grados, patrón de arpegio, timbre, swing)
    "alegre-pop": (118, 60, [0, 7, 9, 5], "pluck", 0.0),
    "fresco-tropical": (104, 62, [0, 5, 9, 7], "pluck", 0.12),
    "chill-lofi": (84, 57, [0, 9, 5, 7], "pad", 0.18),
    "energia": (126, 64, [9, 5, 0, 7], "pluck", 0.0),
    "cocina-funky": (110, 55, [0, 0, 5, 7], "pluck", 0.08),
}
MAYOR = [0, 4, 7]
MENOR = [0, 3, 7]

def pista(bpm, tonica, prog, timbre, swing, seg=30.0):
    total = int(seg * SR)
    out = np.zeros(total + 4 * SR)
    beat = 60 / bpm
    paso = beat / 4  # semicorchea
    pasos = int(seg / paso)
    for i in range(pasos):
        t0 = i * paso + (swing * paso if i % 2 else 0)
        s = int(t0 * SR)
        compas = int(i // 16)
        grado = prog[compas % len(prog)]
        acorde = MENOR if grado == 9 else MAYOR
        raiz = tonica + grado
        if i % 4 == 0:
            k = kick(int(0.3 * SR)); out[s:s + len(k)] += k * 0.9
        if i % 8 == 4:
            c = clap(int(0.2 * SR)); out[s:s + len(c)] += c
        if i % 2 == 1 or bpm > 100:
            h = hat(int(0.06 * SR)); out[s:s + len(h)] += h * (0.6 if i % 4 == 2 else 0.35)
        if i % 4 in (0, 3) and (i % 16) not in (12,):
            b = nota(hz(raiz - 24), int(beat * SR), "bajo", 0.22); out[s:s + len(b)] += b * 0.45
        if timbre == "pad":
            if i % 16 == 0:
                for iv in acorde:
                    p = nota(hz(raiz + iv), int(4 * beat * SR), "pad"); out[s:s + len(p)] += p * 0.12
            if i % 2 == 0 and rng.random() < 0.5:
                m = nota(hz(raiz + 12 + acorde[rng.integers(3)] + 12 * (rng.random() < 0.3)), int(0.4 * SR), "seno", 0.3); out[s:s + len(m)] += m * 0.12
        else:
            if i % 2 == 0:
                iv = acorde[(i // 2) % 3] + 12 * ((i // 6) % 2)
                p = nota(hz(raiz + iv), int(0.35 * SR), "pluck", 0.18); out[s:s + len(p)] += p * 0.16
    out = out[:total]
    # fade in/out cortos y normalización
    f = int(0.02 * SR); out[:f] *= np.linspace(0, 1, f); fo = int(1.2 * SR); out[-fo:] *= np.linspace(1, 0, fo)
    out = np.tanh(out * 1.4)
    out /= np.max(np.abs(out)) + 1e-9
    return (out * 0.85 * 32767).astype(np.int16)

if __name__ == "__main__":
    dest = sys.argv[1] if len(sys.argv) > 1 else "public/audio/musica"
    os.makedirs(dest, exist_ok=True)
    for nombre, (bpm, ton, prog, timbre, swing) in ESTILOS.items():
        wav = os.path.join(dest, f"{nombre}.wav")
        wavfile.write(wav, SR, pista(bpm, ton, prog, timbre, swing))
        os.system(f"ffmpeg -v error -y -i {wav} -af 'highshelf=g=-5:f=5000,lowpass=f=11000,loudnorm=I=-14:TP=-1.5' -c:a libmp3lame -b:a 160k {wav[:-4]}.mp3 && rm {wav}")
        print(nombre, bpm)
