'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

export interface NavItem {
  href: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SidebarNavProps {
  items: NavItem[];
  compact?: boolean;
}

export function SidebarNav({ items, compact }: SidebarNavProps) {
  const pathname = usePathname();

  if (!items.length) {
    return null;
  }

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
            "hover:bg-slate-100 dark:hover:bg-slate-700",
            pathname.startsWith(item.href) ? "bg-slate-100 dark:bg-slate-700" : "bg-transparent",
            item.disabled && "pointer-events-none cursor-not-allowed opacity-50",
          )}
        >
          <span>{item.label}</span>
          {item.description && !compact && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{item.description}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
