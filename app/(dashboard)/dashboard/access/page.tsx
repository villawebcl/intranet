import Link from "next/link";
import { redirect } from "next/navigation";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { FlashMessages } from "@/components/ui/flash-messages";
import {
  canManageUsers,
  canManageWorkers,
  canViewAudit,
  canViewDocuments,
} from "@/lib/auth/roles";
import { appRoles } from "@/lib/constants/domain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { deleteUserAdminAction, updateUserAdminAction } from "../users/actions";

type AccessRolesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AccessUserRow = {
  id: string;
  email: string;
  fullName: string;
  role: (typeof appRoles)[number];
  emailConfirmed: boolean;
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
  const currentUserId = user.id;

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

  let editableUsers: AccessUserRow[] = [];
  let editableUsersLoadError: string | null = null;

  if (currentRole === "admin") {
    try {
      const adminClient = createSupabaseAdminClient();
      const { data: usersPage, error: usersError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (usersError) {
        editableUsersLoadError = `No se pudieron listar usuarios: ${usersError.message}`;
      } else {
        const authUsers = usersPage.users;
        const userIds = authUsers.map((authUser) => authUser.id);
        const { data: profiles, error: profilesError } = userIds.length
          ? await supabase.from("profiles").select("id, role, full_name").in("id", userIds)
          : { data: [], error: null };

        if (profilesError) {
          editableUsersLoadError = `No se pudieron cargar perfiles: ${profilesError.message}`;
        }

        const profilesById = new Map((profiles ?? []).map((row) => [row.id, row]));

        editableUsers = authUsers
          .map((authUser) => {
            const profileRow = profilesById.get(authUser.id);
            const metadataFullName =
              typeof authUser.user_metadata?.full_name === "string"
                ? authUser.user_metadata.full_name
                : "";

            return {
              id: authUser.id,
              email: authUser.email ?? "sin-correo",
              fullName: profileRow?.full_name ?? metadataFullName ?? "",
              role: (profileRow?.role ?? "visitante") as (typeof appRoles)[number],
              emailConfirmed: Boolean(authUser.email_confirmed_at),
            };
          })
          .sort((a, b) => a.email.localeCompare(b.email, "es"));
      }
    } catch (error) {
      editableUsersLoadError =
        error instanceof Error
          ? `No se pudo abrir la gestion de usuarios: ${error.message}`
          : "No se pudo abrir la gestion de usuarios";
    }
  }

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

      {currentRole === "admin" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Permisos por usuario</h2>
              <p className="mt-1 text-sm text-slate-600">
                Los permisos se asignan por rol. Puedes cambiarlos desde esta vista.
              </p>
            </div>
            <Link
              href="/dashboard/users"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Gestion completa de usuarios
            </Link>
          </div>

          {editableUsersLoadError ? (
            <AlertBanner className="mt-4" variant="error">
              {editableUsersLoadError}
            </AlertBanner>
          ) : null}

          {!editableUsersLoadError && !editableUsers.length ? (
            <AlertBanner className="mt-4" variant="warning">
              No se encontraron usuarios para administrar permisos.
            </AlertBanner>
          ) : null}

          {!editableUsersLoadError && editableUsers.length ? (
            <>
              <div className="mt-4 space-y-3 md:hidden">
                {editableUsers.map((row) => {
                  const isCurrentUser = row.id === currentUserId;
                  const isProtectedAdmin = row.role === "admin";

                  return (
                    <article key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{row.email}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.fullName || "Sin nombre"}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.emailConfirmed
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {row.emailConfirmed ? "Confirmado" : "Pendiente"}
                        </span>
                      </div>

                      <form action={updateUserAdminAction} className="mt-4 space-y-3">
                        <input type="hidden" name="userId" value={row.id} />
                        <input type="hidden" name="fullName" value={row.fullName} />
                        <input type="hidden" name="returnTo" value="/dashboard/access" />
                        <div className="space-y-1.5">
                          <label htmlFor={`access-role-mobile-${row.id}`} className="text-xs font-medium text-slate-700">
                            Rol / permisos
                          </label>
                          <select
                            id={`access-role-mobile-${row.id}`}
                            name="role"
                            defaultValue={row.role}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                          >
                            {appRoles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabel(role)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <FormSubmitButton
                          pendingLabel="Guardando..."
                          className="w-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                        >
                          Guardar permisos
                        </FormSubmitButton>
                      </form>

                      {isProtectedAdmin ? (
                        <AlertBanner className="mt-3" variant="info">
                          {isCurrentUser
                            ? "Tu cuenta admin esta protegida y no se puede eliminar."
                            : "Las cuentas admin estan protegidas y no se pueden eliminar."}
                        </AlertBanner>
                      ) : (
                        <details className="mt-3 rounded-lg border border-red-200 bg-red-50">
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-red-700">
                            Eliminar usuario
                          </summary>
                          <form action={deleteUserAdminAction} className="space-y-3 border-t border-red-200 px-3 py-3">
                            <input type="hidden" name="userId" value={row.id} />
                            <input type="hidden" name="returnTo" value="/dashboard/access" />
                            <label className="flex items-start gap-2 text-xs text-red-900">
                              <input
                                type="checkbox"
                                name="confirmDelete"
                                value="yes"
                                required
                                className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                              />
                              Confirmar eliminacion de {row.email}
                            </label>
                            <FormSubmitButton
                              pendingLabel="Eliminando..."
                              className="w-full border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                            >
                              Eliminar usuario
                            </FormSubmitButton>
                          </form>
                        </details>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Usuario</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Permisos (rol)</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editableUsers.map((row) => {
                      const isCurrentUser = row.id === currentUserId;
                      const isProtectedAdmin = row.role === "admin";

                      return (
                        <tr key={row.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{row.email}</td>
                          <td className="px-4 py-3 text-slate-700">{row.fullName || "Sin nombre"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                row.emailConfirmed
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {row.emailConfirmed ? "Confirmado" : "Pendiente"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <form action={updateUserAdminAction} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="userId" value={row.id} />
                              <input type="hidden" name="fullName" value={row.fullName} />
                              <input type="hidden" name="returnTo" value="/dashboard/access" />
                              <label htmlFor={`access-role-${row.id}`} className="sr-only">
                                Rol
                              </label>
                              <select
                                id={`access-role-${row.id}`}
                                name="role"
                                defaultValue={row.role}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none ring-blue-500 focus:ring-2"
                              >
                                {appRoles.map((role) => (
                                  <option key={role} value={role}>
                                    {roleLabel(role)}
                                  </option>
                                ))}
                              </select>
                              <FormSubmitButton
                                pendingLabel="Guardando..."
                                className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Guardar
                              </FormSubmitButton>
                            </form>
                          </td>
                          <td className="px-4 py-3">
                            {isProtectedAdmin ? (
                              <div className="space-y-1">
                                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                  Protegido
                                </span>
                                <p className="text-xs text-slate-600">
                                  {isCurrentUser ? "Cuenta actual admin" : "Cuenta admin"}
                                </p>
                              </div>
                            ) : (
                              <details className="w-fit rounded-lg border border-red-200 bg-red-50">
                                <summary className="cursor-pointer list-none px-3 py-1.5 text-xs font-semibold text-red-700">
                                  Eliminar
                                </summary>
                                <form
                                  action={deleteUserAdminAction}
                                  className="space-y-2 border-t border-red-200 px-3 py-2"
                                >
                                  <input type="hidden" name="userId" value={row.id} />
                                  <input type="hidden" name="returnTo" value="/dashboard/access" />
                                  <label className="flex items-start gap-2 text-xs text-red-900">
                                    <input
                                      type="checkbox"
                                      name="confirmDelete"
                                      value="yes"
                                      required
                                      className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                                    />
                                    Confirmar eliminacion
                                  </label>
                                  <FormSubmitButton
                                    pendingLabel="Eliminando..."
                                    className="border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                  >
                                    Eliminar
                                  </FormSubmitButton>
                                </form>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

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
