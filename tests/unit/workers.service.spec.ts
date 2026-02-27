import { expect, test } from "@playwright/test";

import {
  activateWorkerAccess,
  archiveWorker,
  createWorkerAccess,
  deleteWorkerPermanently,
  suspendWorkerAccess,
  toggleWorkerStatus,
  unarchiveWorker,
} from "../../lib/services/workers.service";

type SelectResult = { data: unknown; error: unknown };
type UpdateResult = { data: unknown; error: unknown };

function createWorkersSupabaseStub(params: {
  selectResults: SelectResult[];
  updateResults?: UpdateResult[];
  rpcError?: unknown;
}) {
  let selectIndex = 0;
  let updateIndex = 0;

  const calls: {
    updatePayloads: Array<Record<string, unknown>>;
    rpcArgs: Array<{ fn: string; args: Record<string, unknown> }>;
  } = {
    updatePayloads: [],
    rpcArgs: [],
  };

  const supabase = {
    from: (table: string) => {
      if (table !== "workers") {
        throw new Error(`unexpected table: ${table}`);
      }

      const selectChain = {
        eq: () => selectChain,
        maybeSingle: async () => {
          const result = params.selectResults[selectIndex] ?? { data: null, error: null };
          selectIndex += 1;
          return result;
        },
      };

      return {
        select: () => selectChain,
        update: (payload: Record<string, unknown>) => {
          calls.updatePayloads.push(payload);

          const updateChain = {
            eq: () => updateChain,
            select: () => ({
              maybeSingle: async () => {
                const result = params.updateResults?.[updateIndex] ?? { data: null, error: null };
                updateIndex += 1;
                return result;
              },
            }),
          };

          return updateChain;
        },
      };
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.rpcArgs.push({ fn, args });
      return { error: params.rpcError ?? null };
    },
  };

  return { supabase, calls };
}

function createRpcOnlySupabaseStub() {
  const calls: {
    rpcArgs: Array<{ fn: string; args: Record<string, unknown> }>;
  } = {
    rpcArgs: [],
  };

  const supabase = {
    from: () => {
      throw new Error("unexpected from() call");
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.rpcArgs.push({ fn, args });
      return { error: null };
    },
  };

  return { supabase, calls };
}

function createAdminClientStub(options?: {
  profileData?: { id: string; role: string; worker_id?: string | null } | null;
  profileError?: unknown;
  deleteWorkerData?: { id: string } | null;
  deleteWorkerError?: unknown;
  getUserByIdData?: { user: { banned_until: string | null } | null };
  getUserByIdError?: unknown;
  updateUserByIdError?: unknown;
  deleteUserError?: unknown;
}) {
  const calls: {
    updateUserByIdPayloads: Array<Record<string, unknown>>;
    deleteUserCalls: Array<{ userId: string; shouldSoftDelete: boolean }>;
  } = {
    updateUserByIdPayloads: [],
    deleteUserCalls: [],
  };

  const adminClient = {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: options?.profileData ?? null,
                error: options?.profileError ?? null,
              }),
            }),
          }),
          upsert: async () => ({ error: null }),
        };
      }

      if (table === "workers") {
        return {
          delete: () => {
            const deleteChain = {
              eq: () => deleteChain,
              select: () => ({
                maybeSingle: async () => ({
                  data: options?.deleteWorkerData ?? { id: "w1" },
                  error: options?.deleteWorkerError ?? null,
                }),
              }),
            };

            return deleteChain;
          },
        };
      }

      throw new Error(`unexpected admin table: ${table}`);
    },
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        createUser: async () => ({ data: { user: { id: "auth-worker-id" } }, error: null }),
        getUserById: async () => ({
          data: options?.getUserByIdData ?? { user: null },
          error: options?.getUserByIdError ?? null,
        }),
        updateUserById: async (_userId: string, payload: Record<string, unknown>) => {
          calls.updateUserByIdPayloads.push(payload);
          return { error: options?.updateUserByIdError ?? null };
        },
        deleteUser: async (userId: string, shouldSoftDelete = false) => {
          calls.deleteUserCalls.push({ userId, shouldSoftDelete });
          return { error: options?.deleteUserError ?? null };
        },
      },
    },
  };

  return { adminClient, calls };
}

