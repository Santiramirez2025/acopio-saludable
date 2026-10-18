-- Radar de Instagram: cuentas grandes de la zona que se vigilan para comentar apenas publican.
CREATE TABLE IF NOT EXISTS "RadarCuenta" (
  "username" TEXT PRIMARY KEY,
  "rubro" TEXT,
  "seguidores" INTEGER,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "RadarAviso" (
  "mediaId" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL,
  "comentario" TEXT,
  "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "RadarCorrida" (
  "id" INTEGER PRIMARY KEY,
  "fecha" TIMESTAMPTZ(6) NOT NULL
);
