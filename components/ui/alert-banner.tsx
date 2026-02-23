type AlertVariant = "success" | "error" | "warning" | "info";

type AlertBannerProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  variant?: AlertVariant;
};

function variantClassName(variant: AlertVariant) {
  if (variant === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (variant === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (variant === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-blue-200 bg-blue-50 text-blue-800";
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
        "rounded-lg border px-3 py-2 text-sm",
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
