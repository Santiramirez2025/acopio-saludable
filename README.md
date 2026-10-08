# Acopio Saludable

Tienda online de productos saludables por volumen (Villa Carlos Paz, Córdoba). Proveedor único: Distrimay, compra contra pedido.

Stack: Next.js (App Router) + TypeScript, Prisma + PostgreSQL (Neon), NextAuth, Tailwind. Deploy en Vercel.

## Estado

- **Fase 1 (hecha):** modelo de datos, importación del CSV (1.177 productos), fotos del proveedor (1.111), panel de productos, combos iniciales con control de margen, configuración.
- **Fase 2 (hecha):** sitio público (home, catálogo con filtros, ficha, compra por negocio y por objetivo, combos, armador de pedido), carrito con compra mínima, alta y edición de combos en el panel, SEO básico (metadatos, sitemap, datos estructurados).
- **Fase 3 (hecha):** checkout con cálculo de envío automático, Mercado Pago (Checkout Pro) y transferencia, pedidos con estados, lista de compra a Distrimay, etiqueta de envío, margen neto por pedido y configuración de envíos.
- **Fase 4 (hecha):** sincronización diaria de precios con marcador, diff con aprobación, historial con gráfico y estadísticas de ventas y márgenes.

## Puesta en marcha

```bash
cp .env.example .env          # completar DATABASE_URL, NEXTAUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npx prisma migrate deploy     # crea o actualiza las tablas (correr también después de cada actualización)
npm run db:seed               # catálogo + fotos + combos + ganchos + usuario admin
npm run dev                   # http://localhost:3000/admin
```

En Vercel: cargar `DATABASE_URL`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL`. El seed se corre una vez desde tu máquina apuntando a la base de Neon.

El seed se puede volver a correr: no duplica nada ni pisa lo editado en el panel.

## Reglas que ya aplica

- Los códigos son texto (58 empiezan con 0). Nunca se convierten a número.
- Precio de venta = `precio_publico`. Margen = (precio − costo) / precio.
- Publicado = visible + activo + margen ≥ mínimo (12% por defecto, configurable). Los demás figuran como "Sin margen".
- Ocultos por defecto, para que decidas vos: nombres con indicación terapéutica (tinturas madre) y congelados (cadena de frío).
- Nicho, objetivo y peso bruto se cargan como borrador automático y se corrigen desde el panel.
- Un combo no puede quedar debajo del margen mínimo: el panel lo marca como bloqueado.

## Tienda

- El precio siempre lo calcula el servidor (`/api/carrito`); el navegador solo guarda qué productos y cuántos. El costo nunca sale a la tienda.
- El carrito no deja continuar por debajo de la compra mínima.
- Un combo se vende solo si está activo y vigente, todos sus productos están publicados y respeta el margen mínimo.
- El botón "Continuar con la compra" lleva a un checkout provisorio hasta la Fase 3.
- En producción, definir `NEXT_PUBLIC_SITE_URL` con el dominio final (sitemap y datos estructurados).

## Pedidos, pagos y envíos

- **Alta del pedido:** el servidor vuelve a cotizar carrito y envío; no acepta precios ni opciones de envío que mande el navegador. Cada pedido guarda precio y costo de cada producto al momento de la compra.
- **Mercado Pago:** con `MP_ACCESS_TOKEN` se ofrece Checkout Pro. El pago se confirma por el aviso (`/api/mp/webhook`, validado con `MP_WEBHOOK_SECRET`) o al volver el cliente al sitio; en ambos casos se consulta el pago a Mercado Pago y se compara el monto. Sin token solo se ofrece transferencia.
- **Transferencia:** el pedido queda pendiente y se confirma a mano desde Panel → Pedidos. Los datos de la cuenta se cargan en Configuración.
- **Envíos:** entrega propia sin cargo por código postal; MiCorreo y Andreani si están sus credenciales; si no, tabla por peso y zona (Panel → Envíos). Bultos de hasta 25 kg, cotizados uno por uno. La tabla viene con **valores de ejemplo**: hay que cargar las tarifas reales.
- **Confirmaciones:** email por Resend (`RESEND_API_KEY`, `EMAIL_FROM`) al recibir el pedido y al confirmar el pago; botón de WhatsApp con el mensaje armado para el cliente y para la tienda. No hay envío automático de WhatsApp.
- **Lista de compra a Distrimay:** en cada pedido, con código, producto, cantidad, costo y total; también en CSV.

## Actualización diaria de precios

- **Marcador:** en Panel → Actualizaciones se genera un marcador para el navegador. Con la sesión de Distrimay abierta, un clic lee costos (tu lista de precios) y precios públicos de todo el catálogo y los manda a `/api/admin/price-sync`. Si no puede enviar, descarga `precios-distrimay.json` para subirlo a mano. También se acepta un CSV del proveedor.
- **Lee del sistema del proveedor, no de la pantalla:** una sola consulta trae los 1.177 artículos, sin depender de la paginación ni del diseño de la página.
- **Qué manda:** códigos, nombres, precios y nombres de foto. Nunca usuario, contraseña ni la sesión de Distrimay. La tienda guarda solo el hash del token del marcador.
- **Reglas:** los cambios menores al umbral (10% por defecto) se aplican solos; los demás esperan aprobación. Productos nuevos entran en borrador. Los que desaparecen pasan a sin stock solo si la lectura fue completa; si falta más del 10% del catálogo de golpe, se pide aprobación.
- **Aviso:** el panel muestra "Sincronizá los precios de hoy" hasta que haya una actualización del día.
- Requiere el sitio publicado con https y `NEXT_PUBLIC_SITE_URL` definido.

## Estadísticas

Ventas, pedidos, ticket promedio, margen bruto y margen neto (descontando subsidio de envío, comisión de pago, packaging y descuentos), ventas por día y rankings de productos, combos y nichos por margen en pesos. Cuentan solo los pedidos con pago confirmado.

## Fotos

Salen del sistema del proveedor (campo `photos` de cada artículo) y quedan como URL en la base. `data/distrimay_fotos.json` trae las 1.111 disponibles; 66 productos no tienen foto en el proveedor (filtro "Sin foto" en el panel). Para actualizar: Panel → Importar → Fotos, o `npm run fotos`.

## Comandos

`npm test` (reglas de negocio) · `npm run typecheck` · `npm run build`

## Nota técnica

Prisma corre con `engineType = "client"` y `@prisma/adapter-pg` (sin motor Rust), que es lo recomendado para Vercel + Neon.
