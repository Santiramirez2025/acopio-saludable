import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Acopio Saludable", template: "%s · Acopio Saludable" },
  description: "Productos saludables por volumen para negocios y familias. Envíos a todo el país desde Villa Carlos Paz.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
