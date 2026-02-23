import { redirect } from "next/navigation";
import Link from "next/link";

import { IdleSessionWatcher } from "@/components/auth/idle-session-watcher";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { canManageWorkers, canViewAudit, canViewDocuments } from "@/lib/auth/roles";
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
      description: "Resumen del MVP y accesos rapidos",
    },
    {
      href: "/dashboard/access",
      label: "Acceso y roles",
      description: "Matriz funcional y alcances por rol",
    },
    {
      href: "/dashboard/workers",
      label: "Trabajadores",
      description: canManageWorkers(profile?.role)
        ? "Gestion de trabajadores y acceso a documentos"
        : "Consulta de trabajadores segun permisos",
    },
    ...(canViewDocuments(profile?.role)
      ? [
          {
            href: "/dashboard/notifications",
            label: "Notificaciones",
            description: "Eventos documentales y estado de email",
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
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-900 hover:text-slate-700">
              Intranet Anagami
            </Link>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{role}</p>
                <p className="max-w-52 truncate text-sm text-slate-700">{displayName}</p>
              </div>
              <form action={signOutAction}>
                <FormSubmitButton
                  pendingLabel="Cerrando..."
                  className="border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cerrar sesion
                </FormSubmitButton>
              </form>
            </div>
          </div>

          <div className="mt-3 md:hidden">
            <SidebarNav items={navItems} compact />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <SidebarNav items={navItems} />
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>

      <IdleSessionWatcher timeoutMinutes={env.INACTIVITY_TIMEOUT_MINUTES} />
    </div>
  );
}
