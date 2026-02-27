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
        "flex flex-wrap items-center justify-between gap-2 rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="text-slate-600">
        {totalCount === null ? (
          <span>
            Mostrando {showingCount} resultados · Pagina {currentPage}
          </span>
        ) : (
          <span>
            Mostrando {showingCount} de {totalCount} resultados · Pagina {currentPage}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {previousHref ? (
          <Link
            href={previousHref}
            className="rounded-sm border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Anterior
          </Link>
        ) : (
          <span className="rounded-sm border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400">
            Anterior
          </span>
        )}

        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-sm border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Siguiente
          </Link>
        ) : (
          <span className="rounded-sm border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400">
            Siguiente
          </span>
        )}
      </div>
    </div>
  );
}
