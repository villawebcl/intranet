import Link from "next/link";

type PaginationControlsProps = {
  currentPage: number;
  previousHref: string | null;
  nextHref: string | null;
  showingCount: number;
  totalCount?: number | null;
  className?: string;
};

export function PaginationControls({
  currentPage,
  previousHref,
  nextHref,
  showingCount,
  totalCount = null,
  className = "",
}: PaginationControlsProps) {
  return (
    <div
      className={[
        "flex flex-wrap items-center justify-between gap-2 py-2",
        className,
      ].join(" ")}
    >
      <p className="text-xs text-slate-400">
        {totalCount === null ? (
          <>
            {showingCount} resultados &middot; p.{currentPage}
          </>
        ) : (
          <>
            {showingCount} de {totalCount} &middot; p.{currentPage}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {previousHref ? (
          <Link
            href={previousHref}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            ← Anterior
          </Link>
        ) : (
          <span className="rounded-lg bg-slate-100/50 px-3 py-1.5 text-xs font-semibold text-slate-300">
            ← Anterior
          </span>
        )}

        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Siguiente →
          </Link>
        ) : (
          <span className="rounded-lg bg-slate-100/50 px-3 py-1.5 text-xs font-semibold text-slate-300">
            Siguiente →
          </span>
        )}
      </div>
    </div>
  );
}
