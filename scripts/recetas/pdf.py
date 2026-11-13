# Arma public/descargas/recetario-acopio.pdf con la tapa y todas las tarjetas.
import json, os
from PIL import Image
P = os.path.join(os.path.dirname(__file__), "..", "..", "public")
R = json.load(open(f"{P}/herramientas/recetas.json"))
ims = [Image.open(f"{P}/img/recetas/tapa-recetario.jpg").convert("RGB")] + [Image.open(f"{P}/img/recetas/{r['slug']}.jpg").convert("RGB") for r in R]
ims[0].save(f"{P}/descargas/recetario-acopio.pdf", save_all=True, append_images=ims[1:], resolution=150)
print(len(R), "páginas + tapa")
