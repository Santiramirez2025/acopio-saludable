export const NICHOS = [
  { id: "hoteleria", nombre: "Hotelería y cabañas" },
  { id: "gimnasios", nombre: "Gimnasios" },
  { id: "dieteticas", nombre: "Dietéticas" },
  { id: "cafeterias", nombre: "Cafeterías y panaderías" },
  { id: "rotiserias", nombre: "Rotiserías y pizzerías" },
  { id: "kioscos", nombre: "Kioscos" },
  { id: "oficinas", nombre: "Oficinas" },
  { id: "familias", nombre: "Familias" },
] as const;

export const OBJETIVOS = [
  { id: "energia", nombre: "Energía" },
  { id: "descanso", nombre: "Descanso" },
  { id: "digestion", nombre: "Digestión" },
  { id: "huesos", nombre: "Huesos y articulaciones" },
  { id: "musculo", nombre: "Músculo y entrenamiento" },
  { id: "piel", nombre: "Piel y cabello" },
  { id: "corazon", nombre: "Corazón" },
  { id: "defensas", nombre: "Defensas" },
] as const;

export type NichoId = (typeof NICHOS)[number]["id"];
export type ObjetivoId = (typeof OBJETIVOS)[number]["id"];

export const NICHO_IDS = NICHOS.map((n) => n.id) as string[];
export const OBJETIVO_IDS = OBJETIVOS.map((o) => o.id) as string[];
