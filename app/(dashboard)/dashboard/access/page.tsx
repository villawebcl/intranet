import Link from "next/link";
import { redirect } from "next/navigation";

import { FlashMessages } from "@/components/ui/flash-messages";
import { getFlash } from "@/lib/flash";
import {
  canManageUsers,
  canManageWorkers,
  canViewAudit,
  canViewDocuments,
} from "@/lib/auth/roles";
import { appRoles } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";


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

export default async function AccessRolesPage() {
  const flash = await getFlash();
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
  const successMessage = flash.success ?? "";
  const errorMessage = flash.error ?? "";

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

      <header className="rounded-xl bg-white p-6 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Configuracion</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Acceso y roles</h1>
            <p className="mt-1 text-sm text-slate-500">
              Resumen operativo de permisos por rol.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              Rol: {roleLabel(currentRole)}
            </span>
            <Link
              href="/dashboard"
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Volver al dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Politica de acceso</h2>
            <p className="mt-1 text-sm text-slate-500">
              La asignacion de roles y la gestion de cuentas se realiza en Usuarios.
            </p>
          </div>
          {currentRole === "admin" ? (
            <Link
              href="/dashboard/users"
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Ir a Usuarios
            </Link>
          ) : null}
        </div>
      </section>

      <div className="hidden overflow-x-auto rounded-xl bg-white shadow-[0_2px_20px_-8px_rgba(15,23,42,0.08)] md:block">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-[#f7f7f5]">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Rol</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Usuarios</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Trabajadores</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Ver docs</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Subir</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Revisar</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Auditoria</th>
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
                "rounded-md border bg-white p-4 shadow-sm",
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
