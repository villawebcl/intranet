import "server-only";

import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type InsertAuditLogParams = {
  supabase?: SupabaseServerClient;
  actorUserId: string;
  actorRole: AppRole;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function insertAuditLog(params: InsertAuditLogParams) {
  const supabaseClient = params.supabase ?? (await createSupabaseServerClient());

  const { error } = await supabaseClient.rpc("insert_audit_log", {
    p_actor_user_id: params.actorUserId,
    p_actor_role: params.actorRole,
    p_action: params.action,
    p_entity_type: params.entityType ?? null,
    p_entity_id: params.entityId ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("audit log insert failed", {
      action: params.action,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      error,
    });
    return false;
  }

  return true;
}