test("toggleWorkerStatus cambia activo a inactivo y audita", async () => {
  const { supabase, calls } = createWorkersSupabaseStub({
    selectResults: [{ data: { id: "w1", status: "activo", is_active: true }, error: null }],
    updateResults: [{ data: { id: "w1" }, error: null }],
  });

  const result = await toggleWorkerStatus(
    {
      supabase: supabase as never,
      actorUserId: "admin-id",
      actorRole: "admin",
    },
    { workerId: "w1" },
  );

  expect(result).toEqual({ ok: true, data: undefined });
  expect(calls.updatePayloads[0]).toMatchObject({ status: "inactivo", updated_by: "admin-id" });
  expect(calls.rpcArgs[0]?.fn).toBe("insert_audit_log");
  expect(calls.rpcArgs[0]?.args.p_action).toBe("worker_status_changed");
});

test("toggleWorkerStatus bloquea trabajadores archivados", async () => {
  const { supabase, calls } = createWorkersSupabaseStub({
    selectResults: [{ data: { id: "w1", status: "activo", is_active: false }, error: null }],
  });

  const result = await toggleWorkerStatus(
    {
      supabase: supabase as never,
      actorUserId: "admin-id",
      actorRole: "admin",
    },
    { workerId: "w1" },
  );

  expect(result).toEqual({
    ok: false,
    error: "No puedes cambiar estado de un trabajador archivado",
  });
  expect(calls.updatePayloads).toHaveLength(0);
});

test("archiveWorker archiva y suspende acceso trabajador", async () => {
  const { supabase, calls } = createWorkersSupabaseStub({
    selectResults: [
      {
        data: {
          id: "w1",
          rut: "11.111.111-1",
          first_name: "Ana",
          last_name: "Rojas",
          is_active: true,
        },
        error: null,
      },
    ],
    updateResults: [{ data: { id: "w1" }, error: null }],
  });

  const { adminClient, calls: adminCalls } = createAdminClientStub({
    profileData: { id: "auth-worker", role: "trabajador" },
    getUserByIdData: { user: { banned_until: null } },
  });

  const result = await archiveWorker(
    {
      supabase: supabase as never,
      actorUserId: "admin-id",
      actorRole: "admin",
      adminClient: adminClient as never,
    },
    { workerId: "w1" },
  );

  expect(result).toEqual({ ok: true, data: undefined });
  expect(calls.updatePayloads[0]).toMatchObject({
    is_active: false,
    status: "inactivo",
    deleted_by: "admin-id",
    updated_by: "admin-id",
  });
  expect(adminCalls.updateUserByIdPayloads[0]).toMatchObject({ ban_duration: "876000h" });
  expect(calls.rpcArgs[0]?.args.p_action).toBe("worker_archived");
});

test("unarchiveWorker restaura trabajador archivado", async () => {
  const { supabase, calls } = createWorkersSupabaseStub({
    selectResults: [
      {
        data: {
          id: "w1",
          rut: "11.111.111-1",
          first_name: "Ana",
          last_name: "Rojas",
          is_active: false,
        },
        error: null,
      },
    ],
    updateResults: [{ data: { id: "w1" }, error: null }],
  });

  const result = await unarchiveWorker(
    {
      supabase: supabase as never,
      actorUserId: "admin-id",
      actorRole: "admin",
    },
    { workerId: "w1" },
  );

  expect(result).toEqual({ ok: true, data: undefined });
  expect(calls.updatePayloads[0]).toMatchObject({
    is_active: true,
    deleted_at: null,
    deleted_by: null,
    status: "inactivo",
    updated_by: "admin-id",
  });
  expect(calls.rpcArgs[0]?.args.p_action).toBe("worker_unarchived");
});

