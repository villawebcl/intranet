import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { reviewDocumentAction } from "@/app/(dashboard)/dashboard/workers/[workerId]/documents/actions";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/alert-banner";
import { FlashMessages } from "@/components/ui/flash-messages";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  canManageWorkers,
  canUploadDocuments,
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
  icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
  href?: string;
  icon: ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-white"
      : tone === "warning"
        ? "border-amber-200 bg-white"
        : tone === "danger"
          ? "border-red-200 bg-white"
          : "border-blue-200 bg-white";

  const iconTone =
    tone === "success"
      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-100 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-100 text-red-700"
          : "border-blue-200 bg-blue-100 text-blue-700";

  const accentBar =
    tone === "success"
      ? "from-emerald-400 to-teal-500"
      : tone === "warning"
        ? "from-amber-400 to-amber-500"
        : tone === "danger"
          ? "from-orange-400 to-red-500"
          : "from-blue-400 to-blue-500";

  const cardClass = [
    "group transition",
    href ? "hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-200" : "",
    className ?? "",
  ].join(" ");

  const content = (
    <Card className={`h-full rounded-lg p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${iconTone}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1 border-l border-slate-200 pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
        </div>
      </div>
      <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${accentBar}`} />
    </Card>
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

function MetricIcon({ type }: { type: "workers" | "inactive" | "documents" | "emails" | "active" }) {
  const baseClass = "h-3.5 w-3.5";

  if (type === "workers") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <circle cx="8" cy="9" r="2.5" />
        <circle cx="16" cy="9" r="2.5" />
        <path d="M4.5 18c.6-2 2.1-3 3.5-3s2.9 1 3.5 3M12.5 18c.6-2 2.1-3 3.5-3s2.9 1 3.5 3" />
      </svg>
    );
  }

  if (type === "documents") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4M10 12h5M10 16h5" />
      </svg>
    );
  }

  if (type === "emails") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <rect x="4" y="6" width="16" height="12" rx="1" />
        <path d="m5 8 7 5 7-5" />
      </svg>
    );
  }

  if (type === "active") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12.5 2.2 2.1 4.7-4.6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5" />
    </svg>
  );
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
    <Card id={id} className={["rounded-lg", className ?? ""].join(" ")}>
      <SectionHeader title={title} description={description} actionHref={actionHref} actionLabel={actionLabel} />
      <div>{children}</div>
    </Card>
  );
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
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
    .select("role, full_name, worker_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as AppRole | null | undefined) ?? "visitante";
  const canManage = canManageWorkers(role);
  const canUpload = canUploadDocuments(role);
  const canSeeDocuments = canViewDocuments(role);
  const canReview = canReviewDocuments(role);
  const canSeeAudit = canViewAudit(role);
  const isAdmin = role === "admin";
  const canSeeNotificationsPanel = isAdmin;
  const workerAssignmentMissing = role === "trabajador" && !profile?.worker_id;

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
  const quickActions = [
    ...(canManage
      ? [{ href: "/dashboard/workers/new", label: "Crear trabajador" }]
      : []),
    ...(canUpload
      ? [{ href: "/dashboard/workers?status=activo", label: "Subir documento" }]
      : []),
    ...(canReview
      ? [{ href: "/dashboard/workers?status=activo", label: "Revisar pendientes" }]
      : []),
    ...(isAdmin
      ? [{ href: "/dashboard/users", label: "Crear usuario nucleo" }]
      : []),
    ...(canSeeNotificationsPanel
      ? [{ href: "/dashboard/notifications", label: "Revisar emails" }]
      : []),
  ];
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
                <li key={notification.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {notificationEventLabel(notification.event_type)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{formatDate(notification.created_at)}</p>
                  </div>
                  <Badge tone={notification.sent_at ? "success" : "neutral"}>
                    {notification.sent_at ? "Enviado" : "Pendiente"}
                  </Badge>
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
                <li key={log.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold capitalize text-slate-900">{formatAuditAction(log.action)}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDate(log.created_at)}
                      {log.actor_role ? ` • ${formatRole(log.actor_role)}` : ""}
                    </p>
                  </div>
                  <Badge tone="neutral" className={auditActionClass(log.action)}>
                    {log.action}
                  </Badge>
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
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">{item.label}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${item.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
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
    <section className="space-y-4">
      <FlashMessages error={errorMessage} success={successMessage} />
      {workerAssignmentMissing ? (
        <AlertBanner variant="warning">
          Tu cuenta tiene rol trabajador, pero no tiene un trabajador asociado. Solicita a un admin asignar
          tu trabajador en Usuarios.
        </AlertBanner>
      ) : null}

      <Card className="rounded-lg p-6">
        <h1 data-testid="dashboard-title" className="text-2xl font-semibold tracking-tight text-slate-950">
          Inicio
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Panel operativo para gestionar trabajadores, documentos y seguimiento de actividad en un solo lugar.
        </p>
        {queryErrors.length ? (
          <div className="mt-3">
            <Badge tone="warning">Datos parciales</Badge>
          </div>
        ) : null}
      </Card>

      {queryErrors.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Se cargo el dashboard con informacion parcial. Algunas secciones no pudieron actualizarse.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
        <MetricCard
          label="Trabajadores"
          value={workersTotal}
          hint="Total"
          tone="success"
          href={workersListHref}
          icon={<MetricIcon type="workers" />}
          className="xl:col-span-3"
        />
        {canManage ? (
          <MetricCard
            label="Inactivos"
            value={workersInactive}
            hint="Estado inactivo"
            tone={workersInactive > 0 ? "warning" : "default"}
            href={workersInactiveHref}
            icon={<MetricIcon type="inactive" />}
            className="xl:col-span-3"
          />
        ) : (
          <MetricCard
            label="Activos"
            value={workersActive}
            hint="Estado activo"
            tone="success"
            href={workersActiveHref}
            icon={<MetricIcon type="active" />}
            className="xl:col-span-3"
          />
        )}
        {canSeeDocuments ? (
          <MetricCard
            label="Documentos"
            value={documentsTotal}
            hint={canReview ? `Pendientes: ${documentsPending}` : "Documentos visibles"}
            tone="default"
            href={documentsMetricHref}
            icon={<MetricIcon type="documents" />}
            className="xl:col-span-3"
          />
        ) : null}
        {canSeeNotificationsPanel ? (
          <MetricCard
            label="Email no enviado"
            value={notificationsPendingEmail}
            hint="Pendientes"
            tone={notificationsPendingEmail > 0 ? "danger" : "default"}
            href="/dashboard/notifications"
            icon={<MetricIcon type="emails" />}
            className="xl:col-span-3"
          />
        ) : null}
      </div>

      {quickActions.length ? (
        <Card className="rounded-lg p-4">
          <SectionHeader title="Accesos directos" description="Acciones operativas frecuentes." />
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {canReview ? (
        <>
          <SectionCard
            id="cola-revision"
            title="Documentos pendientes"
            description="Revision prioritaria."
            className="border-amber-200 bg-amber-50/30"
          >
            <div className="mb-3 inline-flex items-center gap-5 border-b border-slate-200 text-sm font-semibold">
              <span className="border-b-2 border-slate-900 pb-2 text-slate-900">Todos</span>
            </div>
            {!pendingDocumentsList.length ? (
              <EmptyList message="No hay documentos pendientes de revision." />
            ) : (
              <ul className="space-y-2">
                {pendingDocumentsList.map((document) => {
                  const workerName = getWorkerName(document.worker);
                  return (
                    <li key={document.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200/70 bg-white px-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900" title={document.file_name}>
                              {document.file_name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-600">
                            {(folderLabels[document.folder_type as FolderType] ?? document.folder_type) +
                              (workerName ? ` • ${workerName}` : "")}
                          </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Badge tone="warning">Pendiente</Badge>
                            <p className="whitespace-nowrap text-xs text-slate-600">{formatDate(document.created_at)}</p>
                            <Link
                              href={getWorkerDocumentsHref(document)}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Ver
                            </Link>
                            <form action={reviewDocumentAction}>
                              <input type="hidden" name="workerId" value={document.worker_id} />
                              <input type="hidden" name="documentId" value={document.id} />
                              <input type="hidden" name="decision" value="aprobado" />
                              <input type="hidden" name="returnTo" value="/dashboard" />
                              <FormSubmitButton
                                pendingLabel="Aprobando..."
                                className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                              >
                                Aprobar
                              </FormSubmitButton>
                            </form>
                            <details className="rounded-md border border-red-200 bg-red-50/60">
                              <summary className="cursor-pointer list-none px-3 py-1.5 text-xs font-semibold text-red-700">
                                Rechazar
                              </summary>
                              <form action={reviewDocumentAction} className="space-y-2 border-t border-red-200 px-2.5 py-2">
                                <input type="hidden" name="workerId" value={document.worker_id} />
                                <input type="hidden" name="documentId" value={document.id} />
                                <input type="hidden" name="decision" value="rechazado" />
                                <input type="hidden" name="returnTo" value="/dashboard" />
                                <input
                                  name="rejectionReason"
                                  required
                                  maxLength={500}
                                  placeholder="Motivo rechazo"
                                  className="w-44 rounded-md border border-red-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none ring-slate-300 focus:ring-2"
                                />
                                <FormSubmitButton
                                  pendingLabel="Rechazando..."
                                  className="w-full rounded-md border border-red-300 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                >
                                  Confirmar
                                </FormSubmitButton>
                              </form>
                            </details>
                          </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            {secondaryPanels}
          </div>
        </>
      ) : (
        <div className="grid gap-4 2xl:grid-cols-12">
          <div className="space-y-4 2xl:col-span-8">
            {canSeeDocuments ? (
              <SectionCard title="Documentos recientes" description="Ultimos movimientos visibles.">
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
                            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50"
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
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${documentStatusClass(document.status)}`}>
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

          <div className="space-y-4 2xl:col-span-4">{secondaryPanels}</div>
        </div>
      )}
    </section>
  );
}
