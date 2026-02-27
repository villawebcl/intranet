import "server-only";

import { type AppRole } from "@/lib/constants/domain";
import { insertAuditLog } from "@/lib/audit/log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type LogAuditEventParams = {
  supabase: SupabaseServerClient;
  adminClient?: SupabaseAdminClient;
  action: string;
  actorUserId: string;
  actorRole: AppRole;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(params: LogAuditEventParams) {
  return insertAuditLog({
    supabase: params.supabase,
    adminClient: params.adminClient,
    action: params.action,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}
