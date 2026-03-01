import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FlashMessages } from "@/components/ui/flash-messages";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { appRoles } from "@/lib/constants/domain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import {
  createUserAdminAction,
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

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

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
  const params = await searchParams;
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

  const successMessage = getStringParam(params.success);
  const errorMessage = getStringParam(params.error);
  const filteredUsers = users.filter((row) => row.role !== "trabajador");
  const hiddenWorkersCount = users.length - filteredUsers.length;
  const previousPageHref = currentPage > 1 ? buildUsersPath(currentPage - 1) : null;
  const nextPageHref = hasNextPage ? buildUsersPath(currentPage + 1) : null;

  return (
    <section className="space-y-6 lg:space-y-7">
        <FlashMessages error={errorMessage} success={successMessage} />

        <SectionHeader
            title="Usuarios nucleo"
            description="Gestion de cuentas internas: admin, rrhh, contabilidad y visitante."
        />

        <Card>
            <CardHeader>
                <CardTitle>Crear usuario</CardTitle>
            </CardHeader>
            <CardContent>
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
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
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
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
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
                className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
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
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
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
            </CardContent>
        </Card>

        <AlertBanner variant="info">
          {hiddenWorkersCount > 0
            ? `Las cuentas de rol trabajador se administran en la pestaña Trabajadores. ${hiddenWorkersCount} cuenta(s) trabajadora(s) estan ocultas en este modulo.`
            : "Las cuentas de rol trabajador se administran en la pestaña Trabajadores."}
        </AlertBanner>

        {loadError ? <AlertBanner variant="error">{loadError}</AlertBanner> : null}

        {!loadError ? (
          <Card>
            <CardHeader>
                <CardTitle>Usuarios registrados</CardTitle>
                <PaginationControls
                    currentPage={currentPage}
                    previousHref={previousPageHref}
                    nextHref={nextPageHref}
                    showingCount={filteredUsers.length}
                />
            </CardHeader>
            <CardContent>
            {!filteredUsers.length ? (
              <EmptyStateCard
                className="mt-6 py-10 sm:py-12"
                title="No hay usuarios nucleo registrados"
                description="Cuando crees cuentas internas (admin, rrhh, contabilidad o visitante), apareceran listadas aqui."
              />
            ) : (
                <div className="mt-5 hidden overflow-x-auto rounded-sm border border-slate-200 xl:block">
                  <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-4 text-left font-semibold text-slate-700">
                          Usuario
                        </th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-700">Estado</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-700">
                          Ultimo acceso
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((row) => {
                        return (
                          <tr key={row.id} className="align-top">
                            <td className="px-4 py-4 align-top">
                              <p className="truncate font-medium text-slate-900" title={row.email}>
                                {row.email}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500" title={row.id}>
                                {row.id}
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}
            </CardContent>
          </Card>
        ) : null}
      </section>
  );
}
