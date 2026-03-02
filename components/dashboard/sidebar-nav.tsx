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
    return <i aria-hidden className="fi fi-rs-home text-[16px] leading-none" />;
  }
  if (icon === "roles") {
    return <i aria-hidden className="fi fi-br-stats text-[16px] leading-none" />;
  }
  if (icon === "users") {
    return <i aria-hidden className="fi fi-rs-user text-[16px] leading-none" />;
  }
  if (icon === "workers") {
    return <i aria-hidden className="fi fi-rs-apps text-[16px] leading-none" />;
  }
  if (icon === "notifications") {
    return <i aria-hidden className="fi fi-rs-edit text-[16px] leading-none" />;
  }
  if (icon === "audit") {
    return <i aria-hidden className="fi fi-rr-info text-[16px] leading-none" />;
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
                "dashboard-nav-link dashboard-nav-link-compact relative inline-flex items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-xs font-medium transition",
                active
                  ? "dashboard-nav-link-active bg-slate-200 text-slate-900 hover:bg-slate-200"
                  : "bg-[#f3f4f6] text-slate-700 hover:bg-slate-200",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "absolute bottom-1 left-0 top-1 w-0.5 rounded-r transition",
                  active ? "bg-slate-800" : "bg-transparent",
                ].join(" ")}
              />
              <span className="inline-flex h-5 w-5 items-center justify-center text-slate-600">
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
              "dashboard-nav-link group relative block rounded px-3.5 py-3 transition",
              active
                ? "dashboard-nav-link-active bg-slate-200 text-slate-900 hover:bg-slate-200"
                : "text-slate-700 hover:bg-slate-100/80",
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
                  "inline-flex h-7 w-7 items-center justify-center text-xs",
                  active
                    ? "text-slate-700"
                    : "text-slate-500 group-hover:text-slate-700",
                ].join(" ")}
              >
                <NavIconGlyph icon={item.icon} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
