import Link from "next/link";
import { redirect } from "next/navigation";

import { FlashMessages } from "@/components/ui/flash-messages";
import {
  canManageWorkers,
  canReviewDocuments,
  canViewAudit,
  canViewDocuments,
} from "@/lib/auth/roles";
import type { AppRole } from "@/lib/constants/domain";
import { folderLabels, type FolderType } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type RecentDocumentRow = {
  id: string;
  worker_id: string;
  file_name: string;
  status: string;
  folder_type: string;
  created_at: string;
  worker:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | Array<{
        first_name: string | null;
        last_name: string | null;
      }>
    | null
    | undefined;
};

type RecentNotificationRow = {
  id: string;
  event_type: string;
  sent_at: string | null;
  created_at: string;
};

type RecentAuditRow = {
  id: number;
  action: string;
  actor_role: AppRole | null;
  created_at: string;
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

function formatRole(role: AppRole | null | undefined) {
  if (role === "admin") return "Administrador";
  if (role === "rrhh") return "RRHH";
  if (role === "contabilidad") return "Contabilidad";
  if (role === "trabajador") return "Trabajador";
  return "Visitante";
}

function formatDocumentStatus(status: string) {
  if (status === "aprobado") return "Aprobado";
  if (status === "rechazado") return "Rechazado";
  return "Pendiente";
}

function documentStatusClass(status: string) {
  if (status === "aprobado") return "bg-emerald-100 text-emerald-800";
  if (status === "rechazado") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

function notificationEventLabel(eventType: string) {
  if (eventType === "document_uploaded") return "Documento cargado";
  if (eventType === "document_approved") return "Documento aprobado";
  if (eventType === "document_rejected") return "Documento rechazado";
  return eventType;
}

function notificationStatusClass(sentAt: string | null) {
  if (sentAt) {
    return "bg-emerald-100 text-emerald-800";
  }
  return "bg-slate-200 text-slate-700";
}

function formatAuditAction(action: string) {
  return action.replaceAll("_", " ");
}

function auditActionClass(action: string) {
  if (action.startsWith("auth_")) return "bg-blue-100 text-blue-800";
  if (action.includes("document")) return "bg-emerald-100 text-emerald-800";
  if (action.includes("worker")) return "bg-slate-200 text-slate-700";
  return "bg-slate-200 text-slate-700";
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning";
  href?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  const cardClass = [
    "rounded-xl border p-4 shadow-sm transition",
    toneClass,
    href ? "hover:-translate-y-0.5 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-200" : "",
  ].join(" ");

  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {content}
      </Link>
    );
  }

  return <div className={cardClass}>{content}</div>;
}

