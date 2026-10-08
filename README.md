# Acopio Saludable

Tienda online de productos saludables por volumen (Villa Carlos Paz, Córdoba). Proveedor único: Distrimay, compra contra pedido.

Stack: Next.js (App Router) + TypeScript, Prisma + PostgreSQL (Neon), NextAuth, Tailwind. Deploy en Vercel.

## Estado

- **Fase 1 (hecha):** modelo de datos, importación del CSV (1.177 productos), fotos del proveedor (1.111), panel de productos, combos iniciales con control de margen, configuración.
- **Fase 2 (hecha):** sitio público (home, catálogo con filtros, ficha, compra por negocio y por objetivo, combos, armador de pedido), carrito con compra mínima, alta y edición de combos en el panel, SEO básico (metadatos, sitemap, datos estructurados).
- Fase 3: checkout, Mercado Pago y envíos.
- Fase 4: sincronización diaria de precios y estadísticas.

## Puesta en marcha

```bash
cp .env.example .env          # completar DATABASE_URL, NEXTAUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npx prisma migrate deploy     # crea las tablas
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

## Fotos

Salen del sistema del proveedor (campo `photos` de cada artículo) y quedan como URL en la base. `data/distrimay_fotos.json` trae las 1.111 disponibles; 66 productos no tienen foto en el proveedor (filtro "Sin foto" en el panel). Para actualizar: Panel → Importar → Fotos, o `npm run fotos`.

## Comandos

`npm test` (reglas de negocio) · `npm run typecheck` · `npm run build`

## Nota técnica

Prisma corre con `engineType = "client"` y `@prisma/adapter-pg` (sin motor Rust), que es lo recomendado para Vercel + Neon.
