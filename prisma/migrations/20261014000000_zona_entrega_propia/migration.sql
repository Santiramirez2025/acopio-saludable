-- Entrega propia solo en Villa Carlos Paz y sur de Punilla; el resto va por correo.
ALTER TABLE "Setting" ALTER COLUMN "cpEntregaPropia" SET DEFAULT '5152,5153';
UPDATE "Setting" SET "cpEntregaPropia" = '5152,5153' WHERE "cpEntregaPropia" = '5152,5000-5022';
