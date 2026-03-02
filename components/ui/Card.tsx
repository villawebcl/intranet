import type { ComponentPropsWithoutRef, ReactNode } from "react";

type CardTone = "default" | "muted" | "accent" | "warning";

type CardProps = {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
} & Omit<ComponentPropsWithoutRef<"section">, "className" | "children">;

const toneClasses: Record<CardTone, string> = {
  default: "border-slate-200 bg-white",
  muted: "border-slate-200 bg-[#fbfbfa]",
  accent: "border-slate-300 bg-slate-50/70",
  warning: "border-amber-200 bg-amber-50/50",
};

export function Card({ children, className = "", tone = "default", ...rest }: CardProps) {
  return (
    <section
      {...rest}
      className={[
        "rounded-lg border p-5",
        toneClasses[tone],
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
