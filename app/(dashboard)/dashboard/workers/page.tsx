import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageContainer } from "@/components/dashboard/page-container";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { ActionMenu } from "@/components/ui/action-menu";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FlashMessages } from "@/components/ui/flash-messages";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { canManageWorkers, isWorkerScopedRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import {
  createMissingWorkerAccessesAction,
  deactivateWorkerAction,
  deleteWorkerAction,
  reactivateWorkerAction,
  toggleWorkerStatusAction,
} from "./actions";

type WorkersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const WORKERS_PAGE_SIZE = 20;

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

function getStatusFilter(value: string | string[] | undefined) {
  if (value === "activo" || value === "inactivo") {
    return value;
  }

  return "";
}

function getArchiveFilter(value: string | string[] | undefined) {
  if (value === "active" || value === "archived" || value === "all") {
    return value;
  }

  return "active";
}

function getArchiveFilterLabel(value: string) {
  if (value === "archived") {
    return "Archivados";
  }
  if (value === "all") {
    return "Todos";
  }

  return "Activos";
}

function getStatusPillClass(status: string) {
  if (status === "activo") {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-slate-200 text-slate-700";
}

function getStatusLabel(status: string) {
  return status === "activo" ? "Activo" : "Inactivo";
}

type WorkerAccessState = "sin_acceso" | "activo" | "suspendido";

function isUserSuspended(bannedUntil: string | null | undefined) {
  if (!bannedUntil) {
    return false;
  }

  const bannedUntilDate = new Date(bannedUntil);
  if (Number.isNaN(bannedUntilDate.getTime())) {
    return false;
  }

  return bannedUntilDate.getTime() > Date.now();
}

function getAccessState(workerAccessState: WorkerAccessState) {
  if (workerAccessState === "activo") {
    return {
      label: "Acceso activo",
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  if (workerAccessState === "suspendido") {
    return {
      label: "Acceso suspendido",
      className: "bg-amber-100 text-amber-800",
    };
  }

  return {
    label: "Sin acceso",
    className: "bg-slate-200 text-slate-700",
  };
}

function buildWorkersPath(
  query: string,
  statusFilter: string,
  archiveFilter: string,
  page: number,
) {
  const search = new URLSearchParams();
  if (query.length) search.set("q", query);
  if (statusFilter) search.set("status", statusFilter);
  if (archiveFilter !== "active") search.set("archive", archiveFilter);
  if (page > 1) search.set("page", String(page));

  const queryString = search.toString();
  return queryString ? `/dashboard/workers?${queryString}` : "/dashboard/workers";
}

export default async function WorkersPage({ searchParams }: WorkersPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = getStringParam(params.q);
  const statusFilter = getStatusFilter(params.status);
  const archiveFilter = getArchiveFilter(params.archive);
  const currentPage = getPageParam(params.page);
  const pageFrom = (currentPage - 1) * WORKERS_PAGE_SIZE;
  const pageTo = pageFrom + WORKERS_PAGE_SIZE - 1;
  const successMessage = getStringParam(params.success);
  const errorMessage = getStringParam(params.error);
  const currentPath = buildWorkersPath(query, statusFilter, archiveFilter, currentPage);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, worker_id")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role ?? "visitante";

  if (isWorkerScopedRole(role)) {
    if (!profile?.worker_id) {
      redirect("/dashboard?error=Tu+cuenta+trabajador+no+tiene+trabajador+asignado");
    }

    redirect(`/dashboard/workers/${profile.worker_id}/documents`);
  }

  const canManage = canManageWorkers(role);
  const isAdmin = role === "admin";
  let workersQuery = supabase
    .from("workers")
    .select(
      "id, rut, first_name, last_name, area, position, email, phone, status, is_active, updated_at",
      { count: "exact" },
    )
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .range(pageFrom, pageTo);

  if (query.length) {
    workersQuery = workersQuery.or(
      `rut.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`,
    );
  }
  if (statusFilter) {
    workersQuery = workersQuery.eq("status", statusFilter);
  }
  if (archiveFilter === "active") {
    workersQuery = workersQuery.eq("is_active", true);
  }
  if (archiveFilter === "archived") {
    workersQuery = workersQuery.eq("is_active", false);
  }

  const { data: workers, error, count } = await workersQuery;
  const workersCount = workers?.length ?? 0;
  const totalWorkersCount = count ?? 0;

  if (!error && currentPage > 1 && workersCount === 0 && totalWorkersCount > 0) {
    const lastPage = Math.max(1, Math.ceil(totalWorkersCount / WORKERS_PAGE_SIZE));
    redirect(buildWorkersPath(query, statusFilter, archiveFilter, lastPage));
  }

  const hasNextPage = !error && currentPage * WORKERS_PAGE_SIZE < totalWorkersCount;
  const previousPageHref =
    currentPage > 1 ? buildWorkersPath(query, statusFilter, archiveFilter, currentPage - 1) : null;
  const nextPageHref = hasNextPage
    ? buildWorkersPath(query, statusFilter, archiveFilter, currentPage + 1)
    : null;
  const hasFilters = query.length > 0 || Boolean(statusFilter) || archiveFilter !== "active";
  const workerAccessByWorkerId = new Map<string, WorkerAccessState>();
  let workerAccessError: string | null = null;

  if (!error && canManage && workersCount > 0) {
    try {
      const adminClient = createSupabaseAdminClient();
      const workerIds = workers?.map((worker) => worker.id) ?? [];
      const { data: profiles, error: profilesError } = await adminClient
        .from("profiles")
        .select("id, worker_id, role")
        .in("worker_id", workerIds);

      if (profilesError) {
        workerAccessError = "No se pudo cargar estado de accesos";
      } else {
        const workerProfiles = (profiles ?? []).filter(
          (profile): profile is { id: string; worker_id: string; role: string } =>
            Boolean(profile.worker_id) && profile.role === "trabajador",
        );

        const workerIdByUserId = new Map(
          workerProfiles.map((profile) => [profile.id, profile.worker_id]),
        );

        const { data: usersPage, error: usersError } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (usersError) {
          workerAccessError = "No se pudo cargar estado de accesos";
        } else {
          const usersById = new Map(usersPage.users.map((authUser) => [authUser.id, authUser]));
          workerProfiles.forEach((profile) => {
            const authUser = usersById.get(profile.id);
            if (!authUser) {
              return;
            }

            const workerId = workerIdByUserId.get(profile.id);
            if (!workerId) {
              return;
            }

            workerAccessByWorkerId.set(
              workerId,
              isUserSuspended(authUser.banned_until) ? "suspendido" : "activo",
            );
          });
        }
      }
    } catch {
      workerAccessError = "Falta configuracion de servicio para estado de accesos";
    }
  }

  const missingAccessCandidatesCount =
    canManage && !workerAccessError
      ? (workers ?? []).filter(
          (worker) =>
            worker.is_active &&
            Boolean(worker.email?.trim().length) &&
            !workerAccessByWorkerId.has(worker.id),
        ).length
      : 0;

  return (
    <DashboardPageContainer>
      <section className="space-y-6 lg:space-y-7">
        <header className="rounded-md border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Trabajadores</h1>
              <p className="mt-1 text-sm text-slate-600">
                Listado con busqueda basica, estado laboral y archivado.
              </p>
              {!error ? (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {workersCount} {workersCount === 1 ? "registro" : "registros"} en esta pagina
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {totalWorkersCount}{" "}
                    {totalWorkersCount === 1 ? "registro total" : "registros totales"}
                  </span>
                  {statusFilter ? (
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Estado: {getStatusLabel(statusFilter)}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Registro: {getArchiveFilterLabel(archiveFilter)}
                  </span>
                </div>
              ) : null}
            </div>

            {canManage ? (
              <div className="flex flex-wrap gap-2.5">
                {archiveFilter === "archived" ? (
                  <Link
                    href={buildWorkersPath(query, statusFilter, "active", 1)}
                    className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver activos
                  </Link>
                ) : (
                  <Link
                    href={buildWorkersPath(query, statusFilter, "archived", 1)}
                    className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver archivados
                  </Link>
                )}
                <Link
                  href="/dashboard/workers/new"
                  className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Nuevo trabajador
                </Link>
                {!workerAccessError && missingAccessCandidatesCount > 0 ? (
                  <details className="rounded-md border border-blue-200 bg-blue-50">
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-blue-700">
                      Crear accesos faltantes ({missingAccessCandidatesCount})
                    </summary>
                    <form
                      action={createMissingWorkerAccessesAction}
                      className="space-y-2 border-t border-blue-200 px-3 py-3"
                    >
                      <input type="hidden" name="returnTo" value={currentPath} />
                      <p className="max-w-72 text-xs text-blue-800">
                        Creara accesos para trabajadores activos con correo y sin cuenta de ingreso.
                      </p>
                      <label className="flex items-start gap-2 text-xs text-blue-900">
                        <input
                          type="checkbox"
                          name="confirmCreate"
                          value="yes"
                          required
                          className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-slate-300"
                        />
                        Confirmo la creacion masiva
                      </label>
                      <FormSubmitButton
                        pendingLabel="Creando..."
                        className="border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Ejecutar
                      </FormSubmitButton>
                    </form>
                  </details>
                ) : null}
                {!workerAccessError && missingAccessCandidatesCount === 0 ? (
                  <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    Sin accesos pendientes
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <FlashMessages error={errorMessage} success={successMessage} />
        {workerAccessError ? (
          <AlertBanner variant="warning">{workerAccessError}</AlertBanner>
        ) : null}

        <form
          className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          method="get"
        >
          <p className="text-sm font-medium text-slate-900">Busqueda</p>
          <label
            htmlFor="q"
            className="mt-4 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
          >
            Buscar por RUT o nombre
          </label>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_170px_auto_auto]">
            <input
              id="q"
              name="q"
              defaultValue={query}
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              placeholder="Ej: 12.345.678-9 o Perez"
            />
            <select
              id="status"
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
            <select
              id="archive"
              name="archive"
              defaultValue={archiveFilter}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
            >
              <option value="active">Solo activos</option>
              <option value="archived">Solo archivados</option>
              <option value="all">Todos</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Buscar
            </button>
            {hasFilters ? (
              <Link
                href="/dashboard/workers"
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>

        {error ? (
          <AlertBanner variant="error">
            No se pudo cargar el listado de trabajadores: {error.message}
          </AlertBanner>
        ) : null}

        {!error && !workersCount ? (
          <EmptyStateCard
            className="py-10 sm:py-12"
            title={
              hasFilters
                ? "No hay resultados para tu busqueda"
                : "Aun no hay trabajadores registrados"
            }
            description={
              hasFilters
                ? "Prueba con otro RUT o nombre, o limpia el filtro para ver todos los registros."
                : "Cuando registres trabajadores apareceran aqui con su estado y accesos al detalle."
            }
            actions={[
              ...(hasFilters
                ? [
                    {
                      href: "/dashboard/workers",
                      label: "Limpiar filtro",
                      variant: "secondary" as const,
                    },
                  ]
                : []),
              ...(canManage
                ? [
                    {
                      href: "/dashboard/workers/new",
                      label: "Nuevo trabajador",
                      variant: "primary" as const,
                    },
                  ]
                : []),
            ]}
          />
        ) : null}

        {!error && workersCount ? (
          <>
            <PaginationControls
              className="px-5 py-4"
              currentPage={currentPage}
              previousHref={previousPageHref}
              nextHref={nextPageHref}
              showingCount={workersCount}
              totalCount={totalWorkersCount}
            />

            <div className="grid gap-4 md:hidden">
              {workers?.map((worker) => {
                const accessState = getAccessState(
                  workerAccessByWorkerId.get(worker.id) ?? "sin_acceso",
                );

                return (
                  <Link
                    key={worker.id}
                    href={`/dashboard/workers/${worker.id}`}
                    className="block rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {worker.first_name} {worker.last_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{worker.rut}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusPillClass(worker.status)}`}
                        >
                          {getStatusLabel(worker.status)}
                        </span>
                        {canManage ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accessState.className}`}
                          >
                            {accessState.label}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <dl className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-slate-500">Area / Cargo</dt>
                        <dd className="text-right text-slate-700">
                          {worker.area ?? "Sin area"} / {worker.position ?? "Sin cargo"}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-slate-500">Correo</dt>
                        <dd
                          className="truncate text-right text-slate-700"
                          title={worker.email ?? undefined}
                        >
                          {worker.email ?? "Sin correo"}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                );
              })}
            </div>

            <div className="hidden rounded-md border border-slate-200 bg-white shadow-sm md:block">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Trabajador</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">RUT</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">
                      Area / Cargo
                    </th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Estado</th>
                    {canManage ? (
                      <th className="px-4 py-4 text-left font-semibold text-slate-700">
                        Acceso portal
                      </th>
                    ) : null}
                    {canManage ? (
                      <th className="px-4 py-4 text-left font-semibold text-slate-700">Acciones</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workers?.map((worker) => {
                    const accessState = getAccessState(
                      workerAccessByWorkerId.get(worker.id) ?? "sin_acceso",
                    );
                    const canEdit = canManage && worker.is_active;
                    const canToggleStatus = canManage && worker.is_active;
                    const canArchive = isAdmin && worker.is_active;
                    const canReactivate = isAdmin && !worker.is_active;
                    const canDelete = isAdmin && !worker.is_active;

                    return (
                      <tr key={worker.id} className="align-top hover:bg-slate-50/60">
                        <td className="px-4 py-4">
                          <Link href={`/dashboard/workers/${worker.id}`} className="block">
                            <p className="font-medium text-slate-900">
                              {worker.first_name} {worker.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{worker.email ?? "Sin correo"}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{worker.rut}</td>
                        <td className="px-4 py-4 text-slate-700">
                          {worker.area ?? "Sin area"} / {worker.position ?? "Sin cargo"}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusPillClass(worker.status)}`}
                          >
                            {getStatusLabel(worker.status)}
                          </span>
                        </td>
                        {canManage ? (
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accessState.className}`}
                            >
                              {accessState.label}
                            </span>
                          </td>
                        ) : null}
                        {canManage ? (
                          <td className="px-4 py-4">
                            <ActionMenu>
                              <div className="space-y-2">
                                <Link
                                  href={`/dashboard/workers/${worker.id}`}
                                  className="block rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Abrir ficha
                                </Link>

                                {canEdit ? (
                                  <Link
                                    href={`/dashboard/workers/${worker.id}/edit`}
                                    className="block rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Editar
                                  </Link>
                                ) : null}

                                {canToggleStatus ? (
                                  <form action={toggleWorkerStatusAction}>
                                    <input type="hidden" name="workerId" value={worker.id} />
                                    <input type="hidden" name="currentStatus" value={worker.status} />
                                    <input type="hidden" name="returnTo" value={currentPath} />
                                    <FormSubmitButton
                                      pendingLabel={
                                        worker.status === "activo"
                                          ? "Desactivando..."
                                          : "Activando..."
                                      }
                                      className="w-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      {worker.status === "activo" ? "Desactivar" : "Activar"}
                                    </FormSubmitButton>
                                  </form>
                                ) : null}

                                {canArchive ? (
                                  <details className="rounded-md border border-red-200 bg-red-50">
                                    <summary className="cursor-pointer list-none px-3 py-2 text-center text-xs font-semibold text-red-700">
                                      Archivar
                                    </summary>
                                    <form
                                      action={deactivateWorkerAction}
                                      className="space-y-2 border-t border-red-200 px-3 py-2"
                                    >
                                      <input type="hidden" name="workerId" value={worker.id} />
                                      <input type="hidden" name="returnTo" value={currentPath} />
                                      <p className="text-xs text-red-800">
                                        Archivar a {worker.first_name} {worker.last_name}.
                                      </p>
                                      <label className="flex items-start gap-2 text-xs text-red-900">
                                        <input
                                          type="checkbox"
                                          name="confirmArchive"
                                          value="yes"
                                          required
                                          className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                                        />
                                        Confirmar
                                      </label>
                                      <FormSubmitButton
                                        pendingLabel="Archivando..."
                                        className="w-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                                      >
                                        Archivar
                                      </FormSubmitButton>
                                    </form>
                                  </details>
                                ) : null}

                                {canReactivate ? (
                                  <form action={reactivateWorkerAction}>
                                    <input type="hidden" name="workerId" value={worker.id} />
                                    <input type="hidden" name="returnTo" value={currentPath} />
                                    <FormSubmitButton
                                      pendingLabel="Desarchivando..."
                                      className="w-full border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                    >
                                      Desarchivar
                                    </FormSubmitButton>
                                  </form>
                                ) : null}

                                {canDelete ? (
                                  <details className="rounded-md border border-red-200 bg-red-50">
                                    <summary className="cursor-pointer list-none px-3 py-2 text-center text-xs font-semibold text-red-700">
                                      Eliminar definitivo
                                    </summary>
                                    <form
                                      action={deleteWorkerAction}
                                      className="space-y-2 border-t border-red-200 px-3 py-2"
                                    >
                                      <input type="hidden" name="workerId" value={worker.id} />
                                      <input type="hidden" name="returnTo" value={currentPath} />
                                      <p className="text-xs text-red-800">
                                        Eliminaras permanentemente a {worker.first_name}{" "}
                                        {worker.last_name}.
                                      </p>
                                      <label className="flex items-start gap-2 text-xs text-red-900">
                                        <input
                                          type="checkbox"
                                          name="confirmDelete"
                                          value="yes"
                                          required
                                          className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                                        />
                                        Confirmar
                                      </label>
                                      <FormSubmitButton
                                        pendingLabel="Eliminando..."
                                        className="w-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                                      >
                                        Eliminar
                                      </FormSubmitButton>
                                    </form>
                                  </details>
                                ) : null}
                              </div>
                            </ActionMenu>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>

            <PaginationControls
              className="px-5 py-4"
              currentPage={currentPage}
              previousHref={previousPageHref}
              nextHref={nextPageHref}
              showingCount={workersCount}
              totalCount={totalWorkersCount}
            />
          </>
        ) : null}
      </section>
    </DashboardPageContainer>
  );
}
