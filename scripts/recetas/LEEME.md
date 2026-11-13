# Recetario

1. Las recetas viven en `src/lib/recetas.ts` (medidas concretas, el porqué, nada de promesas de salud).
2. `npx tsx scripts/recetas/datos.ts` → `public/herramientas/recetas.json`
3. `node scripts/recetas/tarjetas.js [slug]` → `public/img/recetas/<slug>.jpg` (avisa si el texto desborda)
4. `node scripts/recetas/tapa.js && python3 scripts/recetas/pdf.py` → `public/descargas/recetario-acopio.pdf`
5. Video: `node public/herramientas/receta-video.mjs <slug|hoy> salida/` → horizontal 1920x1080 y vertical 1080x1920 + texto para YouTube.
