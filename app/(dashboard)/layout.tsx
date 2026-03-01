import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { IdleSessionWatcher } from "@/components/auth/idle-session-watcher";
import { canManageUsers, canManageWorkers, canViewAudit, isWorkerScopedRole } from "@/lib/auth/roles";
import { getClientEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { type NavItem } from "@/components/dashboard/sidebar-nav";

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
    .select("full_name, role, worker_id")
    .eq("id", user.id)
    .maybeSingle();

  const env = getClientEnv();
  const displayName = profile?.full_name || user.email || "Usuario";
  const role = profile?.role || "visitante";
  const workerDocumentsHref =
    isWorkerScopedRole(role) && profile?.worker_id ? `/dashboard/workers/${profile.worker_id}/documents` : null;

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Inicio",
      description: "Resumen general y accesos rapidos",
    },
    ...(isWorkerScopedRole(role)
      ? workerDocumentsHref
        ? [
            {
              href: workerDocumentsHref,
              label: "Mi documentacion",
              description: "Consulta de documentos asociados a tu cuenta",
            },
          ]
        : []
      : [
          {
            href: "/dashboard/access",
            label: "Acceso y roles",
            description: "Matriz funcional y alcances por rol",
          },
        ]),
    ...(canManageUsers(profile?.role)
      ? [
          {
            href: "/dashboard/users",
            label: "Usuarios nucleo",
            description: "Gestion de cuentas internas y permisos",
          },
        ]
      : []),
    ...(!isWorkerScopedRole(role)
      ? [
          {
            href: "/dashboard/workers",
            label: "Trabajadores",
            description: canManageWorkers(profile?.role)
              ? "Gestion de trabajadores y acceso a documentos"
              : "Consulta de trabajadores segun permisos",
          },
        ]
      : []),
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
    <>
      <AppShell navItems={navItems} displayName={displayName} role={role}>
        {children}
      </AppShell>
      <IdleSessionWatcher timeoutMinutes={env.INACTIVITY_TIMEOUT_MINUTES} />
    </>
  );
}
