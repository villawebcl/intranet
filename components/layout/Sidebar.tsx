import Link from "next/link";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon?: "home" | "roles" | "users" | "workers" | "notifications" | "audit" | "documents";
};

type SidebarProps = {
  items: NavItem[];
  displayName: string;
  roleLabel: string;
  onSignOut: (formData: FormData) => void | Promise<void>;
  compactFooter?: boolean;
};

export function Sidebar({ items, displayName, roleLabel, onSignOut, compactFooter = false }: SidebarProps) {
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (compactFooter) {
    return (
      <div className="space-y-2 px-1 pb-1 pt-1">
        <div className="dashboard-shell-usercard inline-flex w-full items-center gap-2 rounded-md bg-slate-100 px-3 py-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
            {initials || "U"}
          </span>
          <span className="min-w-0 text-left">
            <p className="dashboard-shell-userrole text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-500">
              {roleLabel}
            </p>
            <p className="dashboard-shell-username truncate text-xs text-slate-700">{displayName}</p>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <form action={onSignOut}>
            <FormSubmitButton
              pendingLabel="Cerrando..."
              className="dashboard-shell-signout w-full rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cerrar sesion
            </FormSubmitButton>
          </form>
          <ThemeToggle inline />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-3 py-5">
      <Link href="/dashboard" className="dashboard-shell-brand mb-4 inline-flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-white">
        <span className="dashboard-shell-logo inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-700">
          N
        </span>
        <span>
          <span className="dashboard-shell-brand-title block text-sm font-semibold text-slate-900">Intranet Base</span>
          <span className="dashboard-shell-brand-subtitle block text-xs text-slate-500">Workspace empresarial</span>
        </span>
      </Link>

      <div className="mb-2 px-2">
        <p className="dashboard-shell-navtitle text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Navegacion</p>
      </div>
      <SidebarNav items={items} />

      <div className="dashboard-shell-sidebar-footer mt-auto space-y-3 border-t border-slate-200 px-2 pb-1 pt-4">
        <div className="dashboard-shell-usercard inline-flex w-full items-center gap-2 rounded-md bg-slate-100/90 px-3 py-2 text-left">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
            {initials || "U"}
          </span>
          <span className="min-w-0">
            <p className="dashboard-shell-userrole text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">
              {roleLabel}
            </p>
            <p className="dashboard-shell-username truncate text-sm text-slate-700">{displayName}</p>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <form action={onSignOut}>
            <FormSubmitButton
              pendingLabel="Cerrando..."
              className="dashboard-shell-signout w-full rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cerrar sesion
            </FormSubmitButton>
          </form>
          <ThemeToggle inline />
        </div>
      </div>
    </div>
  );
}
