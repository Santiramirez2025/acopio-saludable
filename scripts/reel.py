"""Editor de reels de Acopio (9:16, 1080x1920) con ritmo, música y efectos de sonido.

Uso:  python3 scripts/reel.py guion.json salida.mp4

guion.json:
{
  "musica": "alegre-pop",              # public/audio/musica/<nombre>.mp3 (o ruta). "" = sin música
  "volumen_musica": 0.35,              # 0-1; el sonido real de la toma (ASMR) queda arriba
  "sonido_real": true,                 # deja el audio de las tomas (caída de frutos secos, balanza…)
  "tomas": [
    {"archivo": "public/video/tomas/crudo-1211-nueces-caen-sobre-pasas.mp4", "desde": 0, "seg": 1.4,
     "texto": "¿1 kilo de nuez por $20.500?", "estilo": "gancho"},   # gancho | normal | precio | cierre
    {"archivo": "...", "seg": 1.6, "texto": "Pesada en el día", "estilo": "normal"},
    {"archivo": "...", "seg": 2.0, "texto": "$20.500 el kilo", "estilo": "precio"},
    {"archivo": "...", "seg": 2.2, "texto": "Pedila por WhatsApp\n3541 51-9630", "estilo": "cierre"}
  ]
}

Lo que hace por su cuenta (lo que retiene en Reels):
- Corte cada 1,2–2 s con un leve zoom (punch-in) para que la imagen nunca quede quieta.
- Gancho grande arriba desde el cuadro 0, con «pop». Nada de logo ni intro al principio.
- Efectos: whoosh en cada corte, «caja registradora» cuando aparece el precio, «ding» en el cierre.
- Música propia (scripts/musica.py, sin derechos de terceros) por debajo del sonido real.
- Efectos de sonido: Kenney, CC0 (public/audio/sfx/LICENCIA-kenney-cc0.txt).
"""
import json, os, subprocess, sys, tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, "scripts/fuentes/Poppins-Bold.ttf")
SFX = os.path.join(RAIZ, "public/audio/sfx")
MUSICA = os.path.join(RAIZ, "public/audio/musica")
AMARILLO, VERDE = "0xFFC83D", "0x10251C"


def correr(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"ffmpeg falló: {r.stderr[-1500:]}")


def esc(t):
    # drawtext: sin emojis (la fuente no los tiene) y con los caracteres especiales escapados.
    t = "".join(ch for ch in t if ord(ch) < 0x2000 or ch in "¿¡")
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def textos(texto, estilo):
    """Una capa drawtext por renglón (drawtext no centra varios renglones juntos)."""
    if not texto:
        return []
    renglones = texto.split("\n")
    if estilo == "gancho":
        size, y0, color, caja = 82, 260, "white", f"{VERDE}@0.82"
    elif estilo == "precio":
        size, y0, color, caja = 150, 820, VERDE, f"{AMARILLO}@1"
    elif estilo == "cierre":
        size, y0, color, caja = 74, 1300, VERDE, f"{AMARILLO}@1"
    else:
        size, y0, color, caja = 64, 1500, "white", f"{VERDE}@0.75"
    capas = []
    for i, r in enumerate(renglones):
        y = y0 + i * int(size * 1.35)
        # Aparece con un «pop»: los primeros 0,12 s el texto entra un poco más grande.
        capas.append(
            f"drawtext=fontfile='{FUENTE}':text='{esc(r)}':fontcolor={color}:fontsize={size}"
            f":box=1:boxcolor={caja}:boxborderw={int(size*0.32)}:x=(w-text_w)/2:y={y}"
        )
    return capas


