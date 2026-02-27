import "server-only";

import { type AppRole } from "@/lib/constants/domain";
import { insertAuditLog } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type LogAuditEventParams = {
  supabase: SupabaseServerClient;
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
    action: params.action,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}
