import Link from "next/link";
import { redirect } from "next/navigation";

import { FlashMessages } from "@/components/ui/flash-messages";
import {
  canManageUsers,
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
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}

function SectionCard({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
  const canManageUserAccounts = canManageUsers(role);
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

  const recentDocumentsPromise = canSeeDocuments
    ? supabase
        .from("documents")
        .select("id, file_name, status, folder_type, created_at, worker:workers(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(3)
    : Promise.resolve(null);

  const pendingDocumentsListPromise = canReview
    ? supabase
        .from("documents")
        .select("id, file_name, status, folder_type, created_at, worker:workers(first_name, last_name)")
        .eq("status", "pendiente")
        .order("created_at", { ascending: false })
        .limit(3)
    : Promise.resolve(null);

  let recentNotificationsQuery = supabase
    .from("notifications")
    .select("id, event_type, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(3);
  if (!isAdmin) {
    recentNotificationsQuery = recentNotificationsQuery.eq("user_id", user.id);
  }
  const recentNotificationsPromise = recentNotificationsQuery;

  const recentAuditPromise = canSeeAudit
    ? supabase
        .from("audit_logs")
        .select("id, action, actor_role, created_at")
        .order("created_at", { ascending: false })
        .limit(3)
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

  const quickActions = [
    {
      href: "/dashboard/workers",
      label: "Trabajadores",
      variant: "secondary" as const,
    },
    canManageUserAccounts
      ? {
          href: "/dashboard/users",
          label: "Gestionar usuarios",
          variant: "secondary" as const,
        }
      : null,
    canReview && documentsPending > 0
      ? {
          href: "/dashboard/workers",
          label: "Revisar pendientes",
          variant: "primary" as const,
        }
      : null,
    canSeeNotificationsPanel
      ? { href: "/dashboard/notifications", label: "Notificaciones", variant: "secondary" as const }
      : null,
    canSeeAudit ? { href: "/dashboard/audit", label: "Revisar auditoria", variant: "secondary" as const } : null,
    canManage && !canReview
      ? {
          href: "/dashboard/workers/new",
          label: "Registrar trabajador",
          variant: "primary" as const,
        }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string; variant: "primary" | "secondary" }>;

  return (
    <section className="space-y-5">
      <FlashMessages error={errorMessage} success={successMessage} />

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                Rol: {formatRole(role)}
              </span>
              {canReview && documentsPending > 0 ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  {documentsPending} pendientes
                </span>
              ) : null}
            </div>
          </div>

          {quickActions.length ? (
            <div className="flex max-w-full flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    action.variant === "primary"
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {queryErrors.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Se cargo el dashboard con informacion parcial. Algunas secciones no pudieron actualizarse.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Trabajadores" value={workersTotal} hint="Total registrados" />
        {canManage ? (
          <MetricCard
            label="Inactivos"
            value={workersInactive}
            hint="Seguimiento"
            tone={workersInactive > 0 ? "warning" : "default"}
          />
        ) : (
          <MetricCard label="Activos" value={workersActive} hint="Disponibles" tone="success" />
        )}
        {canSeeDocuments ? (
          <MetricCard
            label={canReview ? "Pendientes" : "Documentos"}
            value={canReview ? documentsPending : documentsTotal}
            hint={canReview ? "Para revisar" : "Visibles"}
            tone={canReview && documentsPending > 0 ? "warning" : "default"}
          />
        ) : null}
        {canSeeNotificationsPanel ? (
          <MetricCard
            label="Email no enviado"
            value={notificationsPendingEmail}
            hint="Pendientes"
            tone={notificationsPendingEmail > 0 ? "warning" : "default"}
          />
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {canReview ? (
          <SectionCard
            title="Cola de revision"
            actionHref="/dashboard/workers"
            actionLabel="Ir a trabajadores"
          >
            {!pendingDocumentsList.length ? (
              <EmptyList message="No hay documentos pendientes de revision." />
            ) : (
              <ul className="space-y-2">
                {pendingDocumentsList.map((document) => {
                  const workerName = getWorkerName(document.worker);
                  return (
                    <li
                      key={document.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
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
                      <p className="whitespace-nowrap text-xs text-slate-600">{formatDate(document.created_at)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        ) : null}

        {canSeeDocuments ? (
          <SectionCard
            title="Documentos recientes"
            actionHref="/dashboard/workers"
            actionLabel="Ver documentos"
          >
            {!recentDocuments.length ? (
              <EmptyList message="Aun no hay documentos registrados." />
            ) : (
              <ul className="space-y-2">
                {recentDocuments.map((document) => {
                  const workerName = getWorkerName(document.worker);
                  return (
                    <li
                      key={document.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
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

      <div className="grid gap-5 xl:grid-cols-2">
        {canSeeAudit ? (
          <SectionCard
            title="Auditoria reciente"
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
                      <p className="text-sm font-semibold capitalize text-slate-900">
                        {formatAuditAction(log.action)}
                      </p>
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
        ) : null}

        {canSeeNotificationsPanel ? (
          <SectionCard
            title="Notificaciones recientes"
            actionHref="/dashboard/notifications"
            actionLabel="Ver notificaciones"
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
                      {notification.sent_at ? "Email enviado" : "Email no enviado"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ) : !canSeeAudit ? (
          <SectionCard
            title="Acceso y permisos"
            actionHref="/dashboard/access"
            actionLabel="Ver acceso y roles"
          >
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
      </div>
    </section>
  );
}
