# Reels listos para publicar

Acá va el mp4 TERMINADO que se va a programar en Instagram y Facebook, cuando no se puede subir a
Vercel Blob (la salida de red del contenedor de los agentes no llega a blob.vercel-storage.com).
Desde acá el archivo tiene URL pública —https://www.acopiosaludable.com/video/reels/<archivo>.mp4— que es
lo único que POST /api/admin/publicaciones necesita.

Reglas (Santiago, 7/11), para que el repo no se llene de videos:
- Como máximo 1 archivo nuevo por día, y solo el que SALE. Las variantes de prueba se quedan en la Mac.
- Nombre: `<tema>-<aaaammdd>.mp4`, en 1080x1920, H.264, menos de 8 MB.
- En el mismo PR en que subís uno, borrá los que tengan más de 30 días: ya se publicaron y no se usan más.
- Las tomas en crudo NO van acá: van a `public/video/tomas/` y se anotan en `tomas.json`.
