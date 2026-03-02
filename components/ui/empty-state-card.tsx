import Link from "next/link";

type EmptyStateAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type EmptyStateCardProps = {
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
};

function getActionClassName(variant: EmptyStateAction["variant"]) {
  if (variant === "primary") {
    return "bg-slate-900 text-white shadow-[0_8px_20px_-12px_rgba(15,23,42,0.75)] hover:bg-slate-800";
  }

  return "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}

export function EmptyStateCard({ title, description, actions, className }: EmptyStateCardProps) {
  return (
    <div
      className={[
        "rounded-md border border-dashed border-slate-300/90 bg-white/90 px-5 py-8 text-center shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      {actions?.length ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.href}:${action.label}`}
              href={action.href}
              className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold transition ${getActionClassName(action.variant)}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
