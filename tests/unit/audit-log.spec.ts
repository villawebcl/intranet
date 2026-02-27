import { expect, test } from "@playwright/test";

import { insertAuditLog, invokeInsertAuditLogRpc } from "../../lib/audit/log";

test("usuario normal no puede invocar insert_audit_log", async () => {
  const authenticatedClient = {
    rpc: async () => ({
      error: {
        code: "42501",
        message: "permission denied for function insert_audit_log",
      },
    }),
  };

  const result = await invokeInsertAuditLogRpc(authenticatedClient, {
    actorUserId: "user-id",
    actorRole: "visitante",
    action: "auth_login",
    entityType: "auth",
    entityId: null,
    metadata: { source: "client" },
  });

  expect(result.error).toMatchObject({
    code: "42501",
  });
});

test("server path si puede registrar evento con cliente privilegiado", async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];

  const adminClient = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return { error: null };
    },
  };

  const result = await insertAuditLog({
    adminClient: adminClient as never,
    actorUserId: "admin-id",
    actorRole: "admin",
    action: "auth_logout",
    entityType: "auth",
    metadata: { reason: "manual" },
  });

  expect(result).toBeTruthy();
  expect(calls[0]?.fn).toBe("insert_audit_log");
  expect(calls[0]?.args.p_action).toBe("auth_logout");
  expect(calls[0]?.args.p_actor_role).toBe("admin");
});