test("deleteWorkerPermanently exige que el trabajador este archivado", async () => {
  const { supabase } = createWorkersSupabaseStub({
    selectResults: [
      {
        data: {
          id: "w1",
          rut: "11.111.111-1",
          first_name: "Ana",
          last_name: "Rojas",
          is_active: true,
        },
        error: null,
      },
    ],
  });
  const { adminClient } = createAdminClientStub();

  const result = await deleteWorkerPermanently(
    {
      supabase: supabase as never,
      actorUserId: "admin-id",
      actorRole: "admin",
      adminClient: adminClient as never,
    },
    { workerId: "w1" },
  );

  expect(result).toEqual({
    ok: false,
    error: "Solo puedes eliminar definitivamente trabajadores archivados",
  });
});

test("deleteWorkerPermanently elimina trabajador archivado y su acceso vinculado", async () => {
  const { supabase, calls } = createWorkersSupabaseStub({
    selectResults: [
      {
        data: {
          id: "w1",
          rut: "11.111.111-1",
          first_name: "Ana",
          last_name: "Rojas",
          is_active: false,
        },
        error: null,
      },
    ],
  });
  const { adminClient, calls: adminCalls } = createAdminClientStub({
    profileData: { id: "auth-worker", role: "trabajador", worker_id: "w1" },
    deleteWorkerData: { id: "w1" },
  });

  const result = await deleteWorkerPermanently(
    {
      supabase: supabase as never,
      actorUserId: "admin-id",
      actorRole: "admin",
      adminClient: adminClient as never,
    },
    { workerId: "w1" },
  );

  expect(result).toEqual({
    ok: true,
    data: {
      hadLinkedAccess: true,
      linkedAccessDeleted: true,
    },
  });
  expect(adminCalls.deleteUserCalls[0]).toEqual({
    userId: "auth-worker",
    shouldSoftDelete: true,
  });
  expect(calls.rpcArgs[0]?.args.p_action).toBe("worker_deleted");
});

test("createWorkerAccess valida correo requerido", async () => {
  const { supabase } = createWorkersSupabaseStub({
    selectResults: [
      {
        data: {
          id: "w1",
          first_name: "Ana",
          last_name: "Rojas",
          email: null,
          is_active: true,
        },
        error: null,
      },
    ],
  });
  const { adminClient } = createAdminClientStub();

  const result = await createWorkerAccess(
    {
      supabase: supabase as never,
      actorUserId: "admin-id",
      actorRole: "admin",
      adminClient: adminClient as never,
    },
    {
      workerId: "w1",
      temporaryPassword: "Password123",
    },
  );

  expect(result).toEqual({
    ok: false,
    error: "El trabajador debe tener correo para crear su acceso",
  });
});

test("suspendWorkerAccess detecta cuenta ya suspendida", async () => {
  const { supabase } = createRpcOnlySupabaseStub();
  const { adminClient } = createAdminClientStub({
    profileData: { id: "auth-worker", role: "trabajador", worker_id: "w1" },
    getUserByIdData: { user: { banned_until: "2999-01-01T00:00:00.000Z" } },
  });

  const result = await suspendWorkerAccess(
    {
      supabase: supabase as never,
      actorUserId: "admin-id",
      actorRole: "admin",
      adminClient: adminClient as never,
    },
    { workerId: "w1" },
  );

  expect(result).toEqual({
    ok: false,
    error: "El acceso del trabajador ya esta suspendido",
  });
});

test("activateWorkerAccess reactiva acceso suspendido y audita", async () => {
  const { supabase, calls } = createRpcOnlySupabaseStub();
  const { adminClient, calls: adminCalls } = createAdminClientStub({
    profileData: { id: "auth-worker", role: "trabajador", worker_id: "w1" },
    getUserByIdData: { user: { banned_until: "2999-01-01T00:00:00.000Z" } },
  });

  const result = await activateWorkerAccess(
    {
      supabase: supabase as never,
      actorUserId: "admin-id",
      actorRole: "admin",
      adminClient: adminClient as never,
    },
    { workerId: "w1" },
  );

  expect(result).toEqual({ ok: true, data: undefined });
  expect(adminCalls.updateUserByIdPayloads[0]).toMatchObject({ ban_duration: "none" });
  expect(calls.rpcArgs[0]?.args.p_action).toBe("worker_access_activated");
});
