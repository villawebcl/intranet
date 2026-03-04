import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function SectionHeader({ title, description, actionHref, actionLabel }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
