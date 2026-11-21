"""Video en BUCLE para TikTok (y Reels): 3 a 6 s que empalman el final con el principio sin corte visible.

Uso:  python3 scripts/bucle.py toma.mp4 salida.mp4 --desde 1.2 --seg 4 --texto "¿1 kilo de dátiles?\n$10.900" [--boomerang]

Por qué (Santiago, 21/11: «para TikTok videos en bucle cortos de pocos segundos»): TikTok mide cuántas veces se
vuelve a ver un video. Si el final empalma con el principio, la gente lo mira 2 o 3 veces sin darse cuenta y el
video se reparte más.

Cómo empalma:
- Normal: los últimos 0,4 s se funden con los primeros 0,4 s (xfade), así el último cuadro ES el primero.
- --boomerang: ida y vuelta (la toma y la misma al revés). Sirve para cosas que caen, se vuelcan o se sirven.
- El texto queda fijo todo el video (si aparece o desaparece, se nota el corte). Arriba, grande, 3 a 6 palabras.
- Sin placa final, sin logo, sin efectos de entrada: cualquier cosa que «cierre» rompe el bucle.
- El sonido real se funde igual que la imagen. La música se le pone en TikTok (sonido en tendencia), no acá.
"""
import argparse, os, subprocess, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, "scripts/fuentes/Poppins-Bold.ttf")
FUNDE = 0.4


def esc(t):
    t = "".join(ch for ch in t if ord(ch) < 0x2000 or ch in "¿¡")
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def texto(t):
    capas = []
    for i, r in enumerate([x for x in t.replace("\\n", "\n").split("\n") if x.strip()]):
        capas.append(
            f"drawtext=fontfile='{FUENTE}':text='{esc(r)}':fontcolor=white:fontsize=84:box=1:boxcolor=0x10251C@0.82"
            f":boxborderw=26:x=(w-text_w)/2:y={250 + i * 118}"
        )
    return ",".join(capas)


def tiene_audio(src):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", src], capture_output=True, text=True)
    return bool(r.stdout.strip())


def main():
    a = argparse.ArgumentParser()
    a.add_argument("entrada"); a.add_argument("salida")
    a.add_argument("--desde", type=float, default=0); a.add_argument("--seg", type=float, default=4)
    a.add_argument("--texto", default=""); a.add_argument("--boomerang", action="store_true")
    o = a.parse_args()
    if not 2.5 <= o.seg <= 8:
        sys.exit("--seg entre 2,5 y 8: el bucle funciona con videos cortos")
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", o.entrada], capture_output=True, text=True).stdout or 0)
    if dur and o.desde + o.seg > dur:
        sys.exit(f"La toma dura {dur:.1f} s: con --desde {o.desde} no alcanzan {o.seg} s. Bajá --desde o --seg.")
    base = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=1.12:contrast=1.04,setsar=1,fps=30"
    sobre = ("," + texto(o.texto)) if o.texto else ""
    audio = tiene_audio(o.entrada)
    if o.boomerang:
        fc = f"[0:v]{base},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0{sobre}[v]"
        amap = []  # el sonido al revés suena raro: va mudo y la música se pone en TikTok
    else:
        d = o.seg
        fc = (f"[0:v]{base},split[a][b];[a]trim={FUNDE}:{d},setpts=PTS-STARTPTS[cuerpo];[b]trim=0:{FUNDE},setpts=PTS-STARTPTS[inicio];"
              f"[cuerpo][inicio]xfade=transition=fade:duration={FUNDE}:offset={d - 2 * FUNDE}{sobre}[v]")
        if audio:
            fc += (f";[0:a]aresample=44100,asplit[x][y];[x]atrim={FUNDE}:{d},asetpts=PTS-STARTPTS[ac];[y]atrim=0:{FUNDE},asetpts=PTS-STARTPTS[ai];"
                   f"[ac][ai]acrossfade=d={FUNDE}[au]")
        amap = ["-map", "[au]", "-c:a", "aac", "-b:a", "128k"] if audio else []
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(o.desde), "-t", str(o.seg), "-i", o.entrada, "-filter_complex", fc,
           "-map", "[v]", *amap, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", o.salida]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-1500:])
    print(o.salida)


if __name__ == "__main__":
    main()
