export const SITIO = {
  nombre: "Acopio Saludable",
  base: "Villa Carlos Paz, Córdoba",
  descripcion:
    "Productos saludables por volumen para negocios y familias: frutos secos, cereales, suplementos, snacks y especias. Envíos a todo el país.",
};

export function urlSitio(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export const AVISO_SUPLEMENTOS = "Los suplementos dietarios no reemplazan una dieta variada. Consultá a tu médico.";
