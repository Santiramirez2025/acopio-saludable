#!/usr/bin/env python3
"""Laboratorio TikTok: arma variantes DE VERDAD a partir del banco de tomas (public/video/tomas/tomas.json).

Cada variante cambia cosas que el espectador nota: la toma que abre, el orden, el gancho escrito arriba,
el largo, el ritmo (velocidad) y un acercamiento en la primera toma. No es para «engañar» a la plataforma:
es para testear qué apertura y qué mensaje retienen más.

Uso (necesita ffmpeg y Python 3):
  python3 scripts/variantes.py --video despensa-4-kilos --n 5 --salida /tmp/lab --semilla 20261101
  python3 scripts/variantes.py --n 5 --salida /tmp/lab            # reparte entre todos los videos del banco
Deja los .mp4 (1080x1920, H.264, menos de 9 MB para poder subirlos desde Chrome) y un receta.json con
lo que tiene cada uno, para registrarlo en /api/admin/tiktok-lab.
"""
import argparse, json, os, random, subprocess, sys, tempfile, urllib.request

BASE = "https://www.acopiosaludable.com"
AQUI = os.path.dirname(os.path.abspath(__file__))
FUENTE = os.path.join(AQUI, "fuentes", "Poppins-Bold.ttf")
if not os.path.exists(FUENTE):  # bajado suelto desde el sitio: la fuente también está ahí
    os.makedirs(os.path.dirname(FUENTE), exist_ok=True)
    urllib.request.urlretrieve(f"{BASE}/herramientas/Poppins-Bold.ttf", FUENTE)


def bajar(url, destino):
    if not os.path.exists(destino):
        urllib.request.urlretrieve(url, destino)
    return destino


def esc(t):
    # Texto seguro para drawtext (sin emojis: la fuente no los tiene).
    t = "".join(ch for ch in t if ord(ch) < 0x2000)
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%").strip()


def correr(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"ffmpeg falló: {r.stderr[-800:]}")


def armar(video, tomas_dir, receta, salida):
    with tempfile.TemporaryDirectory() as tmp:
        partes = []
        for i, t in enumerate(receta["tomas"]):
            src = os.path.join(tomas_dir, t["archivo"])
            dur = t["seg"]
            vf = [f"setpts=PTS/{receta['velocidad']}", "scale=1080:1920:force_original_aspect_ratio=increase", "crop=1080:1920"]
            if i == 0 and receta["zoom"]:
                # Acercamiento suave en la toma que abre (de 108% a 100%).
                vf.insert(1, "scale=iw*1.08:ih*1.08,zoompan=z='max(1.08-0.0015*on,1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30")
            if i == 0 and receta["gancho"]:
                g = esc(receta["gancho"])
                vf.append(f"drawbox=x=0:y=150:w=iw:h=170:color=black@0.55:t=fill")
                vf.append(f"drawtext=fontfile='{FUENTE}':text='{g}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=150+(170-text_h)/2")
            af = f"atempo={receta['velocidad']}"
            p = os.path.join(tmp, f"p{i}.mp4")
            correr(["ffmpeg", "-v", "error", "-y", "-i", src, "-t", str(dur), "-vf", ",".join(vf), "-af", af, "-r", "30",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "44100", "-ac", "2", p])
            partes.append(p)
        lista = os.path.join(tmp, "lista.txt")
        open(lista, "w").write("".join(f"file '{p}'\n" for p in partes))
        correr(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-c:v", "libx264", "-preset", "veryfast",
                "-crf", "26", "-maxrate", "4M", "-bufsize", "8M", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", salida])
    return os.path.getsize(salida)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", help="id del video del banco (por defecto, todos)")
    ap.add_argument("--n", type=int, default=5)
    ap.add_argument("--salida", default="lab")
    ap.add_argument("--semilla", type=int, default=None)
    ap.add_argument("--banco", default=f"{BASE}/video/tomas/tomas.json")
    a = ap.parse_args()
    rnd = random.Random(a.semilla)
    os.makedirs(a.salida, exist_ok=True)
    tomas_dir = os.path.join(a.salida, "_tomas")
    os.makedirs(tomas_dir, exist_ok=True)
    banco = json.load(urllib.request.urlopen(a.banco)) if a.banco.startswith("http") else json.load(open(a.banco))
    videos = [v for v in banco["videos"] if not a.video or v["id"] == a.video]
    if not videos:
        sys.exit("No hay ese video en el banco")
    hechas, vistas = [], set()
    intentos = 0
    while len(hechas) < a.n and intentos < a.n * 20:
        intentos += 1
        v = videos[len(hechas) % len(videos)] if not a.video else videos[0]
        for t in v["tomas"]:
            bajar(f"{BASE}/video/tomas/{t['archivo']}", os.path.join(tomas_dir, t["archivo"]))
        cierre = [t for t in v["tomas"] if t["rol"] == "cierre"]
        resto = [t for t in v["tomas"] if t["rol"] != "cierre"]
        rnd.shuffle(resto)
        # Largo: a veces corto (2-3 tomas + cierre), a veces completo.
        k = rnd.choice([2, 3, len(resto)])
        tomas = resto[:k] + cierre[:1]
        receta = {
            "video": v["id"],
            "tomas": tomas,
            "gancho": rnd.choice(v.get("ganchos") or [""] ),
            "velocidad": rnd.choice([1.0, 1.05, 1.1]),
            "zoom": rnd.random() < 0.6,
            "ia": bool(v.get("ia")),
        }
        firma = (v["id"], tuple(t["n"] for t in tomas), receta["gancho"])
        if firma in vistas:
            continue
        vistas.add(firma)
        nombre = f"{v['id']}-{len(hechas) + 1:02d}-{'-'.join(str(t['n']) for t in tomas)}.mp4"
        ruta = os.path.join(a.salida, nombre)
        peso = armar(v, tomas_dir, receta, ruta)
        seg = round(sum(t["seg"] for t in tomas) / receta["velocidad"], 1)
        hechas.append({"archivo": ruta, "video": v["id"], "orden": [t["n"] for t in tomas], "gancho": receta["gancho"], "velocidad": receta["velocidad"],
                       "zoom": receta["zoom"], "ia": receta["ia"], "segundos": seg, "mb": round(peso / 1e6, 1),
                       "receta": f"{v['id']} · tomas {'-'.join(str(t['n']) for t in tomas)} · x{receta['velocidad']} · {'zoom' if receta['zoom'] else 'sin zoom'} · «{receta['gancho']}»"})
    json.dump(hechas, open(os.path.join(a.salida, "receta.json"), "w"), ensure_ascii=False, indent=2)
    print(json.dumps(hechas, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
