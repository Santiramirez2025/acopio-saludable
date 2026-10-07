import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        acopio: { 50: "#f4f7f0", 100: "#e6eddc", 500: "#5d7f3a", 600: "#4a672d", 700: "#3a5124", 900: "#1f2c14" },
        tierra: { 100: "#f3ebdd", 500: "#b0793a" },
      },
    },
  },
  plugins: [],
};
export default config;
