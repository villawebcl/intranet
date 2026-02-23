import Link from "next/link";
import { redirect } from "next/navigation";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { FlashMessages } from "@/components/ui/flash-messages";
import { canManageWorkers } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { toggleWorkerStatusAction } from "./actions";

type WorkersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getStatusPillClass(status: string) {
  if (status === "activo") {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-slate-200 text-slate-700";
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
  const successMessage = getStringParam(params.success);
  const errorMessage = getStringParam(params.error);
  const currentPath = query.length
    ? `/dashboard/workers?q=${encodeURIComponent(query)}`
    : "/dashboard/workers";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const canManage = canManageWorkers(profile?.role);

  let workersQuery = supabase
    .from("workers")
    .select("id, rut, first_name, last_name, area, position, email, phone, status, updated_at")
    .order("last_name", { ascending: true });

  if (query.length) {
    workersQuery = workersQuery.or(
      `rut.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`,
    );
  }

  const { data: workers, error } = await workersQuery;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Trabajadores</h1>
          <p className="mt-1 text-sm text-slate-600">
            Listado con busqueda basica y estado activo/inactivo.
          </p>
        </div>

        {canManage ? (
          <Link
            href="/dashboard/workers/new"
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Nuevo trabajador
          </Link>
        ) : null}
      </header>

      <FlashMessages error={errorMessage} success={successMessage} />

      <form className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" method="get">
        <label htmlFor="q" className="text-sm font-medium text-slate-800">
          Buscar por RUT o nombre
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="q"
            name="q"
            defaultValue={query}
            className="min-w-60 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            placeholder="Ej: 12.345.678-9 o Perez"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Buscar
          </button>
          {query ? (
            <Link
              href="/dashboard/workers"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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
            {error ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-red-700">
                  No se pudo cargar el listado: {error.message}
                </td>
              </tr>
            ) : null}

            {!error && !workers?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No hay trabajadores para mostrar.
                </td>
              </tr>
            ) : null}

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
                    {worker.status}
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
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
