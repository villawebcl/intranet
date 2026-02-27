import Link from "next/link";
import { redirect } from "next/navigation";

import { FlashMessages } from "@/components/ui/flash-messages";
import {
  canManageUsers,
  canManageWorkers,
  canViewAudit,
  canViewDocuments,
} from "@/lib/auth/roles";
import { appRoles } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

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

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Acceso y roles</h1>
            <p className="mt-1 text-sm text-slate-600">
              Resumen operativo de permisos por rol.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Volver al dashboard
          </Link>
        </div>
        <div className="mt-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Rol actual: {roleLabel(currentRole)}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Uso recomendado</h2>
            <p className="mt-1 text-sm text-slate-600">
              Esta vista muestra la politica de permisos por rol. La asignacion de roles y la
              gestion de cuentas se realiza en Usuarios.
            </p>
          </div>
          {currentRole === "admin" ? (
            <Link
              href="/dashboard/users"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ir a Usuarios
            </Link>
          ) : null}
        </div>
      </section>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
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
                      <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        actual
                      </span>
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

      <div className="space-y-3 md:hidden">
        {matrix.map((row) => {
          const isCurrent = row.role === currentRole;
          return (
            <article
              key={row.role}
              className={[
                "rounded-xl border bg-white p-4 shadow-sm",
                isCurrent ? "border-blue-200" : "border-slate-200",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{roleLabel(row.role)}</p>
                {isCurrent ? (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    actual
                  </span>
                ) : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt className="text-slate-500">Trabajadores</dt>
                <dd className="text-slate-700">{yesNo(row.workers)}</dd>
                <dt className="text-slate-500">Usuarios</dt>
                <dd className="text-slate-700">{yesNo(row.users)}</dd>
                <dt className="text-slate-500">Ver docs</dt>
                <dd className="text-slate-700">{yesNo(row.viewDocuments)}</dd>
                <dt className="text-slate-500">Subir</dt>
                <dd className="text-slate-700">{yesNo(row.uploadDocuments)}</dd>
                <dt className="text-slate-500">Revisar</dt>
                <dd className="text-slate-700">{yesNo(row.reviewDocuments)}</dd>
                <dt className="text-slate-500">Auditoria</dt>
                <dd className="text-slate-700">{yesNo(row.audit)}</dd>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
