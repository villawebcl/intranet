type AlertVariant = "success" | "error" | "warning" | "info";

type AlertBannerProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  variant?: AlertVariant;
};

function variantClassName(variant: AlertVariant) {
  if (variant === "success") {
    return "border-l-[3px] border-l-emerald-500 bg-emerald-50/60 text-emerald-800";
  }
  if (variant === "error") {
    return "border-l-[3px] border-l-red-500 bg-red-50/60 text-red-700";
  }
  if (variant === "warning") {
    return "border-l-[3px] border-l-amber-400 bg-amber-50/60 text-amber-800";
  }
  return "border-l-[3px] border-l-blue-400 bg-blue-50/60 text-blue-800";
}

export function AlertBanner({
  children,
  className,
  title,
  variant = "info",
}: AlertBannerProps) {
  return (
    <div
      className={[
        "rounded-lg border-0 px-4 py-3 text-sm",
        variantClassName(variant),
        className ?? "",
      ].join(" ")}
      role={variant === "error" ? "alert" : "status"}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-0.5" : ""}>{children}</div>
    </div>
  );
}
