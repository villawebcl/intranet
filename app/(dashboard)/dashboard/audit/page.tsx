import Link from "next/link";
import { redirect } from "next/navigation";

import { canViewAudit } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
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

  if (!canViewAudit(profile?.role)) {
    redirect("/dashboard?error=No+tienes+permisos+para+ver+auditoria");
  }

  const urlParams = await searchParams;
  const actionFilter = getStringParam(urlParams.action);
  const entityFilter = getStringParam(urlParams.entity);

  let query = supabase
    .from("audit_logs")
    .select("id, actor_user_id, actor_role, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (actionFilter) {
    query = query.ilike("action", `%${actionFilter}%`);
  }
  if (entityFilter) {
    query = query.ilike("entity_type", `%${entityFilter}%`);
  }

  const { data: logs, error } = await query;

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Auditoria</h1>
            <p className="mt-1 text-sm text-slate-600">
              Eventos criticos del sistema (ultimos 200 registros).
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Volver al dashboard
          </Link>
        </div>
      </header>

      <form className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" method="get">
        <p className="text-sm font-medium text-slate-900">Filtros</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="action" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Accion
            </label>
            <input
              id="action"
              name="action"
              defaultValue={actionFilter}
              placeholder="document_uploaded"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="entity" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Entidad
            </label>
            <input
              id="entity"
              name="entity"
              defaultValue={entityFilter}
              placeholder="document o worker"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Aplicar
            </button>
            <Link
              href="/dashboard/audit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Accion</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Actor</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Entidad</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-red-700">
                  No se pudieron cargar logs: {error.message}
                </td>
              </tr>
            ) : null}

            {!error && !logs?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No hay eventos para este filtro.
                </td>
              </tr>
            ) : null}

            {logs?.map((log) => (
              <tr key={log.id} className="align-top">
                <td className="px-4 py-3 text-slate-700">{formatDate(log.created_at)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{log.action}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <p>{log.actor_role ?? "sin rol"}</p>
                  <p>{log.actor_user_id ?? "sin usuario"}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <p>{log.entity_type ?? "sin entidad"}</p>
                  <p>{log.entity_id ?? "sin id"}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <pre className="max-w-72 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
