"use client";

import { useEffect, useRef } from "react";

/** Deja la charla scrolleada al último mensaje cuando se abre o llega uno nuevo. */
export function AlFinal({ marca }: { marca: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [marca]);
  return <div ref={ref} />;
}