def main():
    guion = json.load(open(sys.argv[1]))
    salida = sys.argv[2] if len(sys.argv) > 2 else "reel.mp4"
    tmp = tempfile.mkdtemp(prefix="reel-")
    partes, t, eventos = [], 0.0, []
    for i, tm in enumerate(guion["tomas"]):
        src = tm["archivo"] if os.path.isabs(tm["archivo"]) else os.path.join(RAIZ, tm["archivo"])
        seg, estilo = float(tm["seg"]), tm.get("estilo", "normal")
        zoom = 0.06 if estilo != "precio" else 0.03
        vf = [
            "scale=1080:1920:force_original_aspect_ratio=increase", "crop=1080:1920",
            # punch-in suave a lo largo de la toma
            f"scale=w='1080*(1+{zoom}*t/{seg})':h='1920*(1+{zoom}*t/{seg})':eval=frame", "crop=1080:1920",
            "eq=saturation=1.12:contrast=1.04", "setsar=1", "fps=30",
        ]
        if estilo == "precio":
            vf.append("drawbox=x=0:y=0:w=iw:h=ih:color=black@0.25:t=fill")
        vf += textos(tm.get("texto", ""), estilo)
        p = os.path.join(tmp, f"p{i:02d}.mp4")
        correr(
              ["ffmpeg", "-v", "error", "-y", "-ss", str(tm.get("desde", 0)), "-t", str(seg), "-i", src,
               "-f", "lavfi", "-t", str(seg), "-i", "anullsrc=r=44100:cl=stereo",
               "-filter_complex", f"[0:v]{','.join(vf)}[v];" + ("[0:a]aresample=44100,pan=stereo|c0=c0|c1=c0[a0];[a0][1:a]amix=inputs=2:duration=longest[a]" if tiene_audio(src) else "[1:a]anull[a]"),
               "-map", "[v]", "-map", "[a]", "-t", str(seg), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
               "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "44100", "-ac", "2", p])
        partes.append(p)
        if i > 0:
            eventos.append((t, "whoosh", 0.55))
        if estilo == "gancho":
            eventos.append((t + 0.05, "pop-texto", 0.9))
        elif estilo == "precio":
            eventos.append((t + 0.1, "caja-precio", 1.0))
        elif estilo == "cierre":
            eventos.append((t + 0.15, "ding-final", 0.8))
        elif tm.get("texto"):
            eventos.append((t + 0.05, "pop-suave", 0.6))
        t += seg
    lista = os.path.join(tmp, "lista.txt")
    open(lista, "w").write("".join(f"file '{p}'\n" for p in partes))
    video = os.path.join(tmp, "video.mp4")
    correr(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", video])

    # Mezcla: sonido real + música por debajo (con ducking ante el sonido real) + efectos.
    entradas, filtros, etiquetas = ["-i", video], [], []
    real = "1" if guion.get("sonido_real", True) else "0"
    filtros.append(f"[0:a]volume={real}[real]")
    n = 1
    mus = guion.get("musica", "alegre-pop")
    if mus:
        ruta = mus if os.path.exists(mus) else os.path.join(MUSICA, f"{mus}.mp3")
        entradas += ["-stream_loop", "-1", "-i", ruta]
        vol = guion.get("volumen_musica", 0.35)
        filtros.append(f"[{n}:a]atrim=0:{t:.2f},volume={vol},afade=t=out:st={max(0, t-0.8):.2f}:d=0.8[mus]")
        etiquetas.append("[mus]")
        n += 1
    for k, (cuando, nombre, vol) in enumerate(eventos):
        entradas += ["-i", os.path.join(SFX, f"{nombre}.mp3")]
        ms = int(cuando * 1000)
        filtros.append(f"[{n}:a]volume={vol},adelay={ms}|{ms}[s{k}]")
        etiquetas.append(f"[s{k}]")
        n += 1
    filtros.append(f"[real]{''.join(etiquetas)}amix=inputs={1+len(etiquetas)}:duration=first:normalize=0,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5[a]")
    correr(["ffmpeg", "-v", "error", "-y", *entradas, "-filter_complex", ";".join(filtros), "-map", "0:v", "-map", "[a]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-t", f"{t:.2f}", salida])
    print(salida, f"{t:.1f} s")


def tiene_audio(src):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", src],
                       capture_output=True, text=True)
    return bool(r.stdout.strip())


if __name__ == "__main__":
    main()
