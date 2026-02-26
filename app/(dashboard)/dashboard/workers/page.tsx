import Link from "next/link";
import { redirect } from "next/navigation";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FlashMessages } from "@/components/ui/flash-messages";
import { canManageWorkers, isWorkerScopedRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { deleteWorkerAction, toggleWorkerStatusAction } from "./actions";

type WorkersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getStatusFilter(value: string | string[] | undefined) {
  if (value === "activo" || value === "inactivo") {
    return value;
  }

  return "";
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
  const successMessage = getStringParam(params.success);
  const errorMessage = getStringParam(params.error);
  const currentSearch = new URLSearchParams();
  if (query.length) currentSearch.set("q", query);
  if (statusFilter) currentSearch.set("status", statusFilter);
  const currentPath = currentSearch.toString()
    ? `/dashboard/workers?${currentSearch.toString()}`
    : "/dashboard/workers";

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
    .select("id, rut, first_name, last_name, area, position, email, phone, status, updated_at")
    .order("last_name", { ascending: true });

  if (query.length) {
    workersQuery = workersQuery.or(
      `rut.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`,
    );
  }
  if (statusFilter) {
    workersQuery = workersQuery.eq("status", statusFilter);
  }

  const { data: workers, error } = await workersQuery;
  const workersCount = workers?.length ?? 0;
  const hasFilters = query.length > 0 || Boolean(statusFilter);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Trabajadores</h1>
            <p className="mt-1 text-sm text-slate-600">
              Listado con busqueda basica y estado activo/inactivo.
            </p>
            {!error ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {workersCount} {workersCount === 1 ? "registro" : "registros"}
                </span>
                {statusFilter ? (
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    Estado: {getStatusLabel(statusFilter)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {canManage ? (
            <Link
              href="/dashboard/workers/new"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Nuevo trabajador
            </Link>
          ) : null}
        </div>
      </header>

      <FlashMessages error={errorMessage} success={successMessage} />

      <form className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" method="get">
        <p className="text-sm font-medium text-slate-900">Busqueda</p>
        <label htmlFor="q" className="mt-3 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Buscar por RUT o nombre
        </label>
        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
          <input
            id="q"
            name="q"
            defaultValue={query}
            className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            placeholder="Ej: 12.345.678-9 o Perez"
          />
          <select
            id="status"
            name="status"
            defaultValue={statusFilter}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Buscar
          </button>
          {hasFilters ? (
            <Link
              href="/dashboard/workers"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
          title={hasFilters ? "No hay resultados para tu busqueda" : "Aun no hay trabajadores registrados"}
          description={
            hasFilters
              ? "Prueba con otro RUT o nombre, o limpia el filtro para ver todos los registros."
              : "Cuando registres trabajadores apareceran aqui con su estado y accesos al detalle."
          }
          actions={[
            ...(hasFilters ? [{ href: "/dashboard/workers", label: "Limpiar filtro", variant: "secondary" as const }] : []),
            ...(canManage ? [{ href: "/dashboard/workers/new", label: "Nuevo trabajador", variant: "primary" as const }] : []),
          ]}
        />
      ) : null}

      {!error && workersCount ? (
        <>
          <div className="grid gap-3 md:hidden">
            {workers?.map((worker) => (
              <article
                key={worker.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {worker.first_name} {worker.last_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{worker.rut}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusPillClass(worker.status)}`}
                  >
                    {getStatusLabel(worker.status)}
                  </span>
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
                    <dd className="truncate text-right text-slate-700" title={worker.email ?? undefined}>
                      {worker.email ?? "Sin correo"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/workers/${worker.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver
                  </Link>
                  {canManage ? (
                    <>
                      <Link
                        href={`/dashboard/workers/${worker.id}/edit`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Editar
                      </Link>
                      <form action={toggleWorkerStatusAction}>
                        <input type="hidden" name="workerId" value={worker.id} />
                        <input type="hidden" name="currentStatus" value={worker.status} />
                        <input type="hidden" name="returnTo" value={currentPath} />
                        <FormSubmitButton
                          pendingLabel={worker.status === "activo" ? "Desactivando..." : "Activando..."}
                          className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {worker.status === "activo" ? "Desactivar" : "Activar"}
                        </FormSubmitButton>
                      </form>
                    </>
                  ) : null}
                </div>

                {isAdmin ? (
                  <details className="mt-3 rounded-lg border border-red-200 bg-red-50">
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-red-700">
                      Confirmar eliminacion
                    </summary>
                    <form action={deleteWorkerAction} className="space-y-3 border-t border-red-200 px-3 py-3">
                      <input type="hidden" name="workerId" value={worker.id} />
                      <input type="hidden" name="returnTo" value={currentPath} />
                      <p className="text-xs text-red-800">
                        Eliminar a {worker.first_name} {worker.last_name}. Esta accion no se puede deshacer.
                      </p>
                      <label className="flex items-start gap-2 text-xs text-red-900">
                        <input
                          type="checkbox"
                          name="confirmDelete"
                          value="yes"
                          required
                          className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                        />
                        Confirmo que quiero eliminar este trabajador
                      </label>
                      <FormSubmitButton
                        pendingLabel="Eliminando..."
                        className="w-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Eliminar trabajador
                      </FormSubmitButton>
                    </form>
                  </details>
                ) : null}
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Trabajador</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">RUT</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Area / Cargo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workers?.map((worker) => (
                  <tr key={worker.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {worker.first_name} {worker.last_name}
                      </p>
                      <p className="text-xs text-slate-500">{worker.email ?? "Sin correo"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{worker.rut}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {worker.area ?? "Sin area"} / {worker.position ?? "Sin cargo"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusPillClass(worker.status)}`}
                      >
                        {getStatusLabel(worker.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/workers/${worker.id}`}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Ver
                        </Link>

                        {canManage ? (
                          <>
                            <Link
                              href={`/dashboard/workers/${worker.id}/edit`}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Editar
                            </Link>
                            <form action={toggleWorkerStatusAction}>
                              <input type="hidden" name="workerId" value={worker.id} />
                              <input type="hidden" name="currentStatus" value={worker.status} />
                              <input type="hidden" name="returnTo" value={currentPath} />
                              <FormSubmitButton
                                pendingLabel={worker.status === "activo" ? "Desactivando..." : "Activando..."}
                                className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                {worker.status === "activo" ? "Desactivar" : "Activar"}
                              </FormSubmitButton>
                            </form>
                            {isAdmin ? (
                              <details className="rounded-lg border border-red-200 bg-red-50">
                                <summary className="cursor-pointer list-none px-3 py-1.5 text-xs font-semibold text-red-700">
                                  Eliminar
                                </summary>
                                <form
                                  action={deleteWorkerAction}
                                  className="space-y-2 border-t border-red-200 px-3 py-2"
                                >
                                  <input type="hidden" name="workerId" value={worker.id} />
                                  <input type="hidden" name="returnTo" value={currentPath} />
                                  <p className="max-w-56 text-xs text-red-800">
                                    Eliminar a {worker.first_name} {worker.last_name}.
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
                                    className="border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                  >
                                    Eliminar
                                  </FormSubmitButton>
                                </form>
                              </details>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
