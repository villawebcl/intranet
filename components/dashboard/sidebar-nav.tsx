"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavIcon = "home" | "roles" | "users" | "workers" | "notifications" | "audit" | "documents";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon?: NavIcon;
};

type SidebarNavProps = {
  items: NavItem[];
  compact?: boolean;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIconGlyph({ icon }: { icon?: NavIcon }) {
  const baseClass = "h-3.5 w-3.5";
  if (icon === "home") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M6.5 10.5V20h11V10.5" />
      </svg>
    );
  }
  if (icon === "roles") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }
  if (icon === "users") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <circle cx="9" cy="9" r="3" />
        <path d="M4 18c.8-2.3 2.5-3.5 5-3.5s4.2 1.2 5 3.5" />
        <path d="M16 8h4M16 12h4" />
      </svg>
    );
  }
  if (icon === "workers") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <rect x="4" y="4" width="7" height="7" />
        <rect x="13" y="4" width="7" height="7" />
        <rect x="4" y="13" width="7" height="7" />
        <rect x="13" y="13" width="7" height="7" />
      </svg>
    );
  }
  if (icon === "notifications") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <path d="M12 4a4 4 0 0 0-4 4v2.5c0 1.8-.6 3.5-1.7 4.9L5 17h14l-1.3-1.6a7.5 7.5 0 0 1-1.7-4.9V8a4 4 0 0 0-4-4Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    );
  }
  if (icon === "audit") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <path d="M12 4 5 7.5V12c0 4.1 2.8 6.9 7 8 4.2-1.1 7-3.9 7-8V7.5L12 4Z" />
        <path d="m9.5 12 1.7 1.7 3.3-3.3" />
      </svg>
    );
  }
  if (icon === "documents") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4M10 12h5M10 16h5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function SidebarNav({ items, compact = false }: SidebarNavProps) {
  const pathname = usePathname();

  if (compact) {
    return (
      <nav aria-label="Navegacion del dashboard" className="dashboard-sidebar-nav flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "dashboard-nav-link dashboard-nav-link-compact relative inline-flex items-center gap-2 whitespace-nowrap rounded border px-3 py-2 text-xs font-medium transition",
                active
                  ? "dashboard-nav-link-active border-slate-200/70 bg-white text-slate-900 hover:bg-slate-100"
                  : "border-slate-200/60 bg-[#fbfbfa] text-slate-700 hover:border-slate-200/80 hover:bg-slate-100",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "absolute bottom-1 left-0 top-1 w-0.5 rounded-r transition",
                  active ? "bg-slate-800" : "bg-transparent",
                ].join(" ")}
              />
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-600">
                <NavIconGlyph icon={item.icon} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Navegacion del dashboard" className="dashboard-sidebar-nav space-y-1.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
            className={[
              "dashboard-nav-link group relative block rounded border px-3.5 py-3 transition",
              active
                ? "dashboard-nav-link-active border-slate-200/70 bg-white text-slate-900 hover:bg-slate-100"
                : "border-transparent text-slate-700 hover:border-slate-200/80 hover:bg-slate-100/80",
            ].join(" ")}
          >
              <span
                aria-hidden
                className={[
                  "absolute bottom-1 left-0 top-1 w-0.5 rounded-r transition",
                  active ? "bg-slate-800" : "bg-transparent group-hover:bg-slate-300",
                ].join(" ")}
              />
              <div className="flex items-center gap-2.5">
                <span
                  className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded border text-xs",
                  active
                    ? "border-slate-300 bg-slate-100 text-slate-700"
                    : "border-slate-200 bg-[#f3f3f1] text-slate-500 group-hover:border-slate-300 group-hover:text-slate-700",
                ].join(" ")}
              >
                <NavIconGlyph icon={item.icon} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                {item.description ? (
                  <p className={[
                    "mt-0.5 truncate text-xs leading-relaxed",
                    active ? "text-slate-600" : "text-slate-500",
                  ].join(" ")}>
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
