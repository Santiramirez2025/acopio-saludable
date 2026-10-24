-- Token de la cuenta de Mercado Libre conectada (una sola fila). Se renueva solo.
CREATE TABLE IF NOT EXISTS "MlToken" (
  "id" INTEGER PRIMARY KEY,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "userId" BIGINT NOT NULL,
  "vence" TIMESTAMPTZ(6) NOT NULL
);
