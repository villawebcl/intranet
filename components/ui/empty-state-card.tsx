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
    return "bg-slate-900 text-white hover:bg-slate-800";
  }

  return "bg-slate-100 text-slate-700 hover:bg-slate-200";
}

export function EmptyStateCard({ title, description, actions, className }: EmptyStateCardProps) {
  return (
    <div
      className={[
        "rounded-xl bg-white px-6 py-10 text-center shadow-[0_2px_20px_-8px_rgba(15,23,42,0.08)]",
        className ?? "",
      ].join(" ")}
    >
      <div className="mx-auto h-8 w-8 rounded-full bg-slate-100" aria-hidden />
      <h2 className="mt-4 text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-1.5 text-sm text-slate-500">{description}</p>

      {actions?.length ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.href}:${action.label}`}
              href={action.href}
              className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${getActionClassName(action.variant)}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
