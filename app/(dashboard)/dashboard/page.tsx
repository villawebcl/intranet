import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { reviewDocumentAction } from "@/app/(dashboard)/dashboard/workers/[workerId]/documents/actions";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { HeaderSearch } from "@/components/layout/header-search";
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
import { getFlash } from "@/lib/flash";
import {
  loadDashboardReadModel,
  type RecentAuditRow,
  type RecentDocumentRow,
  type RecentNotificationRow,
} from "@/lib/services/dashboard-read.service";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type DashboardPageProps = {
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
  const iconColor =
    tone === "success"
      ? "text-emerald-500"
      : tone === "warning"
        ? "text-amber-500"
        : tone === "danger"
          ? "text-red-500"
          : "text-blue-500";

  const accentColor =
    tone === "success"
      ? "bg-emerald-400"
      : tone === "warning"
        ? "bg-amber-400"
        : tone === "danger"
          ? "bg-red-400"
          : "bg-blue-400";

  const cardClass = [
    "group transition",
    href ? "hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-200" : "",
    className ?? "",
  ].join(" ");

  const content = (
    <Card className="relative h-full overflow-hidden rounded-xl border-0 p-3.5 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</p>
        <span className={`shrink-0 ${iconColor}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold leading-none tracking-tight text-slate-950 sm:mt-3 sm:text-[2.75rem]">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
      <div className={`metric-card-accent absolute bottom-0 left-0 right-0 h-[3px] ${accentColor}`} />
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
  const baseClass = "h-6 w-6";

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
    <Card id={id} className={["rounded-xl", className ?? "", "border-0"].join(" ")}>
      <SectionHeader title={title} description={description} actionHref={actionHref} actionLabel={actionLabel} />
      <div>{children}</div>
    </Card>
  );
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
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

  const [urlParams, flash] = await Promise.all([searchParams, getFlash()]);
  const successMessage = flash.success ?? "";
  const errorMessage = flash.error ?? getStringParam(urlParams.error);

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

  const dashboardReadModel = await loadDashboardReadModel({
    supabase,
    userId: user.id,
    canSeeDocuments: canSeeDocuments,
    canReview,
    canSeeAudit,
    isAdmin,
  });

  const workersTotal = dashboardReadModel.workersTotal;
  const workersActive = dashboardReadModel.workersActive;
  const workersInactive = dashboardReadModel.workersInactive;
  const documentsTotal = dashboardReadModel.documentsTotal;
  const documentsPending = dashboardReadModel.documentsPending;
  const notificationsPendingEmail = dashboardReadModel.notificationsPendingEmail;
  const recentDocuments = dashboardReadModel.recentDocuments as RecentDocumentRow[];
  const pendingDocumentsList = dashboardReadModel.pendingDocumentsList as RecentDocumentRow[];
  const recentNotifications = dashboardReadModel.recentNotifications as RecentNotificationRow[];
  const recentAudit = dashboardReadModel.recentAudit as RecentAuditRow[];
  const queryErrors = dashboardReadModel.queryErrors;

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
  const dashboardSearchItems = [
    { href: "/dashboard", label: "Inicio", description: "Resumen general y accesos rapidos" },
    ...(canManage ? [{ href: "/dashboard/workers", label: "Trabajadores", description: "Gestion y consulta" }] : []),
    ...(canReview
      ? [{ href: "/dashboard/workers?status=activo", label: "Pendientes", description: "Revision documental" }]
      : []),
    ...(isAdmin ? [{ href: "/dashboard/users", label: "Usuarios", description: "Gestion de cuentas" }] : []),
    ...(canSeeNotificationsPanel
      ? [{ href: "/dashboard/notifications", label: "Notificaciones", description: "Eventos y estado de email" }]
      : []),
    ...(canSeeAudit ? [{ href: "/dashboard/audit", label: "Auditoria", description: "Trazabilidad de eventos" }] : []),
  ];
  const notificationsPanel = showNotificationsPanel ? (
    <SectionCard
      title="Notificaciones recientes"
      description={
        canSeeNotificationsPanel
          ? "Eventos documentales recientes y estado de envio."
          : "Tus notificaciones mas recientes."
      }
      actionHref={notificationsHref}
      actionLabel={notificationsHref ? "Abrir panel" : undefined}
      className="h-full"
    >
      {!recentNotifications.length ? (
        <EmptyList message="No hay notificaciones recientes." />
      ) : (
        <>
          <ul className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto sm:hidden">
            {recentNotifications.slice(0, 4).map((notification) => (
              <li
                key={notification.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {notificationEventLabel(notification.event_type)}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
                <span
                  className={[
                    "inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                    notification.sent_at
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-700",
                  ].join(" ")}
                >
                  {notification.sent_at ? "Enviado" : "Pend."}
                </span>
              </li>
            ))}
          </ul>
          <ul className="hidden max-h-[380px] divide-y divide-slate-100 overflow-y-auto sm:block">
            {recentNotifications.map((notification) => (
              <li key={notification.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {notificationEventLabel(notification.event_type)}
                  </p>
                  <p className="truncate text-xs text-slate-500">{formatDate(notification.created_at)}</p>
                </div>
                <Badge tone={notification.sent_at ? "success" : "neutral"} className="shrink-0">
                  {notification.sent_at ? "Enviado" : "Pendiente"}
                </Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  ) : (
    <SectionCard
      title="Notificaciones recientes"
      description="Eventos documentales recientes."
      className="h-full"
    >
      <EmptyList message="Tu rol no tiene acceso al panel de notificaciones." />
    </SectionCard>
  );

  const auditPanel = showAuditPanel ? (
    <SectionCard
      title="Auditoria reciente"
      description="Ultimos eventos criticos registrados."
      actionHref="/dashboard/audit"
      actionLabel="Ver auditoria"
      className="h-full"
    >
      {!recentAudit.length ? (
        <EmptyList message="No hay eventos de auditoria recientes." />
      ) : (
        <>
          <ul className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto sm:hidden">
            {recentAudit.slice(0, 4).map((log) => (
              <li
                key={log.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize text-slate-900">
                    {formatAuditAction(log.action)}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{formatDate(log.created_at)}</p>
                </div>
                <Badge tone="neutral" className={`shrink-0 ${auditActionClass(log.action)}`}>
                  {formatAuditAction(log.action).split(" ")[0]}
                </Badge>
              </li>
            ))}
          </ul>
          <ul className="hidden max-h-[380px] divide-y divide-slate-100 overflow-y-auto sm:block">
            {recentAudit.map((log) => (
              <li key={log.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize text-slate-900">{formatAuditAction(log.action)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {formatDate(log.created_at)}
                    {log.actor_role ? ` · ${formatRole(log.actor_role)}` : ""}
                  </p>
                </div>
                <Badge tone="neutral" className={`shrink-0 ${auditActionClass(log.action)}`}>
                  {formatAuditAction(log.action).split(" ")[0]}
                </Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  ) : (
    <SectionCard title="Auditoria reciente" description="Trazabilidad de eventos criticos." className="h-full">
      <EmptyList message="Tu rol no tiene acceso al panel de auditoria." />
    </SectionCard>
  );

  const accessPanel = (
    <SectionCard title="Mis permisos" description={`Rol: ${formatRole(role)}`}>
      <ul className="divide-y divide-slate-100">
        {[
          { label: "Gestionar trabajadores", enabled: canManage },
          { label: "Ver documentos", enabled: canSeeDocuments },
          { label: "Revisar documentos", enabled: canReview },
          { label: "Auditoria", enabled: canSeeAudit },
        ].map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
            <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${item.enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
              {item.enabled ? (
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="h-2.5 w-2.5">
                  <path d="M2 6l2.5 2.5L10 3.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="h-2.5 w-2.5">
                  <path d="M3 6h6" />
                </svg>
              )}
            </span>
            <span className={`text-sm ${item.enabled ? "text-slate-800" : "text-slate-400"}`}>{item.label}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
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

      <Card className="rounded-xl border-0 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Panel</p>
            <h1 data-testid="dashboard-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
              {profile?.full_name ? `Hola, ${profile.full_name.split(" ")[0]}` : "Inicio"}
            </h1>
          </div>
          <div className="w-full max-w-sm sm:w-auto sm:min-w-[280px]">
            <HeaderSearch items={dashboardSearchItems} />
          </div>
        </div>
        {quickActions.length ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {quickActions.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </Card>

      {queryErrors.length ? (
        <AlertBanner variant="warning">
          Se cargo el dashboard con informacion parcial. Algunas secciones pueden estar incompletas.
        </AlertBanner>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
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

      {canReview ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <SectionCard
            id="cola-revision"
            title="Documentos pendientes"
            description="Revision prioritaria."
            className="h-full"
          >
            <div className="mb-3 flex items-center gap-1">
              <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Pendientes</span>
            </div>
            {!pendingDocumentsList.length ? (
              <EmptyList message="No hay documentos pendientes de revision." />
            ) : (
              <>
                <ul className="max-h-[440px] divide-y divide-slate-100 overflow-y-auto sm:hidden">
                  {pendingDocumentsList.slice(0, 5).map((document) => {
                    const workerName = getWorkerName(document.worker);
                    return (
                      <li key={document.id} className="py-2.5 first:pt-0 last:pb-0">
                        <Link href={getWorkerDocumentsHref(document)} className="block rounded-lg px-1 py-1">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900" title={document.file_name}>
                                {document.file_name}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {workerName || "Sin trabajador"} · {formatDate(document.created_at)}
                              </p>
                            </div>
                            <Badge tone="warning" className="shrink-0">Pend.</Badge>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <ul className="hidden max-h-[480px] space-y-2 overflow-y-auto sm:block">
                  {pendingDocumentsList.map((document) => {
                    const workerName = getWorkerName(document.worker);
                    return (
                      <li key={document.id}>
                        <div className="rounded-xl border border-slate-100 bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900" title={document.file_name}>
                                {document.file_name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {folderLabels[document.folder_type as FolderType] ?? document.folder_type}
                                {workerName ? ` · ${workerName}` : ""}
                                {" · "}{formatDate(document.created_at)}
                              </p>
                            </div>
                            <Badge tone="warning" className="shrink-0">Pendiente</Badge>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                            <Link
                              href={getWorkerDocumentsHref(document)}
                              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                            >
                              Ver ficha
                            </Link>
                            <form action={reviewDocumentAction}>
                              <input type="hidden" name="workerId" value={document.worker_id} />
                              <input type="hidden" name="documentId" value={document.id} />
                              <input type="hidden" name="decision" value="aprobado" />
                              <input type="hidden" name="returnTo" value="/dashboard" />
                              <FormSubmitButton
                                pendingLabel="Aprobando..."
                                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Aprobar
                              </FormSubmitButton>
                            </form>
                            <details className="rounded-lg bg-red-50/60">
                              <summary className="cursor-pointer list-none px-2.5 py-1 text-xs font-semibold text-red-600">
                                Rechazar…
                              </summary>
                              <form action={reviewDocumentAction} className="mt-2 space-y-1.5 border-t border-red-100 pt-2">
                                <input type="hidden" name="workerId" value={document.worker_id} />
                                <input type="hidden" name="documentId" value={document.id} />
                                <input type="hidden" name="decision" value="rechazado" />
                                <input type="hidden" name="returnTo" value="/dashboard" />
                                <input
                                  name="rejectionReason"
                                  required
                                  maxLength={500}
                                  placeholder="Motivo de rechazo"
                                  className="w-full rounded-lg border border-red-100 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none ring-red-200 focus:ring-2"
                                />
                                <FormSubmitButton
                                  pendingLabel="Rechazando..."
                                  className="w-full rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200"
                                >
                                  Confirmar rechazo
                                </FormSubmitButton>
                              </form>
                            </details>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </SectionCard>

          {notificationsPanel}
          {auditPanel}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            {canSeeDocuments ? (
              <SectionCard title="Documentos recientes" description="Ultimos movimientos visibles.">
                {!recentDocuments.length ? (
                  <EmptyList message="Aun no hay documentos registrados." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {recentDocuments.map((document) => {
                      const workerName = getWorkerName(document.worker);
                      return (
                        <li key={document.id}>
                          <Link
                            href={getWorkerDocumentsHref(document)}
                            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 transition hover:opacity-80"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900" title={document.file_name}>
                                {document.file_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {folderLabels[document.folder_type as FolderType] ?? document.folder_type}
                                {workerName ? ` · ${workerName}` : ""}
                                {" · "}{formatDate(document.created_at)}
                              </p>
                            </div>
                            <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${documentStatusClass(document.status)}`}>
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

          <div className="space-y-4 xl:col-span-4">
            {notificationsPanel}
            {showAuditPanel ? auditPanel : accessPanel}
          </div>
        </div>
      )}
    </section>
  );
}
