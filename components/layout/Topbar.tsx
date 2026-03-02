import Link from "next/link";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { HeaderSearch } from "@/components/layout/header-search";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  description?: string;
};

type TopbarProps = {
  displayName: string;
  roleLabel: string;
  onSignOut: (formData: FormData) => void | Promise<void>;
  navItems: NavItem[];
};

export function Topbar({ displayName, roleLabel, onSignOut, navItems }: TopbarProps) {
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="dashboard-shell-header sticky top-0 z-20 border-b border-white/70 bg-white/82 backdrop-blur-lg">
      <div className="w-full px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="dashboard-shell-brand inline-flex items-center gap-3 rounded-md px-1.5 py-1.5 transition hover:bg-white"
          >
            <span className="dashboard-shell-logo inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700">
              N
            </span>
            <span>
              <span className="dashboard-shell-brand-title block text-sm font-semibold text-slate-900">Intranet Base</span>
              <span className="dashboard-shell-brand-subtitle block text-xs text-slate-500">Workspace empresarial</span>
            </span>
          </Link>

          <div className="hidden min-w-[320px] max-w-md flex-1 xl:block">
            <HeaderSearch items={navItems} />
          </div>

          <div className="flex items-center gap-3">
            <div className="dashboard-shell-usercard inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-right">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                {initials || "U"}
              </span>
              <span>
                <p className="dashboard-shell-userrole text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500">
                  {roleLabel}
                </p>
                <p className="dashboard-shell-username max-w-52 truncate text-sm text-slate-700">{displayName}</p>
              </span>
            </div>
            <form action={onSignOut}>
              <FormSubmitButton
                pendingLabel="Cerrando..."
                className="dashboard-shell-signout rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar sesion
              </FormSubmitButton>
            </form>
            <ThemeToggle inline />
          </div>
        </div>
      </div>
    </header>
  );
}
