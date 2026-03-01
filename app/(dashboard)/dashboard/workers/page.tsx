import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { ActionMenu } from "@/components/ui/action-menu";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FlashMessages } from "@/components/ui/flash-messages";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { canManageWorkers, isWorkerScopedRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import {
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
  const workerAccessError: string | null = null;

  return (
    <section className="space-y-6 lg:space-y-7">
        <SectionHeader
        title="Trabajadores"
        description="Listado con busqueda basica, estado laboral y archivado."
      />

        <FlashMessages error={errorMessage} success={successMessage} />
        {workerAccessError ? (
          <AlertBanner variant="warning">{workerAccessError}</AlertBanner>
        ) : null}

        <Card>
        <CardHeader>
          <CardTitle>Busqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_170px_auto_auto]">
                <input
                id="q"
                name="q"
                defaultValue={query}
                className="min-w-0 rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                placeholder="Ej: 12.345.678-9 o Perez"
                />
                <select
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                >
                <option value="">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
                </select>
                <select
                id="archive"
                name="archive"
                defaultValue={archiveFilter}
                className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                >
                <option value="active">Solo activos</option>
                <option value="archived">Solo archivados</option>
                <option value="all">Todos</option>
                </select>
                <button
                type="submit"
                className="rounded-sm bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                Buscar
                </button>
                {hasFilters ? (
                <Link
                    href="/dashboard/workers"
                    className="rounded-sm border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Limpiar
                </Link>
                ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

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
            <Card>
<CardHeader>
  <PaginationControls
    currentPage={currentPage}
    previousHref={previousPageHref}
    nextHref={nextPageHref}
    showingCount={workersCount}
    totalCount={totalWorkersCount}
  />
</CardHeader>
<CardContent>
  <div className="hidden rounded-sm border border-slate-200 bg-white shadow-sm md:block">
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
                        className="block rounded-sm border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Abrir ficha
                      </Link>

                      {canEdit ? (
                        <Link
                          href={`/dashboard/workers/${worker.id}/edit`}
                          className="block rounded-sm border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
                        <details className="rounded-sm border border-red-200 bg-red-50">
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
                        <details className="rounded-sm border border-red-200 bg-red-50">
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
</CardContent>
</Card>
          </>
        ) : null}
      </section>
  );
}
