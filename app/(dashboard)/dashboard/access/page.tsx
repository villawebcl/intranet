import { redirect } from "next/navigation";

import { FlashMessages } from "@/components/ui/flash-messages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  canManageUsers,
  canManageWorkers,
  canViewAudit,
  canViewDocuments,
} from "@/lib/auth/roles";
import { appRoles } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { Badge } from "@/components/ui/Badge";

type AccessRolesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function roleLabel(role: (typeof appRoles)[number]) {
  if (role === "admin") return "Admin";
  if (role === "rrhh") return "RRHH";
  if (role === "contabilidad") return "Contabilidad";
  if (role === "trabajador") return "Trabajador";
  return "Visitante";
}

function yesNo(value: boolean) {
  return value ? "Si" : "No";
}

export default async function AccessRolesPage({ searchParams }: AccessRolesPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const currentRole = profile?.role ?? "visitante";
  const successMessage = getStringParam(params.success);
  const errorMessage = getStringParam(params.error);

  const matrix = appRoles.map((role) => ({
    role,
    users: canManageUsers(role),
    workers: canManageWorkers(role),
    viewDocuments: canViewDocuments(role),
    uploadDocuments:
      role === "admin" || role === "rrhh" || role === "contabilidad",
    reviewDocuments: role === "admin" || role === "rrhh",
    audit: canViewAudit(role),
  }));

  return (
    <section className="space-y-5">
      <FlashMessages error={errorMessage} success={successMessage} />

      <SectionHeader
        title="Acceso y roles"
        description="Resumen operativo de permisos por rol."
      />

      <Card>
        <CardHeader>
          <CardTitle>Matriz de permisos</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="hidden overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Rol</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Gestion usuarios</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Gestion trabajadores</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Ver documentos</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Subir</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Revisar</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Auditoria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matrix.map((row) => {
              const isCurrent = row.role === currentRole;
              return (
                <tr key={row.role} className={isCurrent ? "bg-blue-50/50" : undefined}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {roleLabel(row.role)}
                    {isCurrent ? (
                      <Badge variant="secondary" className="ml-2">actual</Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{yesNo(row.users)}</td>
                  <td className="px-4 py-3 text-slate-700">{yesNo(row.workers)}</td>
                  <td className="px-4 py-3 text-slate-700">{yesNo(row.viewDocuments)}</td>
                  <td className="px-4 py-3 text-slate-700">{yesNo(row.uploadDocuments)}</td>
                  <td className="px-4 py-3 text-slate-700">{yesNo(row.reviewDocuments)}</td>
                  <td className="px-4 py-3 text-slate-700">{yesNo(row.audit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
        </CardContent>
      </Card>
    </section>
  );
}
