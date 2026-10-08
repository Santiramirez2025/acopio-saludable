// Provincias, zonas de envío (medidas desde Córdoba) y códigos postales.

export const ZONAS = [
  { id: "cordoba", nombre: "Córdoba" },
  { id: "centro", nombre: "Centro, Cuyo y Buenos Aires" },
  { id: "norte", nombre: "Norte y Litoral" },
  { id: "patagonia", nombre: "Patagonia" },
] as const;
export type ZonaId = (typeof ZONAS)[number]["id"];

export const PROVINCIAS: { nombre: string; zona: ZonaId }[] = [
  { nombre: "Buenos Aires", zona: "centro" },
  { nombre: "Ciudad Autónoma de Buenos Aires", zona: "centro" },
  { nombre: "Catamarca", zona: "centro" },
  { nombre: "Chaco", zona: "norte" },
  { nombre: "Chubut", zona: "patagonia" },
  { nombre: "Córdoba", zona: "cordoba" },
  { nombre: "Corrientes", zona: "norte" },
  { nombre: "Entre Ríos", zona: "centro" },
  { nombre: "Formosa", zona: "norte" },
  { nombre: "Jujuy", zona: "norte" },
  { nombre: "La Pampa", zona: "centro" },
  { nombre: "La Rioja", zona: "centro" },
  { nombre: "Mendoza", zona: "centro" },
  { nombre: "Misiones", zona: "norte" },
  { nombre: "Neuquén", zona: "patagonia" },
  { nombre: "Río Negro", zona: "patagonia" },
  { nombre: "Salta", zona: "norte" },
  { nombre: "San Juan", zona: "centro" },
  { nombre: "San Luis", zona: "centro" },
  { nombre: "Santa Cruz", zona: "patagonia" },
  { nombre: "Santa Fe", zona: "centro" },
  { nombre: "Santiago del Estero", zona: "centro" },
  { nombre: "Tierra del Fuego", zona: "patagonia" },
  { nombre: "Tucumán", zona: "centro" },
];

export function zonaDeProvincia(provincia: string): ZonaId | null {
  return PROVINCIAS.find((p) => p.nombre === provincia)?.zona ?? null;
}

/** Acepta "5152" o el formato largo "X5152ABC". Devuelve los 4 dígitos o null. */
export function normalizarCp(cp: string): string | null {
  const m = cp.trim().toUpperCase().match(/^[A-Z]?(\d{4})[A-Z]{0,3}$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1000 && n <= 9499 ? m[1] : null;
}

/** Lista de CP con entrega propia: códigos sueltos y rangos, ej. "5152, 5000-5022". */
export function cpEnLista(cp: string, lista: string): boolean {
  const n = Number(cp);
  if (!Number.isInteger(n)) return false;
  return lista.split(/[,;\s]+/).some((parte) => {
    const m = parte.match(/^(\d{4})(?:-(\d{4}))?$/);
    if (!m) return false;
    const desde = Number(m[1]);
    const hasta = m[2] ? Number(m[2]) : desde;
    return n >= desde && n <= hasta;
  });
}

export function validarListaCp(lista: string): string {
  const partes = lista.split(/[,;\s]+/).filter(Boolean);
  for (const p of partes) if (!/^\d{4}(-\d{4})?$/.test(p)) throw new Error(`Código postal inválido en la lista: "${p}". Usá 5152 o rangos como 5000-5022.`);
  return partes.join(",");
}
