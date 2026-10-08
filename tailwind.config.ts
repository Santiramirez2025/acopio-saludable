import type { Config } from "tailwindcss";

// Sistema visual de Acopio Saludable.
// Tinta verde casi negra, verde hoja para acciones tranquilas, menta para superficies y
// amarillo "sol" reservado para una sola cosa: comprar.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Figtree Variable"', "Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        acopio: { 50: "#F1F6F2", 100: "#DCEEE3", 500: "#1B8A63", 600: "#0F6B4F", 700: "#0B5540", 900: "#10251C" },
        tierra: { 50: "#F1F6F2", 100: "#E6F0E9", 200: "#D2E2D8", 500: "#A66F00", 700: "#6B4A00" },
        sol: { DEFAULT: "#FFC83D", claro: "#FFE08A", oscuro: "#E0A800" },
      },
      boxShadow: {
        dock: "0 -6px 24px -8px rgba(16,37,28,.28)",
        ficha: "0 1px 0 rgba(16,37,28,.04), 0 10px 24px -18px rgba(16,37,28,.45)",
      },
    },
  },
  plugins: [],
};
export default config;
