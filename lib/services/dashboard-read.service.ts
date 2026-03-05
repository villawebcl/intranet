import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import { type AppRole } from "@/lib/constants/domain";

export type RecentDocumentRow = {
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

export type RecentNotificationRow = {
  id: string;
  event_type: string;
  sent_at: string | null;
  created_at: string;
};

export type RecentAuditRow = {
  id: number;
  action: string;
  actor_role: AppRole | null;
  created_at: string;
};

type LoadDashboardReadModelParams = {
  supabase: SupabaseClient;
  userId: string;
  canSeeDocuments: boolean;
  canReview: boolean;
  canSeeAudit: boolean;
  isAdmin: boolean;
};

export async function loadDashboardReadModel(params: LoadDashboardReadModelParams) {
  const workersTotalPromise = params.supabase
    .from("workers")
    .select("id", { count: "exact", head: true });
  const workersActivePromise = params.supabase
    .from("workers")
    .select("id", { count: "exact", head: true })
    .eq("status", "activo");
  const workersInactivePromise = params.supabase
    .from("workers")
    .select("id", { count: "exact", head: true })
    .eq("status", "inactivo");

  const documentsTotalPromise = params.canSeeDocuments
    ? params.supabase.from("documents").select("id", { count: "exact", head: true })
    : Promise.resolve(null);
  const documentsPendingPromise = params.canSeeDocuments
    ? params.supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "pendiente")
    : Promise.resolve(null);

  const notificationsTotalQuery = params.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true });
  const notificationsPendingEmailQuery = params.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("sent_at", null);

  const notificationsTotalPromise = params.isAdmin
    ? notificationsTotalQuery
    : notificationsTotalQuery.eq("user_id", params.userId);
  const notificationsPendingEmailPromise = params.isAdmin
    ? notificationsPendingEmailQuery
    : notificationsPendingEmailQuery.eq("user_id", params.userId);

  const recentDocumentsPromise = params.canSeeDocuments && !params.canReview
    ? params.supabase
        .from("documents")
        .select("id, worker_id, file_name, status, folder_type, created_at, worker:workers(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(5)
    : Promise.resolve(null);

  const pendingDocumentsListPromise = params.canReview
    ? params.supabase
        .from("documents")
        .select("id, worker_id, file_name, status, folder_type, created_at, worker:workers(first_name, last_name)")
        .eq("status", "pendiente")
        .order("created_at", { ascending: false })
        .limit(6)
    : Promise.resolve(null);

  let recentNotificationsQuery = params.supabase
    .from("notifications")
    .select("id, event_type, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (!params.isAdmin) {
    recentNotificationsQuery = recentNotificationsQuery.eq("user_id", params.userId);
  }

  const recentAuditPromise = params.canSeeAudit
    ? params.supabase
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
    recentNotificationsQuery,
    recentAuditPromise,
  ]);

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

  return {
    workersTotal: workersTotalResult.count ?? 0,
    workersActive: workersActiveResult.count ?? 0,
    workersInactive: workersInactiveResult.count ?? 0,
    documentsTotal: documentsTotalResult?.count ?? 0,
    documentsPending: documentsPendingResult?.count ?? 0,
    notificationsPendingEmail: notificationsPendingEmailResult.count ?? 0,
    recentDocuments: (((recentDocumentsResult?.data ?? []) as unknown) as RecentDocumentRow[]) ?? [],
    pendingDocumentsList: (((pendingDocumentsListResult?.data ?? []) as unknown) as RecentDocumentRow[]) ?? [],
    recentNotifications: ((recentNotificationsResult.data ?? []) as RecentNotificationRow[]) ?? [],
    recentAudit: ((recentAuditResult?.data ?? []) as RecentAuditRow[]) ?? [],
    queryErrors,
  };
}
