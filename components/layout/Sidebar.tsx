'use client';

import { SidebarNav, type NavItem } from "@/components/dashboard/sidebar-nav";
import Link from 'next/link';

interface SidebarProps {
    navItems: NavItem[];
}

export default function Sidebar({ navItems }: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
        <div className="p-4">
            <Link
              href="/dashboard"
              className="dashboard-shell-brand inline-flex items-center gap-3 rounded-sm px-1 py-1 hover:bg-white/70"
            >
              <span className="dashboard-shell-logo inline-flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm">
                A
              </span>
              <span>
                <span className="dashboard-shell-brand-title block text-sm font-semibold text-slate-900">
                  Intranet Base
                </span>
                <span className="dashboard-shell-brand-subtitle block text-xs text-slate-500">
                  Gestion documental interna
                </span>
              </span>
            </Link>
        </div>
        <div className="mb-2 px-2 pt-1">
              <p className="dashboard-shell-navtitle text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Navegacion
              </p>
        </div>
        <div className="p-2">
            <SidebarNav items={navItems} />
        </div>
    </div>
  );
}
