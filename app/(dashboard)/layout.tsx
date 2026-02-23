import { redirect } from "next/navigation";
import Link from "next/link";

import { IdleSessionWatcher } from "@/components/auth/idle-session-watcher";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { canManageUsers, canManageWorkers, canViewAudit } from "@/lib/auth/roles";
import { getClientEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { signOutAction } from "./actions";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const env = getClientEnv();
  const displayName = profile?.full_name || user.email || "Usuario";
  const role = profile?.role || "visitante";
  const navItems = [
    {
      href: "/dashboard",
      label: "Inicio",
      description: "Resumen general y accesos rapidos",
    },
    {
      href: "/dashboard/access",
      label: "Acceso y roles",
      description: "Matriz funcional y alcances por rol",
    },
    ...(canManageUsers(profile?.role)
      ? [
          {
            href: "/dashboard/users",
            label: "Usuarios",
            description: "Crear accesos y asignar roles",
          },
        ]
      : []),
    {
      href: "/dashboard/workers",
      label: "Trabajadores",
      description: canManageWorkers(profile?.role)
        ? "Gestion de trabajadores y acceso a documentos"
        : "Consulta de trabajadores segun permisos",
    },
    ...(role === "admin"
      ? [
          {
            href: "/dashboard/notifications",
            label: "Notificaciones",
            description: "Panel admin de eventos documentales y estado de email",
          },
        ]
      : []),
    ...(canViewAudit(profile?.role)
      ? [
          {
            href: "/dashboard/audit",
            label: "Auditoria",
            description: "Trazabilidad de eventos criticos",
          },
        ]
      : []),
  ];

  return (
    <div className="dashboard-shell min-h-screen">
      <header className="dashboard-shell-header sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-7xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="dashboard-shell-brand inline-flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-white/70"
            >
              <span className="dashboard-shell-logo inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm">
                A
              </span>
              <span>
                <span className="dashboard-shell-brand-title block text-sm font-semibold text-slate-900">
                  Intranet Anagami
                </span>
                <span className="dashboard-shell-brand-subtitle block text-xs text-slate-500">
                  Gestion documental interna
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="dashboard-shell-usercard rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-right shadow-sm">
                <p className="dashboard-shell-userrole text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {role}
                </p>
                <p className="dashboard-shell-username max-w-52 truncate text-sm text-slate-700">
                  {displayName}
                </p>
              </div>
              <form action={signOutAction}>
                <FormSubmitButton
                  pendingLabel="Cerrando..."
                  className="dashboard-shell-signout border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Cerrar sesion
                </FormSubmitButton>
              </form>
            </div>
          </div>

          <div className="mt-3 md:hidden">
            <div className="dashboard-shell-mobile-nav rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
              <SidebarNav items={navItems} compact />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="dashboard-shell-sidebar sticky top-24 rounded-3xl border border-white/80 bg-white/75 p-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <div className="mb-2 px-2 pt-1">
              <p className="dashboard-shell-navtitle text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Navegacion
              </p>
            </div>
            <SidebarNav items={navItems} />
          </div>
        </aside>
        <main className="dashboard-content min-w-0 pb-8">{children}</main>
      </div>

      <IdleSessionWatcher timeoutMinutes={env.INACTIVITY_TIMEOUT_MINUTES} />
    </div>
  );
}
