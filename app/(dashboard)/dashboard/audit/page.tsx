import Link from "next/link";
import { redirect } from "next/navigation";

import { canViewAudit } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MetadataRecord = Record<string, unknown> | null;

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

function formatActionLabel(action: string) {
  if (!action) {
    return "sin accion";
  }

  return action.replaceAll("_", " ");
}

function truncateMiddle(value: string, start = 8, end = 6) {
  if (!value || value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function asMetadataRecord(metadata: unknown): MetadataRecord {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

function getMetadataField(metadata: MetadataRecord, key: string) {
  if (!metadata) {
    return "";
  }

  const value = metadata[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) {
    return "null";
  }

  return "";
}

function metadataFieldLabel(key: string) {
  if (key === "method") return "Metodo";
  if (key === "source") return "Origen";
  if (key === "reason") return "Motivo";
  if (key === "workerId") return "Trabajador";
  if (key === "documentId") return "Documento";
  if (key === "status") return "Estado";
  if (key === "decision") return "Decision";
  if (key === "previousStatus") return "Estado previo";
  if (key === "nextStatus") return "Estado nuevo";
  if (key === "rejectionReason") return "Rechazo";

  return key;
}

function getMetadataSummary(metadataValue: unknown) {
  const metadata = asMetadataRecord(metadataValue);
  const orderedKeys = [
    "method",
    "source",
    "reason",
    "status",
    "decision",
    "previousStatus",
    "nextStatus",
    "workerId",
    "documentId",
    "rejectionReason",
  ] as const;

  return orderedKeys
    .map((key) => ({ key, value: getMetadataField(metadata, key) }))
    .filter((item) => item.value);
}

function ActionBadge({ action }: { action: string }) {
  const tone =
    action.startsWith("auth_")
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : action.startsWith("document_")
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : action.startsWith("worker_")
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <div className="space-y-1">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
        {formatActionLabel(action)}
      </span>
      <p className="font-mono text-[11px] text-slate-500">{action}</p>
    </div>
  );
}

function MetadataSummary({ metadataValue }: { metadataValue: unknown }) {
  const summary = getMetadataSummary(metadataValue);

  if (!summary.length) {
    return <p className="text-xs text-slate-500">Sin metadata estructurada.</p>;
  }

  return (
    <dl className="space-y-1.5">
      {summary.map(({ key, value }) => (
        <div key={key} className="grid grid-cols-[96px_1fr] items-start gap-2">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {metadataFieldLabel(key)}
          </dt>
          <dd
            className={
              key.endsWith("Id")
                ? "break-all font-mono text-xs text-slate-700"
                : "break-words text-xs text-slate-700"
            }
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MetadataJsonDetails({ metadataValue }: { metadataValue: unknown }) {
  if (!metadataValue) {
    return null;
  }

  return (
    <details className="group mt-2 rounded-lg border border-slate-200 bg-white/70">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-700">
        <span className="group-open:hidden">Ver JSON</span>
        <span className="hidden group-open:inline">Ocultar JSON</span>
      </summary>
      <pre className="max-h-48 overflow-auto border-t border-slate-200 px-3 py-2 text-xs text-slate-700">
        {JSON.stringify(metadataValue, null, 2)}
      </pre>
    </details>
  );
}

function ActorCell({
  actorRole,
  actorUserId,
}: {
  actorRole: string | null;
  actorUserId: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{actorRole ?? "sin rol"}</p>
      <p className="break-all font-mono text-xs text-slate-700">{actorUserId ?? "sin usuario"}</p>
    </div>
  );
}

function EntityCell({
  entityType,
  entityId,
}: {
  entityType: string | null;
  entityId: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {entityType ?? "sin entidad"}
      </p>
      <p className="break-all font-mono text-xs text-slate-700">{entityId ?? "sin id"}</p>
    </div>
  );
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
  const rows = logs ?? [];

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
        {!error ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              {rows.length} registros
            </span>
            {actionFilter ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                Accion: {actionFilter}
              </span>
            ) : null}
            {entityFilter ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                Entidad: {entityFilter}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      <form className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" method="get">
        <p className="text-sm font-medium text-slate-900">Filtros</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
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
          <div className="flex items-end gap-2 lg:pb-0.5">
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

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          No se pudieron cargar logs: {error.message}
        </div>
      ) : null}

      {!error && !rows.length ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">No hay eventos para este filtro.</p>
          <p className="mt-1 text-sm text-slate-500">
            Ajusta los filtros o limpia la busqueda para ver los ultimos registros.
          </p>
        </div>
      ) : null}

      {!error && rows.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((log) => (
              <article key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-600">{formatDate(log.created_at)}</p>
                    <div className="mt-2">
                      <ActionBadge action={log.action} />
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Actor</p>
                    <ActorCell actorRole={log.actor_role} actorUserId={log.actor_user_id} />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Entidad</p>
                    <EntityCell entityType={log.entity_type} entityId={log.entity_id} />
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <MetadataSummary metadataValue={log.metadata} />
                  <MetadataJsonDetails metadataValue={log.metadata} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
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
                {rows.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {log.actor_role ?? "sin rol"}
                        </p>
                        <span
                          title={log.actor_user_id ?? "sin usuario"}
                          className="inline-block max-w-44 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"
                        >
                          {truncateMiddle(log.actor_user_id ?? "sin usuario")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {log.entity_type ?? "sin entidad"}
                        </p>
                        <span
                          title={log.entity_id ?? "sin id"}
                          className="inline-block max-w-44 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"
                        >
                          {truncateMiddle(log.entity_id ?? "sin id")}
                        </span>
                      </div>
                    </td>
                    <td className="min-w-[320px] px-4 py-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <MetadataSummary metadataValue={log.metadata} />
                        <MetadataJsonDetails metadataValue={log.metadata} />
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
