import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageContainer } from "@/components/dashboard/page-container";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { canViewAudit } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MetadataRecord = Record<string, unknown> | null;
type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
};

const AUDIT_PAGE_SIZE = 50;

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

function buildAuditPath(actionFilter: string, entityFilter: string, page: number) {
  const search = new URLSearchParams();
  if (actionFilter) {
    search.set("action", actionFilter);
  }
  if (entityFilter) {
    search.set("entity", entityFilter);
  }
  if (page > 1) {
    search.set("page", String(page));
  }

  const query = search.toString();
  return query ? `/dashboard/audit?${query}` : "/dashboard/audit";
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

function formatActionTitle(action: string) {
  if (action === "auth_login") return "Inicio de sesion";
  if (action === "auth_logout") return "Cierre de sesion";
  if (action === "document_uploaded") return "Documento cargado";
  if (action === "document_approved") return "Documento aprobado";
  if (action === "document_rejected") return "Documento rechazado";
  if (action === "document_downloaded") return "Documento descargado";
  if (action === "worker_created") return "Trabajador creado";
  if (action === "worker_updated") return "Trabajador actualizado";
  if (action === "worker_status_changed") return "Cambio de estado de trabajador";

  return formatActionLabel(action);
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

function formatRoleLabel(role: string | null) {
  if (!role) return "Sin rol";
  if (role === "admin") return "Administrador";
  if (role === "rrhh") return "RRHH";
  if (role === "contabilidad") return "Contabilidad";
  if (role === "trabajador") return "Trabajador";
  if (role === "visitante") return "Visitante";
  return role;
}

function formatEntityLabel(entityType: string | null) {
  if (!entityType) return "Sin entidad";
  if (entityType === "auth") return "Autenticacion";
  if (entityType === "document") return "Documento";
  if (entityType === "worker") return "Trabajador";
  return entityType;
}

function formatMetadataValueForDisplay(key: string, value: string) {
  if (!value) return value;

  if (key === "method") {
    if (value === "password") return "Contrasena";
    return value;
  }

  if (key === "source") {
    if (value === "browser") return "Navegador";
    return value;
  }

  if (key === "reason") {
    if (value === "manual") return "Cierre manual";
    if (value === "timeout") return "Inactividad (timeout)";
    return value;
  }

  if (key === "decision") {
    if (value === "aprobado") return "Aprobado";
    if (value === "rechazado") return "Rechazado";
    return value;
  }

  if (key === "status" || key === "previousStatus" || key === "nextStatus") {
    if (value === "pendiente") return "Pendiente";
    if (value === "aprobado") return "Aprobado";
    if (value === "rechazado") return "Rechazado";
    if (value === "activo") return "Activo";
    if (value === "inactivo") return "Inactivo";
    return value;
  }

  return value;
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
  const tone = action.startsWith("auth_")
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : action.startsWith("document_")
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : action.startsWith("worker_")
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      title={action}
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium leading-none ${tone}`}
    >
      {formatActionTitle(action)}
    </span>
  );
}

function MetadataSummary({
  metadataValue,
  compact = false,
}: {
  metadataValue: unknown;
  compact?: boolean;
}) {
  const summary = getMetadataSummary(metadataValue);

  if (!summary.length) {
    return <p className="text-xs text-slate-500">Sin metadata estructurada.</p>;
  }

  const visible = compact ? summary.slice(0, 2) : summary;
  const hiddenCount = compact ? Math.max(0, summary.length - visible.length) : 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map(({ key, value }) => (
        <span
          key={key}
          title={`${metadataFieldLabel(key)}: ${formatMetadataValueForDisplay(key, value)}`}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1"
        >
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {metadataFieldLabel(key)}
          </span>
          <span
            className={
              key.endsWith("Id")
                ? "min-w-0 max-w-40 truncate font-mono text-xs text-slate-700"
                : "min-w-0 max-w-44 truncate text-xs text-slate-700"
            }
          >
            {formatMetadataValueForDisplay(key, value)}
          </span>
        </span>
      ))}
      {hiddenCount ? (
        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
          +{hiddenCount} mas
        </span>
      ) : null}
    </div>
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
      <p className="text-xs font-medium text-slate-800">{formatRoleLabel(actorRole)}</p>
      {actorUserId ? (
        <p className="break-all font-mono text-xs text-slate-600">{truncateMiddle(actorUserId)}</p>
      ) : null}
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
      <p className="text-xs font-medium text-slate-800">{formatEntityLabel(entityType)}</p>
      {entityId ? (
        <p className="break-all font-mono text-xs text-slate-600">{truncateMiddle(entityId)}</p>
      ) : null}
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
  const currentPage = getPageParam(urlParams.page);
  const pageFrom = (currentPage - 1) * AUDIT_PAGE_SIZE;
  const pageTo = pageFrom + AUDIT_PAGE_SIZE - 1;

  let query = supabase
    .from("audit_logs")
    .select("id, actor_user_id, actor_role, action, entity_type, entity_id, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(pageFrom, pageTo);

  if (actionFilter) {
    query = query.ilike("action", `%${actionFilter}%`);
  }
  if (entityFilter) {
    query = query.ilike("entity_type", `%${entityFilter}%`);
  }

  const { data: logs, error, count } = await query;
  const rows = (logs ?? []) as AuditLogRow[];
  const totalLogsCount = count ?? 0;

  if (!error && currentPage > 1 && rows.length === 0 && totalLogsCount > 0) {
    const lastPage = Math.max(1, Math.ceil(totalLogsCount / AUDIT_PAGE_SIZE));
    redirect(buildAuditPath(actionFilter, entityFilter, lastPage));
  }

  const hasNextPage = !error && currentPage * AUDIT_PAGE_SIZE < totalLogsCount;
  const previousPageHref =
    currentPage > 1 ? buildAuditPath(actionFilter, entityFilter, currentPage - 1) : null;
  const nextPageHref = hasNextPage
    ? buildAuditPath(actionFilter, entityFilter, currentPage + 1)
    : null;

  return (
    <DashboardPageContainer>
      <section className="space-y-6 lg:space-y-7">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Auditoria</h1>
              <p className="mt-1 text-sm text-slate-600">
                Eventos criticos del sistema con paginacion.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver al dashboard
            </Link>
          </div>
          {!error ? (
            <div className="mt-4 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {rows.length} registros en esta pagina
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {totalLogsCount} registros totales
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

        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" method="get">
          <p className="text-sm font-medium text-slate-900">Filtros</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-1.5">
              <label
                htmlFor="action"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                Accion
              </label>
              <input
                id="action"
                name="action"
                defaultValue={actionFilter}
                placeholder="document_uploaded"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="entity"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                Entidad
              </label>
              <input
                id="entity"
                name="entity"
                defaultValue={entityFilter}
                placeholder="document o worker"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="flex items-end gap-2.5 lg:pb-0.5">
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Aplicar
              </button>
              <Link
                href="/dashboard/audit"
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </Link>
            </div>
          </div>
        </form>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            No se pudieron cargar logs: {error.message}
          </div>
        ) : null}

        {!error && !rows.length ? (
          <EmptyStateCard
            className="py-10 sm:py-12"
            title="No hay eventos para este filtro"
            description="Ajusta los filtros o limpia la busqueda para ver los ultimos registros."
          />
        ) : null}

        {!error && rows.length ? (
          <>
            <PaginationControls
              className="px-5 py-4"
              currentPage={currentPage}
              previousHref={previousPageHref}
              nextHref={nextPageHref}
              showingCount={rows.length}
              totalCount={totalLogsCount}
            />

            <div className="space-y-4 xl:hidden">
              {rows.map((log) => (
                <article key={log.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Actor
                      </p>
                      <ActorCell actorRole={log.actor_role} actorUserId={log.actor_user_id} />
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Entidad
                      </p>
                      <EntityCell entityType={log.entity_type} entityId={log.entity_id} />
                    </div>
                  </div>

                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <MetadataSummary metadataValue={log.metadata} compact />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm xl:block">
              <table className="audit-events-table min-w-[980px] w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[30%]" />
                </colgroup>
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Fecha</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Accion</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Actor</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Entidad</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Metadata</th>
                  </tr>
                </thead>
                <tbody className="audit-events-body">
                  {rows.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-slate-50/50">
                      <td className="px-4 py-4 text-slate-700">
                        <p className="break-words text-xs leading-5 md:text-sm">
                          {formatDate(log.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-800">
                            {formatRoleLabel(log.actor_role)}
                          </p>
                          {log.actor_user_id ? (
                            <span
                              title={log.actor_user_id}
                              className="inline-block max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"
                            >
                              {truncateMiddle(log.actor_user_id)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-800">
                            {formatEntityLabel(log.entity_type)}
                          </p>
                          {log.entity_id ? (
                            <span
                              title={log.entity_id}
                              className="inline-block max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"
                            >
                              {truncateMiddle(log.entity_id)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-2.5">
                          <MetadataSummary metadataValue={log.metadata} compact />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              className="px-5 py-4"
              currentPage={currentPage}
              previousHref={previousPageHref}
              nextHref={nextPageHref}
              showingCount={rows.length}
              totalCount={totalLogsCount}
            />
          </>
        ) : null}
      </section>
    </DashboardPageContainer>
  );
}
