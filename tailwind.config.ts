import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { display: ["ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"] },
      colors: {
        acopio: { 50: "#f4f7f0", 100: "#e6eddc", 500: "#5d7f3a", 600: "#4a672d", 700: "#3a5124", 900: "#1f2c14" },
        tierra: { 50: "#faf7f0", 100: "#f3ebdd", 200: "#e6d8bf", 500: "#b0793a", 700: "#7c5325" },
      },
    },
  },
  plugins: [],
};
export default config;
