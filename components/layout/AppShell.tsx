import type { ReactNode } from "react";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon?: "home" | "roles" | "users" | "workers" | "notifications" | "audit" | "documents";
};

type AppShellProps = {
  navItems: NavItem[];
  displayName: string;
  roleLabel: string;
  signOutAction: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
};

export function AppShell({ navItems, displayName, roleLabel, signOutAction, children }: AppShellProps) {
  const sidebarToggleId = "dashboard-sidebar-toggle";

  return (
    <div className="dashboard-shell min-h-screen">
      <Topbar displayName={displayName} roleLabel={roleLabel} onSignOut={signOutAction} navItems={navItems} />

      <div className="relative flex w-full">
        <input id={sidebarToggleId} type="checkbox" className="peer/sidebar sr-only hidden md:block" />

        <aside
          className={[
            "dashboard-shell-sidebar hidden h-[calc(100vh-73px)] w-72 shrink-0 overflow-hidden border-r border-slate-200/80 bg-white/80 backdrop-blur-sm transition-[width] duration-300 ease-out md:fixed md:left-0 md:top-[73px] md:block",
            "peer-checked/sidebar:w-0 peer-checked/sidebar:border-r-0",
          ].join(" ")}
        >
          <Sidebar items={navItems} />
        </aside>

        <label
          htmlFor={sidebarToggleId}
          className={[
            "fixed top-[92px] z-30 hidden h-11 w-7 cursor-pointer items-center justify-center rounded-r-md border border-l-0 border-slate-200 bg-white text-sm font-semibold text-slate-600 transition-all duration-300 ease-out md:inline-flex",
            "left-72 peer-checked/sidebar:left-0",
          ].join(" ")}
          aria-label="Alternar barra lateral"
          title="Alternar barra lateral"
        >
          <span className="peer-checked/sidebar:hidden">‹</span>
          <span className="hidden peer-checked/sidebar:inline">›</span>
        </label>

        <div className="min-w-0 flex-1 md:pl-72 peer-checked/sidebar:md:pl-0">
          <div className="px-4 pt-4 md:hidden">
            <div className="dashboard-shell-mobile-nav rounded-lg border border-slate-200/80 bg-white/90 p-2 shadow-sm">
              <SidebarNav items={navItems} compact />
            </div>
          </div>
          <main className="dashboard-content min-w-0 overflow-x-hidden px-4 pb-8 pt-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