function SectionCard({
  title,
  description,
  actionHref,
  actionLabel,
  id,
  className,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={["rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className ?? ""].join(" ")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
      {message}
    </div>
  );
}

function getWorkerName(worker: RecentDocumentRow["worker"]) {
  const workerRecord = Array.isArray(worker) ? worker[0] : worker;
  if (!workerRecord) {
    return "";
  }

  return `${workerRecord.first_name ?? ""} ${workerRecord.last_name ?? ""}`.trim();
}

function getWorkerDocumentsHref(document: Pick<RecentDocumentRow, "worker_id" | "status">) {
  const search = document.status === "pendiente" ? "?status=pendiente" : "";
  return `/dashboard/workers/${document.worker_id}/documents${search}`;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const urlParams = await searchParams;
  const successMessage = getStringParam(urlParams.success);
  const errorMessage = getStringParam(urlParams.error);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as AppRole | null | undefined) ?? "visitante";
  const canManage = canManageWorkers(role);
  const canSeeDocuments = canViewDocuments(role);
  const canReview = canReviewDocuments(role);
  const canSeeAudit = canViewAudit(role);
  const isAdmin = role === "admin";
  const canSeeNotificationsPanel = isAdmin;

  const workersTotalPromise = supabase.from("workers").select("id", { count: "exact", head: true });
  const workersActivePromise = supabase
    .from("workers")
    .select("id", { count: "exact", head: true })
    .eq("status", "activo");
  const workersInactivePromise = supabase
    .from("workers")
    .select("id", { count: "exact", head: true })
    .eq("status", "inactivo");

  const documentsTotalPromise = canSeeDocuments
    ? supabase.from("documents").select("id", { count: "exact", head: true })
    : Promise.resolve(null);
  const documentsPendingPromise = canSeeDocuments
    ? supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendiente")
    : Promise.resolve(null);

  const notificationsTotalQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true });
  const notificationsPendingEmailQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("sent_at", null);

  const notificationsTotalPromise = isAdmin
    ? notificationsTotalQuery
    : notificationsTotalQuery.eq("user_id", user.id);
  const notificationsPendingEmailPromise = isAdmin
    ? notificationsPendingEmailQuery
    : notificationsPendingEmailQuery.eq("user_id", user.id);

  const recentDocumentsPromise = canSeeDocuments && !canReview
    ? supabase
        .from("documents")
        .select("id, worker_id, file_name, status, folder_type, created_at, worker:workers(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(5)
    : Promise.resolve(null);

  const pendingDocumentsListPromise = canReview
    ? supabase
        .from("documents")
        .select("id, worker_id, file_name, status, folder_type, created_at, worker:workers(first_name, last_name)")
        .eq("status", "pendiente")
        .order("created_at", { ascending: false })
        .limit(6)
    : Promise.resolve(null);

  let recentNotificationsQuery = supabase
    .from("notifications")
    .select("id, event_type, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (!isAdmin) {
    recentNotificationsQuery = recentNotificationsQuery.eq("user_id", user.id);
  }
  const recentNotificationsPromise = recentNotificationsQuery;

  const recentAuditPromise = canSeeAudit
    ? supabase
        .from("audit_logs")
        .select("id, action, actor_role, created_at")
        .order("created_at", { ascending: false })
        .limit(5)
    : Promise.resolve(null);

  const [
    workersTotalResult,
    workersActiveResult,
    workersInactiveResult,
    documentsTotalResult,
    documentsPendingResult,
    notificationsTotalResult,
    notificationsPendingEmailResult,
    recentDocumentsResult,
    pendingDocumentsListResult,
    recentNotificationsResult,
    recentAuditResult,
  ] = await Promise.all([
    workersTotalPromise,
    workersActivePromise,
    workersInactivePromise,
    documentsTotalPromise,
    documentsPendingPromise,
    notificationsTotalPromise,
    notificationsPendingEmailPromise,
    recentDocumentsPromise,
    pendingDocumentsListPromise,
    recentNotificationsPromise,
    recentAuditPromise,
  ]);

  const workersTotal = workersTotalResult.count ?? 0;
  const workersActive = workersActiveResult.count ?? 0;
  const workersInactive = workersInactiveResult.count ?? 0;
  const documentsTotal = documentsTotalResult?.count ?? 0;
  const documentsPending = documentsPendingResult?.count ?? 0;
  const notificationsPendingEmail = notificationsPendingEmailResult.count ?? 0;
  const recentDocuments = (((recentDocumentsResult?.data ?? []) as unknown) as RecentDocumentRow[]) ?? [];
  const pendingDocumentsList =
    (((pendingDocumentsListResult?.data ?? []) as unknown) as RecentDocumentRow[]) ?? [];
  const recentNotifications = ((recentNotificationsResult.data ?? []) as RecentNotificationRow[]) ?? [];
  const recentAudit = ((recentAuditResult?.data ?? []) as RecentAuditRow[]) ?? [];

  const queryErrors = [
    workersTotalResult.error,
    workersActiveResult.error,
    workersInactiveResult.error,
    documentsTotalResult?.error ?? null,
    documentsPendingResult?.error ?? null,
    notificationsTotalResult.error,
    notificationsPendingEmailResult.error,
    recentDocumentsResult?.error ?? null,
    pendingDocumentsListResult?.error ?? null,
    recentNotificationsResult.error,
    recentAuditResult?.error ?? null,
  ].filter(Boolean);

  const workersListHref = "/dashboard/workers";
  const workersInactiveHref = "/dashboard/workers?status=inactivo";
  const workersActiveHref = "/dashboard/workers?status=activo";
  const documentsMetricHref = workersListHref;
  const notificationsHref = isAdmin ? "/dashboard/notifications" : undefined;
  const hasRecentNotifications = recentNotifications.length > 0;
  const showNotificationsPanel = hasRecentNotifications || canSeeNotificationsPanel;
  const showAuditPanel = canSeeAudit;
  const secondaryPanels = (
    <>
      {showNotificationsPanel ? (
        <SectionCard
          title="Notificaciones recientes"
          description={
            canSeeNotificationsPanel
              ? "Eventos documentales recientes y estado de envio."
              : "Tus notificaciones mas recientes."
          }
          actionHref={notificationsHref}
          actionLabel={notificationsHref ? "Abrir panel" : undefined}
        >
          {!recentNotifications.length ? (
            <EmptyList message="No hay notificaciones recientes." />
          ) : (
            <ul className="space-y-2">
              {recentNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {notificationEventLabel(notification.event_type)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{formatDate(notification.created_at)}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${notificationStatusClass(notification.sent_at)}`}
                  >
                    {notification.sent_at ? "Enviado" : "Pendiente"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {showAuditPanel ? (
        <SectionCard
          title="Auditoria reciente"
          description="Ultimos eventos criticos registrados."
          actionHref="/dashboard/audit"
          actionLabel="Ver auditoria"
        >
          {!recentAudit.length ? (
            <EmptyList message="No hay eventos de auditoria recientes." />
          ) : (
            <ul className="space-y-2">
              {recentAudit.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize text-slate-900">{formatAuditAction(log.action)}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDate(log.created_at)}
                      {log.actor_role ? ` • ${formatRole(log.actor_role)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${auditActionClass(log.action)}`}
                  >
                    {log.action}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : !showNotificationsPanel ? (
        <SectionCard title="Acceso y permisos" description="Resumen rapido de capacidades de tu rol.">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Gestion de trabajadores", enabled: canManage },
              { label: "Consulta documentos", enabled: canSeeDocuments },
              { label: "Revision documentos", enabled: canReview },
              { label: "Auditoria", enabled: canSeeAudit },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="text-sm text-slate-700">{item.label}</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {item.enabled ? "Activo" : "Sin acceso"}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </>
  );

  return (
    <section className="space-y-5">
      <FlashMessages error={errorMessage} success={successMessage} />

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Inicio</h1>
        <p className="mt-1 text-sm text-slate-600">Vista rapida del estado actual y actividad reciente.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
            Rol: {formatRole(role)}
          </span>
          {queryErrors.length ? (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              Datos parciales
            </span>
          ) : null}
        </div>
      </header>

      {queryErrors.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Se cargo el dashboard con informacion parcial. Algunas secciones no pudieron actualizarse.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Trabajadores"
          value={workersTotal}
          hint="Total registrados"
          href={workersListHref}
        />
        {canManage ? (
          <MetricCard
            label="Inactivos"
            value={workersInactive}
            hint="Ver listado filtrado"
            tone={workersInactive > 0 ? "warning" : "default"}
            href={workersInactiveHref}
          />
        ) : (
          <MetricCard
            label="Activos"
            value={workersActive}
            hint="Ver listado filtrado"
            tone="success"
            href={workersActiveHref}
          />
        )}
        {canSeeDocuments ? (
          <MetricCard
            label="Documentos"
            value={documentsTotal}
            hint={canReview ? "Total visibles" : "Documentos visibles"}
            tone="default"
            href={documentsMetricHref}
          />
        ) : null}
        {canSeeNotificationsPanel ? (
          <MetricCard
            label="Email no enviado"
            value={notificationsPendingEmail}
            hint="Pendientes"
            tone={notificationsPendingEmail > 0 ? "warning" : "default"}
            href="/dashboard/notifications"
          />
        ) : null}
      </div>

      {canReview ? (
        <>
          <SectionCard
            id="cola-revision"
            title="Documentos pendientes"
            description="Revision prioritaria. Haz click en un documento para abrir la ficha del trabajador."
            className="border-amber-200 bg-amber-50/30"
          >
            {!pendingDocumentsList.length ? (
              <EmptyList message="No hay documentos pendientes de revision." />
            ) : (
              <ul className="space-y-2">
                {pendingDocumentsList.map((document) => {
                  const workerName = getWorkerName(document.worker);
                  return (
                    <li key={document.id}>
                      <Link
                        href={getWorkerDocumentsHref(document)}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-white px-3 py-3 transition hover:border-amber-300 hover:bg-amber-50/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900" title={document.file_name}>
                            {document.file_name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {(folderLabels[document.folder_type as FolderType] ?? document.folder_type) +
                              (workerName ? ` • ${workerName}` : "")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            Pendiente
                          </span>
                          <p className="whitespace-nowrap text-xs text-slate-600">{formatDate(document.created_at)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-2">{secondaryPanels}</div>
        </>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            {canSeeDocuments ? (
              <SectionCard title="Documentos recientes" description="Ultimos movimientos visibles segun tu rol.">
                {!recentDocuments.length ? (
                  <EmptyList message="Aun no hay documentos registrados." />
                ) : (
                  <ul className="space-y-2">
                    {recentDocuments.map((document) => {
                      const workerName = getWorkerName(document.worker);
                      return (
                        <li key={document.id}>
                          <Link
                            href={getWorkerDocumentsHref(document)}
                            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900" title={document.file_name}>
                                {document.file_name}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                {folderLabels[document.folder_type as FolderType] ?? document.folder_type}
                                {workerName ? ` • ${workerName}` : ""}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">{formatDate(document.created_at)}</p>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${documentStatusClass(document.status)}`}
                            >
                              {formatDocumentStatus(document.status)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>
            ) : (
              <SectionCard title="Documentos">
                <EmptyList message="Tu rol no tiene acceso a documentos." />
              </SectionCard>
            )}
          </div>

          <div className="space-y-5">{secondaryPanels}</div>
        </div>
      )}
    </section>
  );
}
