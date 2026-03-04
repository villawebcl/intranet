import type { ComponentPropsWithoutRef, ReactNode } from "react";

type CardTone = "default" | "muted" | "accent" | "warning";

type CardProps = {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
} & Omit<ComponentPropsWithoutRef<"section">, "className" | "children">;

const toneClasses: Record<CardTone, string> = {
  default: "bg-white",
  muted: "bg-[#fbfbfa]",
  accent: "bg-slate-50/70",
  warning: "bg-amber-50/50",
};

export function Card({ children, className = "", tone = "default", ...rest }: CardProps) {
  return (
    <section
      {...rest}
      className={[
        "rounded-xl border-0 p-5 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.09)]",
        toneClasses[tone],
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
