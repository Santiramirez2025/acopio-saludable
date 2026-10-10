/** Texto corrido para páginas informativas: ancho de lectura cómodo y jerarquía clara. */
export function Prosa({ children }: { children: React.ReactNode }) {
  return <div className="max-w-2xl space-y-4 text-[15px] leading-relaxed text-stone-700 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-acopio-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>;
}
