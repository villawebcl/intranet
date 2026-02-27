import "server-only";

import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type AuditRpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => unknown;
};

type InsertAuditLogParams = {
  // Kept only for backward-compatible call sites. Audit writes no longer use session clients.
  supabase?: SupabaseServerClient;
  adminClient?: SupabaseAdminClient;
  actorUserId: string;
  actorRole: AppRole;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function invokeInsertAuditLogRpc(
  client: AuditRpcClient,
  params: Omit<InsertAuditLogParams, "supabase" | "adminClient">,
) {
  const result = (await client.rpc("insert_audit_log", {
    p_actor_user_id: params.actorUserId,
    p_actor_role: params.actorRole,
    p_action: params.action,
    p_entity_type: params.entityType ?? null,
    p_entity_id: params.entityId ?? null,
    p_metadata: params.metadata ?? {},
  })) as { error?: unknown } | null;

  return { error: result?.error ?? null };
}

export async function insertAuditLog(params: InsertAuditLogParams) {
  let adminClient: SupabaseAdminClient;
  try {
    adminClient = params.adminClient ?? createSupabaseAdminClient();
  } catch (error) {
    console.error("audit log admin client unavailable", {
      action: params.action,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      error,
    });
    return false;
  }

  const { error } = await invokeInsertAuditLogRpc(adminClient, {
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    action: params.action,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    metadata: params.metadata ?? {},
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
