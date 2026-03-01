import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { canViewAudit } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { Badge } from "@/components/ui/Badge";

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
  
    return action.replaceAll("_", " ");
  }

function truncateMiddle(value: string, start = 8, end = 6) {
  if (!value || value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
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
    <section className="space-y-6">
      <SectionHeader
        title="Auditoria"
        description="Eventos criticos del sistema con paginacion."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
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
                  className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
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
                  className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                />
              </div>
              <div className="flex items-end gap-2.5 lg:pb-0.5">
                <button
                  type="submit"
                  className="rounded-sm bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Aplicar
                </button>
                <Link
                  href="/dashboard/audit"
                  className="rounded-sm border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Limpiar
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
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
        <Card>
          <CardHeader>
            <PaginationControls
                currentPage={currentPage}
                previousHref={previousPageHref}
                nextHref={nextPageHref}
                showingCount={rows.length}
                totalCount={totalLogsCount}
            />
          </CardHeader>
          <CardContent>
            <div className="hidden overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-sm xl:block">
                <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                    <tr>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Fecha</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Accion</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Actor</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Entidad</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((log) => (
                    <tr key={log.id} className="align-top">
                        <td className="px-4 py-4 text-slate-700">
                        <p className="break-words text-xs leading-5 md:text-sm">
                            {formatDate(log.created_at)}
                        </p>
                        </td>
                        <td className="px-4 py-4">
                            <Badge>{formatActionTitle(log.action)}</Badge>
                        </td>
                        <td className="px-4 py-4">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-800">
                            {formatRoleLabel(log.actor_role)}
                            </p>
                            {log.actor_user_id ? (
                            <span
                                title={log.actor_user_id}
                                className="inline-block max-w-full truncate rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"
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
                                className="inline-block max-w-full truncate rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"
                            >
                                {truncateMiddle(log.entity_id)}
                            </span>
                            ) : null}
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
