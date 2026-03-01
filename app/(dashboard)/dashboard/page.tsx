import Link from "next/link";
import { redirect } from "next/navigation";

import { AlertBanner } from "@/components/ui/alert-banner";
import { FlashMessages } from "@/components/ui/flash-messages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/dashboard/StatCard";
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

  return (
    <section className="space-y-5">
      <FlashMessages error={errorMessage} success={successMessage} />
      {workerAssignmentMissing ? (
        <AlertBanner variant="warning">
          Tu cuenta tiene rol trabajador, pero no tiene un trabajador asociado. Solicita a un admin asignar
          tu trabajador en Usuarios.
        </AlertBanner>
      ) : null}

      <SectionHeader 
        title="Inicio"
        description="Vista rapida del estado actual y actividad reciente."
      />
      
      {queryErrors.length ? (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Se cargo el dashboard con informacion parcial. Algunas secciones no pudieron actualizarse.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Trabajadores"
          value={workersTotal}
          hint="Total registrados"
          href={workersListHref}
        />
        {canManage ? (
          <StatCard
            label="Inactivos"
            value={workersInactive}
            hint="Ver listado filtrado"
            href={workersInactiveHref}
          />
        ) : (
          <StatCard
            label="Activos"
            value={workersActive}
            hint="Ver listado filtrado"
            href={workersActiveHref}
          />
        )}
        {canSeeDocuments ? (
          <StatCard
            label="Documentos"
            value={documentsTotal}
            hint={canReview ? `Pendientes: ${documentsPending}` : "Documentos visibles"}
            href={documentsMetricHref}
          />
        ) : null}
        {canSeeNotificationsPanel ? (
          <StatCard
            label="Email no enviado"
            value={notificationsPendingEmail}
            hint="Pendientes"
            href="/dashboard/notifications"
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            {canReview && (
                <Card>
                    <CardHeader>
                        <CardTitle>Documentos pendientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!pendingDocumentsList.length ? (
                            <p className="text-sm text-slate-500">No hay documentos pendientes de revisión.</p>
                        ) : (
                            <ul className="space-y-2">
                                {pendingDocumentsList.map((document) => (
                                    <li key={document.id}>
                                        <Link href={getWorkerDocumentsHref(document)} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                            <div>
                                                <p className="font-semibold">{document.file_name}</p>
                                                <p className="text-sm text-slate-500">{getWorkerName(document.worker)}</p>
                                            </div>
                                            <Badge variant="warning">{formatDocumentStatus(document.status)}</Badge>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            )}
            {canSeeDocuments && !canReview && (
                <Card>
                    <CardHeader>
                        <CardTitle>Documentos recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!recentDocuments.length ? (
                            <p className="text-sm text-slate-500">No hay documentos recientes.</p>
                        ) : (
                            <ul className="space-y-2">
                                {recentDocuments.map((document) => (
                                    <li key={document.id}>
                                        <Link href={getWorkerDocumentsHref(document)} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                            <div>
                                                <p className="font-semibold">{document.file_name}</p>
                                                <p className="text-sm text-slate-500">{getWorkerName(document.worker)}</p>
                                            </div>
                                            <Badge variant={document.status === 'aprobado' ? 'success' : document.status === 'rechazado' ? 'destructive' : 'warning'}>
                                                {formatDocumentStatus(document.status)}
                                            </Badge>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Notificaciones recientes</CardTitle>
                </CardHeader>
                <CardContent>
                    {!recentNotifications.length ? (
                        <p className="text-sm text-slate-500">No hay notificaciones recientes.</p>
                    ) : (
                        <ul className="space-y-2">
                            {recentNotifications.map((notification) => (
                                <li key={notification.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <div>
                                        <p className="font-semibold">{notification.event_type}</p>
                                        <p className="text-sm text-slate-500">{formatDate(notification.created_at)}</p>
                                    </div>
                                    <Badge variant={notification.sent_at ? 'success' : 'secondary'}>
                                        {notification.sent_at ? 'Enviado' : 'Pendiente'}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
            {canSeeAudit && (
                <Card>
                    <CardHeader>
                        <CardTitle>Auditoría reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!recentAudit.length ? (
                            <p className="text-sm text-slate-500">No hay eventos de auditoría recientes.</p>
                        ) : (
                            <ul className="space-y-2">
                                {recentAudit.map((log) => (
                                    <li key={log.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <div>
                                            <p className="font-semibold">{log.action}</p>
                                            <p className="text-sm text-slate-500">{formatRole(log.actor_role)}</p>
                                        </div>
                                        <Badge variant="secondary">{formatDate(log.created_at)}</Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </section>
  );
}
