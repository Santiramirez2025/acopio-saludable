export const SITIO = {
  nombre: "Acopio Saludable",
  base: "Villa Carlos Paz, Córdoba",
  descripcion:
    "Dietética online por volumen para familias y negocios: frutos secos, cereales, harinas, productos sin TACC, suplementos y especias. Entrega a domicilio en Villa Carlos Paz y el sur de Punilla, y envíos a todo el país.",
};

export function urlSitio(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export const AVISO_SUPLEMENTOS = "Los suplementos dietarios no reemplazan una dieta variada. Consultá a tu médico.";
