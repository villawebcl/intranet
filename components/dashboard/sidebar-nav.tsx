"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  description?: string;
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
                "dashboard-nav-link dashboard-nav-link-compact whitespace-nowrap rounded-sm border px-3 py-2 text-xs font-semibold shadow-sm transition",
                active
                  ? "dashboard-nav-link-active border-blue-200 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Navegacion del dashboard" className="dashboard-sidebar-nav space-y-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "dashboard-nav-link block rounded-sm border px-3.5 py-3 transition",
              active
                ? "dashboard-nav-link-active border-slate-200 bg-white text-slate-900 shadow-sm"
                : "border-transparent text-slate-700 hover:border-slate-200/80 hover:bg-white/80",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={[
                  "dashboard-nav-link-dot inline-block h-2 w-2 rounded-full",
                  active ? "bg-blue-500" : "bg-slate-300",
                ].join(" ")}
              />
              <p className={["text-sm font-semibold", active ? "text-slate-900" : "text-slate-900"].join(" ")}>
                {item.label}
              </p>
            </div>
            {item.description ? (
              <p
                className={[
                  "mt-1 text-xs leading-relaxed",
                  active ? "text-slate-600" : "text-slate-500",
                ].join(" ")}
              >
                {item.description}
              </p>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
