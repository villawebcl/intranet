import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageContainer } from "@/components/dashboard/page-container";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FlashMessages } from "@/components/ui/flash-messages";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { appRoles } from "@/lib/constants/domain";
import { getFlash } from "@/lib/flash";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import {
  createUserAdminAction,
  deleteUserAdminAction,
  resetUserPasswordAdminAction,
  updateUserAdminAction,
} from "./actions";

type UsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AuthUserRow = {
  id: string;
  email: string;
  fullName: string;
  role: (typeof appRoles)[number];
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
};

const coreUserRoles = appRoles.filter((role) => role !== "trabajador");
const USERS_PAGE_SIZE = 20;


function getPageParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildUsersPath(page: number) {
  const search = new URLSearchParams();
  if (page > 1) {
    search.set("page", String(page));
  }

  const query = search.toString();
  return query ? `/dashboard/users?${query}` : "/dashboard/users";
}

function roleLabel(role: (typeof appRoles)[number]) {
  if (role === "admin") return "Admin";
  if (role === "rrhh") return "RRHH";
  if (role === "contabilidad") return "Contabilidad";
  if (role === "trabajador") return "Trabajador";
  return "Visitante";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function isSoftDeletedAuthUser(user: unknown) {
  if (!user || typeof user !== "object") {
    return false;
  }

  const candidate = user as { deleted_at?: string | null };
  return Boolean(candidate.deleted_at);
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const [params, flash] = await Promise.all([searchParams, getFlash()]);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfile?.role !== "admin") {
    redirect("/dashboard?error=No+tienes+permisos+para+gestionar+usuarios");
  }

  let users: AuthUserRow[] = [];
  let loadError: string | null = null;
  let hasNextPage = false;
  const currentPage = getPageParam(params.page);

  try {
    const adminClient = createSupabaseAdminClient();
    const { data: usersPage, error: usersError } = await adminClient.auth.admin.listUsers({
      page: currentPage,
      perPage: USERS_PAGE_SIZE,
    });

    if (usersError) {
      loadError = `No se pudieron listar usuarios: ${usersError.message}`;
    } else {
      hasNextPage = usersPage.users.length === USERS_PAGE_SIZE;
      const authUsers = usersPage.users.filter((authUser) => !isSoftDeletedAuthUser(authUser));
      const userIds = authUsers.map((authUser) => authUser.id);
      const { data: profiles, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("id, role, full_name").in("id", userIds)
        : { data: [], error: null };

      if (profilesError) {
        loadError = `No se pudieron cargar perfiles: ${profilesError.message}`;
      }

      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      users = authUsers
        .map((authUser) => {
          const profile = profilesById.get(authUser.id);
          const metadataFullName =
            typeof authUser.user_metadata?.full_name === "string"
              ? authUser.user_metadata.full_name
              : "";

          return {
            id: authUser.id,
            email: authUser.email ?? "sin-correo",
            fullName: profile?.full_name ?? metadataFullName ?? "",
            role: (profile?.role ?? "visitante") as (typeof appRoles)[number],
            createdAt: authUser.created_at ?? null,
            lastSignInAt: authUser.last_sign_in_at ?? null,
            emailConfirmed: Boolean(authUser.email_confirmed_at),
          };
        })
        .sort((a, b) => a.email.localeCompare(b.email, "es"));
    }
  } catch (error) {
    loadError =
      error instanceof Error
        ? `No se pudo abrir la gestion de usuarios: ${error.message}`
        : "No se pudo abrir la gestion de usuarios";
  }

  const successMessage = flash.success ?? "";
  const errorMessage = flash.error ?? "";
  const filteredUsers = users.filter((row) => row.role !== "trabajador");
  const hiddenWorkersCount = users.length - filteredUsers.length;
  const returnToPath = buildUsersPath(currentPage);
  const previousPageHref = currentPage > 1 ? buildUsersPath(currentPage - 1) : null;
  const nextPageHref = hasNextPage ? buildUsersPath(currentPage + 1) : null;

  return (
    <DashboardPageContainer>
      <section className="space-y-6 lg:space-y-7">
        <FlashMessages error={errorMessage} success={successMessage} />

        <header className="rounded-xl bg-white p-6 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.08)] sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Administracion</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Usuarios nucleo
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Cuentas internas: admin, rrhh, contabilidad y visitante.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/access"
                className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Acceso y roles
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Volver al dashboard
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.06)] sm:p-7">
          <h2 className="text-lg font-semibold text-slate-950">Crear usuario</h2>
          <p className="mt-1 text-sm text-slate-600">
            Crea un usuario del nucleo y asigna su rol de acceso.
          </p>
          <form action={createUserAdminAction} className="mt-5 grid gap-5 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-1">
              <label htmlFor="create-email" className="text-sm font-medium text-slate-900">
                Correo
              </label>
              <input
                id="create-email"
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                placeholder="usuario@empresa.cl"
              />
            </div>

            <div className="space-y-1.5 lg:col-span-1">
              <label htmlFor="create-fullName" className="text-sm font-medium text-slate-900">
                Nombre completo
              </label>
              <input
                id="create-fullName"
                name="fullName"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                placeholder="Nombre Apellido"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="create-role" className="text-sm font-medium text-slate-900">
                Rol
              </label>
              <select
                id="create-role"
                name="role"
                defaultValue="visitante"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              >
                {coreUserRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="create-password" className="text-sm font-medium text-slate-900">
                Contrasena inicial
              </label>
              <input
                id="create-password"
                name="password"
                type="password"
                required
                minLength={8}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                placeholder="Minimo 8 caracteres"
              />
            </div>

            <div className="lg:col-span-4">
              <FormSubmitButton
                pendingLabel="Creando..."
                className="bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Crear usuario
              </FormSubmitButton>
            </div>
          </form>
        </section>

        <AlertBanner variant="info">
          {hiddenWorkersCount > 0
            ? `Las cuentas de rol trabajador se administran en la pestaña Trabajadores. ${hiddenWorkersCount} cuenta(s) trabajadora(s) estan ocultas en este modulo.`
            : "Las cuentas de rol trabajador se administran en la pestaña Trabajadores."}
        </AlertBanner>

        {loadError ? <AlertBanner variant="error">{loadError}</AlertBanner> : null}

        {!loadError ? (
          <section className="rounded-xl bg-white p-6 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Usuarios registrados</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {filteredUsers.length} {filteredUsers.length === 1 ? "usuario" : "usuarios"} en
                  esta pagina.
                </p>
              </div>
            </div>

            <PaginationControls
              className="mt-5 px-5 py-4"
              currentPage={currentPage}
              previousHref={previousPageHref}
              nextHref={nextPageHref}
              showingCount={filteredUsers.length}
            />

            {!filteredUsers.length ? (
              <EmptyStateCard
                className="mt-6 py-10 sm:py-12"
                title="No hay usuarios nucleo registrados"
                description="Cuando crees cuentas internas (admin, rrhh, contabilidad o visitante), apareceran listadas aqui."
              />
            ) : (
              <>
                <div className="mt-5 space-y-4 xl:hidden">
                  {filteredUsers.map((row) => {
                    const isCurrentUser = row.id === user.id;
                    const isProtectedAdmin = row.role === "admin";

                    return (
                      <article
                        key={row.id}
                        className="rounded-md border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{row.email}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {row.fullName || "Sin nombre"}
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                            {roleLabel(row.role)}
                          </span>
                        </div>

                        <dl className="mt-3 grid gap-2 text-xs text-slate-600">
                          <div className="flex items-start justify-between gap-3">
                            <dt>Confirmado</dt>
                            <dd>{row.emailConfirmed ? "Si" : "No"}</dd>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <dt>Ultimo acceso</dt>
                            <dd className="text-right">{formatDate(row.lastSignInAt)}</dd>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <dt>Creado</dt>
                            <dd className="text-right">{formatDate(row.createdAt)}</dd>
                          </div>
                        </dl>

                        <form action={updateUserAdminAction} className="mt-4 space-y-3">
                          <input type="hidden" name="userId" value={row.id} />
                          <input type="hidden" name="returnTo" value={returnToPath} />
                          <div className="space-y-1.5">
                            <label
                              htmlFor={`fullName-mobile-${row.id}`}
                              className="text-xs font-medium text-slate-700"
                            >
                              Nombre
                            </label>
                            <input
                              id={`fullName-mobile-${row.id}`}
                              name="fullName"
                              defaultValue={row.fullName}
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label
                              htmlFor={`role-mobile-${row.id}`}
                              className="text-xs font-medium text-slate-700"
                            >
                              Rol
                            </label>
                            <select
                              id={`role-mobile-${row.id}`}
                              name="role"
                              defaultValue={row.role}
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                            >
                              {coreUserRoles.map((role) => (
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
                            Guardar cambios
                          </FormSubmitButton>
                        </form>

                        <form action={resetUserPasswordAdminAction} className="mt-3 space-y-2">
                          <input type="hidden" name="userId" value={row.id} />
                          <input type="hidden" name="returnTo" value={returnToPath} />
                          <label
                            htmlFor={`password-mobile-${row.id}`}
                            className="text-xs font-medium text-slate-700"
                          >
                            Nueva contrasena
                          </label>
                          <input
                            id={`password-mobile-${row.id}`}
                            name="password"
                            type="password"
                            minLength={8}
                            required
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                            placeholder="Minimo 8 caracteres"
                          />
                          <FormSubmitButton
                            pendingLabel="Actualizando..."
                            className="w-full border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            Resetear contrasena
                          </FormSubmitButton>
                        </form>

                        {isProtectedAdmin ? (
                          <AlertBanner className="mt-3" variant="info">
                            {isCurrentUser
                              ? "Tu cuenta admin esta protegida y no se puede eliminar desde esta pantalla."
                              : "Las cuentas admin estan protegidas y no se pueden eliminar."}
                          </AlertBanner>
                        ) : (
                          <details className="mt-3 rounded-md border border-red-200 bg-red-50">
                            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-red-700">
                              Eliminar usuario
                            </summary>
                            <form
                              action={deleteUserAdminAction}
                              className="space-y-3 border-t border-red-200 px-3 py-3"
                            >
                              <input type="hidden" name="userId" value={row.id} />
                              <input type="hidden" name="returnTo" value={returnToPath} />
                              <p className="text-xs text-red-800">
                                Eliminar el acceso de {row.email}. Esta accion no se puede deshacer.
                              </p>
                              <label className="flex items-start gap-2 text-xs text-red-900">
                                <input
                                  type="checkbox"
                                  name="confirmDelete"
                                  value="yes"
                                  required
                                  className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                                />
                                Confirmo que quiero eliminar este usuario
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

                <div className="mt-5 hidden overflow-x-auto rounded-xl shadow-[0_2px_20px_-8px_rgba(15,23,42,0.08)] xl:block">
                  <table className="w-full table-fixed divide-y divide-slate-100 bg-white text-sm">
                    <colgroup>
                      <col className="w-[20%]" />
                      <col className="w-[13%]" />
                      <col className="w-[12%]" />
                      <col className="w-[25%]" />
                      <col className="w-[30%]" />
                    </colgroup>
                    <thead className="bg-[#f7f7f5]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          Usuario
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Estado</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          Ultimo acceso
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          Perfil / rol
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          Clave / baja
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((row) => {
                        const isCurrentUser = row.id === user.id;
                        const isProtectedAdmin = row.role === "admin";

                        return (
                          <tr key={row.id} className="align-top">
                            <td className="px-4 py-4 align-top">
                              <p className="truncate font-medium text-slate-900" title={row.email}>
                                {row.email}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500" title={row.id}>
                                {row.id}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                Creado: {formatDate(row.createdAt)}
                              </p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="space-y-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    row.emailConfirmed
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {row.emailConfirmed ? "Confirmado" : "Sin confirmar"}
                                </span>
                                <p className="break-words text-xs text-slate-600">
                                  Rol: {roleLabel(row.role)}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top text-slate-700">
                              <p className="break-words text-xs leading-5 md:text-sm">
                                {formatDate(row.lastSignInAt)}
                              </p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <form action={updateUserAdminAction} className="space-y-2">
                                <input type="hidden" name="userId" value={row.id} />
                                <input type="hidden" name="returnTo" value={returnToPath} />
                                <label htmlFor={`fullName-${row.id}`} className="sr-only">
                                  Nombre completo
                                </label>
                                <input
                                  id={`fullName-${row.id}`}
                                  name="fullName"
                                  defaultValue={row.fullName}
                                  className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-xs text-slate-900 outline-none ring-slate-300 focus:ring-2"
                                  placeholder="Nombre completo"
                                />
                                <label htmlFor={`role-${row.id}`} className="sr-only">
                                  Rol
                                </label>
                                <div className="grid gap-2">
                                  <select
                                    id={`role-${row.id}`}
                                    name="role"
                                    defaultValue={row.role}
                                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none ring-slate-300 focus:ring-2"
                                  >
                                    {coreUserRoles.map((role) => (
                                      <option key={role} value={role}>
                                        {roleLabel(role)}
                                      </option>
                                    ))}
                                  </select>
                                  <FormSubmitButton
                                    pendingLabel="Guardando..."
                                    className="w-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    Guardar
                                  </FormSubmitButton>
                                </div>
                              </form>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <form action={resetUserPasswordAdminAction} className="grid gap-2">
                                <input type="hidden" name="userId" value={row.id} />
                                <input type="hidden" name="returnTo" value={returnToPath} />
                                <label htmlFor={`password-${row.id}`} className="sr-only">
                                  Nueva contrasena
                                </label>
                                <input
                                  id={`password-${row.id}`}
                                  name="password"
                                  type="password"
                                  minLength={8}
                                  required
                                  className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-xs text-slate-900 outline-none ring-slate-300 focus:ring-2"
                                  placeholder="Nueva clave"
                                />
                                <FormSubmitButton
                                  pendingLabel="Actualizando..."
                                  className="w-full border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                >
                                  Resetear
                                </FormSubmitButton>
                              </form>
                              {isProtectedAdmin ? (
                                <div className="mt-2 space-y-1">
                                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                    Protegido
                                  </span>
                                  <p className="text-xs text-slate-600">
                                    {isCurrentUser ? "Cuenta actual admin" : "Cuenta admin"}
                                  </p>
                                </div>
                              ) : (
                                <details className="mt-2 rounded-md border border-red-200 bg-red-50">
                                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-red-700">
                                    Eliminar
                                  </summary>
                                  <form
                                    action={deleteUserAdminAction}
                                    className="space-y-2 border-t border-red-200 px-3 py-2"
                                  >
                                    <input type="hidden" name="userId" value={row.id} />
                                    <input type="hidden" name="returnTo" value={returnToPath} />
                                    <p className="break-all text-xs text-red-800">{row.email}</p>
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
                                      className="w-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
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

                <PaginationControls
                  className="mt-5 px-5 py-4"
                  currentPage={currentPage}
                  previousHref={previousPageHref}
                  nextHref={nextPageHref}
                  showingCount={filteredUsers.length}
                />
              </>
            )}
          </section>
        ) : null}
      </section>
    </DashboardPageContainer>
  );
}
