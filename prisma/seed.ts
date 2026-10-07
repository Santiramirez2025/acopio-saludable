import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { crearPrisma } from "../src/lib/prisma";
import { aplicarFotos, importarCatalogo, leerCatalogoCsv } from "../src/lib/catalogo";
import { leerJsonFotos } from "../src/lib/fotos";
import { COMBOS_INICIALES, GANCHOS } from "../src/lib/combos-iniciales";

const db = crearPrisma();
const DATA = join(process.cwd(), "data");

async function main() {
  await db.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const filas = leerCatalogoCsv(readFileSync(join(DATA, "distrimay_catalogo.csv"), "utf8"));
  const resumen = await importarCatalogo(db, filas, { origen: "seed", estadoNuevos: "ACTIVO" });
  console.log("Catálogo:", resumen);

  const rutaFotos = join(DATA, "distrimay_fotos.json");
  if (existsSync(rutaFotos)) {
    console.log("Fotos:", await aplicarFotos(db, leerJsonFotos(readFileSync(rutaFotos, "utf8")), { pisar: false }));
  } else {
    console.log("Fotos: no existe data/distrimay_fotos.json, se omite (se pueden cargar desde el panel).");
  }

  const codigos = new Set((await db.product.findMany({ select: { codigo: true } })).map((p) => p.codigo));
  const ganchos = GANCHOS.filter((c) => codigos.has(c));
  await db.product.updateMany({ where: { codigo: { in: ganchos } }, data: { gancho: true } });
  console.log(`Ganchos: ${ganchos.length}/${GANCHOS.length}`);

  for (const c of COMBOS_INICIALES) {
    if (await db.combo.findUnique({ where: { slug: c.slug } })) continue; // no pisa lo editado en el panel
    const faltantes = c.items.filter(([codigo]) => !codigos.has(codigo)).map(([codigo]) => codigo);
    if (faltantes.length) console.warn(`Combo "${c.nombre}": códigos inexistentes omitidos: ${faltantes.join(", ")}`);
    await db.combo.create({
      data: {
        slug: c.slug,
        nombre: c.nombre,
        tipo: c.tipo,
        nicho: c.nicho,
        destacado: c.destacado ?? false,
        items: { create: c.items.filter(([codigo]) => codigos.has(codigo)).map(([codigo, cantidad]) => ({ codigo, cantidad: cantidad ?? 1 })) },
      },
    });
  }
  console.log(`Combos: ${await db.combo.count()}`);

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error("ADMIN_PASSWORD debe tener al menos 10 caracteres");
    const passwordHash = await bcrypt.hash(password, 12);
    await db.adminUser.upsert({ where: { email }, update: { passwordHash }, create: { email, passwordHash } });
    console.log(`Admin: ${email}`);
  } else {
    console.warn("Admin: faltan ADMIN_EMAIL / ADMIN_PASSWORD, no se creó usuario administrador.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
