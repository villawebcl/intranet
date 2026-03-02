"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  description?: string;
};

type RemoteSearchItem = {
  id: string;
  type: "worker" | "document";
  href: string;
  label: string;
  subtitle: string;
  meta?: string;
};

type HeaderSearchProps = {
  items: NavItem[];
};

type SearchEntry = {
  key: string;
  href: string;
  label: string;
  subtitle?: string;
  badge: "Nav" | "Trabajador" | "Documento";
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function HeaderSearch({ items }: HeaderSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [workers, setWorkers] = useState<RemoteSearchItem[]>([]);
  const [documents, setDocuments] = useState<RemoteSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navResults = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      return items;
    }

    return items.filter((item) => {
      const haystack = `${item.label} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const entries = useMemo<SearchEntry[]>(() => {
    const navEntries = navResults.slice(0, 6).map((item) => ({
      key: `nav:${item.href}`,
      href: item.href,
      label: item.label,
      subtitle: item.description,
      badge: "Nav" as const,
    }));

    const workerEntries = workers.map((item) => ({
      key: `worker:${item.id}`,
      href: item.href,
      label: item.label,
      subtitle: item.subtitle,
      badge: "Trabajador" as const,
    }));

    const documentEntries = documents.map((item) => ({
      key: `document:${item.id}`,
      href: item.href,
      label: item.label,
      subtitle: item.subtitle,
      badge: "Documento" as const,
    }));

    return [...navEntries, ...workerEntries, ...documentEntries];
  }, [navResults, workers, documents]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setWorkers([]);
      setDocuments([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/header-search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setWorkers([]);
          setDocuments([]);
          return;
        }

        const payload = (await response.json()) as {
          workers?: RemoteSearchItem[];
          documents?: RemoteSearchItem[];
        };

        setWorkers(payload.workers ?? []);
        setDocuments(payload.documents ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setWorkers([]);
          setDocuments([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  function navigateTo(href: string) {
    setOpen(false);
    setQuery("");
    setWorkers([]);
    setDocuments([]);
    router.push(href);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeActiveIndex = entries.length > 0 ? Math.min(activeIndex, entries.length - 1) : 0;
    const selected = entries[safeActiveIndex] ?? entries[0];
    if (selected) {
      navigateTo(selected.href);
    }
  }

  function handleBlur() {
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 120);
  }

  function handleFocus() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(true);
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <div className="flex items-stretch overflow-hidden rounded-md border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-slate-300">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-slate-400">
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="search"
              placeholder="Buscar modulo, trabajador o documento..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={(event) => {
                if (!open) {
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((prev) => (prev + 1) % Math.max(entries.length, 1));
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((prev) => (prev - 1 + Math.max(entries.length, 1)) % Math.max(entries.length, 1));
                }

                if (event.key === "Escape") {
                  setOpen(false);
                  inputRef.current?.blur();
                }
              }}
              className="w-full border-0 bg-transparent py-2 pl-9 pr-3 text-sm text-slate-700 outline-none"
            />
          </label>
        </div>
      </form>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {loading ? <p className="px-3 py-2 text-xs text-slate-500">Buscando...</p> : null}
          {!loading && !entries.length ? (
            <p className="px-3 py-2 text-xs text-slate-500">Sin resultados</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {entries.map((item, index) => {
                const safeActiveIndex = entries.length > 0 ? Math.min(activeIndex, entries.length - 1) : 0;
                const active = index === safeActiveIndex;

                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => navigateTo(item.href)}
                      className={[
                        "flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition",
                        active ? "bg-slate-100" : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                        {item.subtitle ? (
                          <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>
                        ) : null}
                      </span>
                      <span className="inline-flex shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {item.badge}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
