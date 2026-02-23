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
      <nav aria-label="Navegacion del dashboard" className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
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
    <nav aria-label="Navegacion del dashboard" className="space-y-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "block rounded-xl border px-3 py-3 transition",
              active
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white",
            ].join(" ")}
          >
            <p className={["text-sm font-semibold", active ? "text-white" : "text-slate-900"].join(" ")}>
              {item.label}
            </p>
            {item.description ? (
              <p
                className={[
                  "mt-1 text-xs leading-relaxed",
                  active ? "text-slate-200" : "text-slate-500",
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
