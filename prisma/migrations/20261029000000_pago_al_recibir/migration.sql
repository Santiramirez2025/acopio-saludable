-- Pago al recibir: en la zona de entrega propia el cliente puede pagar cuando le llega el pedido.
ALTER TYPE "MedioPago" ADD VALUE IF NOT EXISTS 'AL_RECIBIR';
