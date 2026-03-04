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
        <div className="dashboard-shell-usercard inline-flex w-full items-center gap-2.5 rounded-lg bg-slate-100 px-3 py-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
            {initials || "U"}
          </span>
          <span className="min-w-0 text-left">
            <p className="dashboard-shell-userrole text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {roleLabel}
            </p>
            <p className="dashboard-shell-username truncate text-xs font-medium text-slate-700">{displayName}</p>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <form action={onSignOut}>
            <FormSubmitButton
              pendingLabel="Cerrando..."
              className="dashboard-shell-signout w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
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
      {/* Brand */}
      <Link
        href="/dashboard"
        className="dashboard-shell-brand mb-5 inline-flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50"
      >
        <span className="dashboard-shell-logo inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-900 text-[11px] font-bold text-white">
          IB
        </span>
        <span>
          <span className="dashboard-shell-brand-title block text-sm font-semibold text-slate-900">Intranet Base</span>
          <span className="dashboard-shell-brand-subtitle block text-[11px] text-slate-400">Workspace empresarial</span>
        </span>
      </Link>

      {/* Nav label */}
      <div className="mb-1.5 px-2">
        <p className="dashboard-shell-navtitle text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Navegacion
        </p>
      </div>

      <SidebarNav items={items} />

      {/* Footer */}
      <div className="dashboard-shell-sidebar-footer mt-auto pt-4">
        <div className="border-t border-slate-100 pt-4">
          <div className="dashboard-shell-usercard flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              {initials || "U"}
            </span>
            <span className="min-w-0 flex-1">
              <p className="dashboard-shell-userrole text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {roleLabel}
              </p>
              <p className="dashboard-shell-username truncate text-sm font-medium text-slate-800">{displayName}</p>
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <form action={onSignOut}>
              <FormSubmitButton
                pendingLabel="Cerrando..."
                className="dashboard-shell-signout w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cerrar sesion
              </FormSubmitButton>
            </form>
            <ThemeToggle inline />
          </div>
        </div>
      </div>
    </div>
  );
}
