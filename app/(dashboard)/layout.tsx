import { redirect } from "next/navigation";

import { IdleSessionWatcher } from "@/components/auth/idle-session-watcher";
import { AppShell } from "@/components/layout/AppShell";
import { canManageUsers, canManageWorkers, canViewAudit, isWorkerScopedRole } from "@/lib/auth/roles";
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
    .select("full_name, role, worker_id")
    .eq("id", user.id)
    .maybeSingle();

  const env = getClientEnv();
  const displayName = profile?.full_name || user.email || "Usuario";
  const role = profile?.role || "visitante";
  const workerDocumentsHref =
    isWorkerScopedRole(role) && profile?.worker_id ? `/dashboard/workers/${profile.worker_id}/documents` : null;
  const roleLabel =
    role === "admin"
      ? "Administrador"
      : role === "rrhh"
        ? "RRHH"
        : role === "contabilidad"
          ? "Contabilidad"
          : role === "trabajador"
            ? "Trabajador"
            : "Visitante";

  const navItems = [
    {
      href: "/dashboard",
      label: "Inicio",
      description: "Resumen general y accesos rapidos",
      icon: "home" as const,
    },
    ...(isWorkerScopedRole(role)
      ? workerDocumentsHref
        ? [
            {
              href: workerDocumentsHref,
              label: "Mi documentacion",
              description: "Consulta de documentos asociados a tu cuenta",
              icon: "documents" as const,
            },
          ]
        : []
      : [
          {
            href: "/dashboard/access",
            label: "Acceso y roles",
            description: "Matriz funcional y alcances por rol",
            icon: "roles" as const,
          },
        ]),
    ...(canManageUsers(profile?.role)
      ? [
          {
            href: "/dashboard/users",
            label: "Usuarios nucleo",
            description: "Gestion de cuentas internas y permisos",
            icon: "users" as const,
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
            icon: "workers" as const,
          },
        ]
      : []),
    ...(role === "admin"
      ? [
          {
            href: "/dashboard/notifications",
            label: "Notificaciones",
            description: "Panel admin de eventos documentales y estado de email",
            icon: "notifications" as const,
          },
        ]
      : []),
    ...(canViewAudit(profile?.role)
      ? [
          {
            href: "/dashboard/audit",
            label: "Auditoria",
            description: "Trazabilidad de eventos criticos",
            icon: "audit" as const,
          },
        ]
      : []),
  ];

  return (
    <>
      <AppShell navItems={navItems} displayName={displayName} roleLabel={roleLabel} signOutAction={signOutAction}>
        {children}
      </AppShell>
      <IdleSessionWatcher timeoutMinutes={env.INACTIVITY_TIMEOUT_MINUTES} />
    </>
  );
}
