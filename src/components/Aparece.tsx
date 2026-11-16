"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReveal } from "@/lib/useReveal";

export default function Aparece({
  children,
  retraso = 0,
  className = "",
}: {
  children: ReactNode;
  retraso?: number;
  className?: string;
}) {
  const { ref, visto } = useReveal<HTMLDivElement>();
  const estilo: CSSProperties = { transitionDelay: retraso + "ms" };
  return (
    <div
      ref={ref}
      className={["apa", visto ? "in" : "", className].filter(Boolean).join(" ")}
      style={estilo}
    >
      {children}
    </div>
  );
}
