import { expect, test } from "@playwright/test";

import { createApprovedDownloadUrl, resolveDocumentDownloadRequest } from "../../lib/services/documents.service";
import { createCoreUser, deleteCoreUser } from "../../lib/services/users.service";

function createUsersSupabaseStub(options?: {
  profileRole?: string;
  profileFullName?: string | null;
  upsertError?: unknown;
  profileLookupError?: unknown;
  rpcError?: unknown;
}) {
  const calls: {
    upsertPayload?: Record<string, unknown>;
    rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
  } = {
    rpcCalls: [],
  };

  const supabase = {
    from: (table: string) => {
      if (table !== "profiles") {
        throw new Error(`unexpected table: ${table}`);
      }

      return {
        upsert: async (payload: Record<string, unknown>) => {
          calls.upsertPayload = payload;
          return { error: options?.upsertError ?? null };
        },
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data:
                options?.profileRole === undefined
                  ? null
                  : {
                      role: options.profileRole,
                      full_name: options.profileFullName ?? null,
                    },
              error: options?.profileLookupError ?? null,
            }),
          }),
        }),
      };
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.rpcCalls.push({ fn, args });
      return { error: options?.rpcError ?? null };
    },
  };

  return { supabase, calls };
}

function createAdminClientStub(options: {
  createUserResult?: { data: { user: { id: string } | null }; error: { message: string } | null };
  getUserByIdResult?: { data: { user: { email?: string | null } | null }; error: unknown };
  deleteUserResults?: Array<{ error: unknown }>;
  profileUpsertError?: unknown;
}) {
  const calls: {
    profileUpsertPayload?: Record<string, unknown>;
    deleteUserInputs: Array<{ userId: string; shouldSoftDelete: boolean }>;
    rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
  } = {
    deleteUserInputs: [],
    rpcCalls: [],
  };

  const adminClient = {
    auth: {
      admin: {
        createUser: async () =>
          options.createUserResult ?? {
            data: { user: { id: "new-user-id" } },
            error: null,
          },
        getUserById: async () =>
          options.getUserByIdResult ?? {
            data: { user: { email: "target@example.com" } },
            error: null,
          },
        deleteUser: async (userId: string, shouldSoftDelete = false) => {
          calls.deleteUserInputs.push({ userId, shouldSoftDelete });
          const currentCallIndex = calls.deleteUserInputs.length - 1;
          return options.deleteUserResults?.[currentCallIndex] ?? { error: null };
        },
      },
    },
    from: (table: string) => {
      if (table !== "profiles") {
        throw new Error(`unexpected table: ${table}`);
      }

      return {
        upsert: async (payload: Record<string, unknown>) => {
          calls.profileUpsertPayload = payload;
          return { error: options.profileUpsertError ?? null };
        },
      };
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.rpcCalls.push({ fn, args });
      return { error: null };
    },
  };

  return { adminClient, calls };
}

function createDocumentSupabaseStub(options: {
  request?: {
    id: string;
    status: "pendiente" | "aprobado" | "rechazado";
    worker_id: string;
    document_id: string;
    requested_by: string;
  } | null;
  document?: {
    id: string;
    file_path: string;
    worker_id: string;
  } | null;
  signedUrl?: string;
  signedUrlError?: unknown;
  rpcError?: unknown;
}) {
  const calls: {
    downloadRequestFilters: Record<string, unknown>;
    documentFilters: Record<string, unknown>;
    signedUrlInput?: { path: string; expiresInSeconds: number };
    rpcArgs?: { fn: string; args: Record<string, unknown> };
  } = {
    downloadRequestFilters: {},
    documentFilters: {},
  };

  const supabase = {
    from: (table: string) => {
      if (table === "download_requests") {
        const query = {
          select: () => query,
          eq: (field: string, value: unknown) => {
            calls.downloadRequestFilters[field] = value;
            return query;
          },
          maybeSingle: async () => ({ data: options.request ?? null, error: null }),
        };

        return query;
      }

      if (table === "documents") {
        const query = {
          select: () => query,
          eq: (field: string, value: unknown) => {
            calls.documentFilters[field] = value;
            return query;
          },
          maybeSingle: async () => ({ data: options.document ?? null, error: null }),
        };

        return query;
      }

      throw new Error(`unexpected table: ${table}`);
    },
    storage: {
      from: (bucket: string) => {
        if (bucket !== "documents") {
          throw new Error(`unexpected bucket: ${bucket}`);
        }

        return {
          createSignedUrl: async (path: string, expiresInSeconds: number) => {
            calls.signedUrlInput = { path, expiresInSeconds };
            return {
              data: options.signedUrl ? { signedUrl: options.signedUrl } : null,
              error: options.signedUrlError ?? null,
            };
          },
        };
      },
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.rpcArgs = { fn, args };
      return { error: options.rpcError ?? null };
    },
  };

  return { supabase, calls };
}

function createResolveDownloadRequestSupabaseStub(params: {
  selectResults: Array<{ data: unknown; error: unknown }>;
  updateResults: Array<{ data: unknown; error: unknown }>;
}) {
  let selectIndex = 0;
  let updateIndex = 0;

  const calls: {
    updatePayloads: Array<Record<string, unknown>>;
  } = {
    updatePayloads: [],
  };

  const supabase = {
    from: (table: string) => {
      if (table !== "download_requests") {
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
                const result = params.updateResults[updateIndex] ?? { data: null, error: null };
                updateIndex += 1;
                return result;
              },
            }),
          };

          return updateChain;
        },
      };
    },
  };

  return { supabase, calls };
}

function createAdminStorageClientStub(options?: { signedUrl?: string; signedUrlError?: unknown }) {
  const calls: {
    signedUrlInput?: { path: string; expiresInSeconds: number };
    rpcArgs?: { fn: string; args: Record<string, unknown> };
  } = {};

  const adminClient = {
    storage: {
      from: (bucket: string) => {
        if (bucket !== "documents") {
          throw new Error(`unexpected bucket: ${bucket}`);
        }

        return {
          createSignedUrl: async (path: string, expiresInSeconds: number) => {
            calls.signedUrlInput = { path, expiresInSeconds };
            return {
              data: options?.signedUrl ? { signedUrl: options.signedUrl } : null,
              error: options?.signedUrlError ?? null,
            };
          },
        };
      },
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.rpcArgs = { fn, args };
      return { error: null };
    },
  };

  return { adminClient, calls };
}

test("createCoreUser mapea error de correo duplicado", async () => {
  const { supabase } = createUsersSupabaseStub();
  const { adminClient } = createAdminClientStub({
    createUserResult: {
      data: { user: null },
      error: { message: "User already registered" },
    },
  });

  const result = await createCoreUser(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "admin-id",
      actorRole: "admin",
    },
    {
      email: "duplicado@example.com",
      fullName: "Usuario Duplicado",
      role: "rrhh",
      password: "Password123",
    },
  );

  expect(result).toEqual({ ok: false, error: "Ya existe un usuario con ese correo" });
});

test("createCoreUser crea perfil y registra auditoria", async () => {
  const { supabase, calls } = createUsersSupabaseStub();
  const { adminClient, calls: adminCalls } = createAdminClientStub({});

  const result = await createCoreUser(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "admin-id",
      actorRole: "admin",
    },
    {
      email: "nuevo@example.com",
      fullName: "Nuevo Usuario",
      role: "contabilidad",
      password: "Password123",
    },
  );

  expect(result).toEqual({ ok: true, data: { userId: "new-user-id" } });
  expect(adminCalls.profileUpsertPayload).toMatchObject({
    id: "new-user-id",
    full_name: "Nuevo Usuario",
  });
  expect(calls.rpcCalls.some((rpcCall) => rpcCall.fn === "admin_set_profile_role_and_worker")).toBeTruthy();
  expect(
    adminCalls.rpcCalls.some(
      (rpcCall) => rpcCall.fn === "insert_audit_log" && rpcCall.args.p_action === "user_created",
    ),
  ).toBeTruthy();
});

test("deleteCoreUser protege cuentas admin", async () => {
  const { supabase } = createUsersSupabaseStub({
    profileRole: "admin",
    profileFullName: "Admin Protegido",
  });
  const { adminClient } = createAdminClientStub({});

  const result = await deleteCoreUser(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "admin-id",
      actorRole: "admin",
    },
    {
      targetUserId: "target-id",
      protectAdminAccounts: true,
    },
  );

  expect(result).toEqual({
    ok: false,
    error: "Las cuentas admin estan protegidas y no se pueden eliminar",
  });
});

test("deleteCoreUser usa hard delete cuando Auth lo permite", async () => {
  const { supabase } = createUsersSupabaseStub({
    profileRole: "visitante",
    profileFullName: "Usuario Demo",
  });
  const { adminClient, calls } = createAdminClientStub({});

  const result = await deleteCoreUser(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "admin-id",
      actorRole: "admin",
    },
    {
      targetUserId: "target-id",
      protectAdminAccounts: true,
    },
  );

  expect(result).toEqual({ ok: true, data: undefined });
  expect(calls.deleteUserInputs).toEqual([{ userId: "target-id", shouldSoftDelete: false }]);
});

test("deleteCoreUser usa soft delete como fallback si falla hard delete", async () => {
  const { supabase } = createUsersSupabaseStub({
    profileRole: "visitante",
    profileFullName: "Usuario Demo",
  });
  const { adminClient, calls } = createAdminClientStub({
    deleteUserResults: [{ error: { message: "fk violation" } }, { error: null }],
  });

  const result = await deleteCoreUser(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "admin-id",
      actorRole: "admin",
    },
    {
      targetUserId: "target-id",
      protectAdminAccounts: true,
    },
  );

  expect(result).toEqual({ ok: true, data: undefined });
  expect(calls.deleteUserInputs).toEqual([
    { userId: "target-id", shouldSoftDelete: false },
    { userId: "target-id", shouldSoftDelete: true },
  ]);
});

test("resolveDocumentDownloadRequest aprueba solicitud pendiente y audita", async () => {
  const { supabase, calls } = createResolveDownloadRequestSupabaseStub({
    selectResults: [
      {
        data: {
          id: "req-1",
          status: "pendiente",
          worker_id: "worker-1",
          document_id: "doc-1",
          requested_by: "visitante-1",
        },
        error: null,
      },
    ],
    updateResults: [
      {
        data: {
          id: "req-1",
          status: "aprobado",
          worker_id: "worker-1",
          document_id: "doc-1",
          requested_by: "visitante-1",
        },
        error: null,
      },
    ],
  });
  const { adminClient, calls: adminCalls } = createAdminClientStub({});

  const result = await resolveDocumentDownloadRequest(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "rrhh-1",
      actorRole: "rrhh",
    },
    {
      workerId: "worker-1",
      requestId: "req-1",
      decision: "aprobado",
      decisionNote: "ok",
    },
  );

  expect(result).toEqual({ ok: true, data: undefined });
  expect(calls.updatePayloads).toHaveLength(1);
  expect(adminCalls.rpcCalls).toHaveLength(1);
  expect(adminCalls.rpcCalls[0]?.fn).toBe("insert_audit_log");
  expect(adminCalls.rpcCalls[0]?.args.p_action).toBe("document_download_request_approved");
});

test("resolveDocumentDownloadRequest falla si solicitud ya esta procesada", async () => {
  const { supabase, calls } = createResolveDownloadRequestSupabaseStub({
    selectResults: [
      {
        data: {
          id: "req-1",
          status: "aprobado",
          worker_id: "worker-1",
          document_id: "doc-1",
          requested_by: "visitante-1",
        },
        error: null,
      },
    ],
    updateResults: [],
  });
  const { adminClient, calls: adminCalls } = createAdminClientStub({});

  const result = await resolveDocumentDownloadRequest(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "rrhh-1",
      actorRole: "rrhh",
    },
    {
      workerId: "worker-1",
      requestId: "req-1",
      decision: "aprobado",
      decisionNote: null,
    },
  );

  expect(result).toEqual({ ok: false, error: "La solicitud ya fue procesada" });
  expect(calls.updatePayloads).toHaveLength(0);
  expect(adminCalls.rpcCalls).toHaveLength(0);
});

test("resolveDocumentDownloadRequest evita side-effects duplicados en doble aprobacion", async () => {
  const { supabase, calls } = createResolveDownloadRequestSupabaseStub({
    selectResults: [
      {
        data: {
          id: "req-1",
          status: "pendiente",
          worker_id: "worker-1",
          document_id: "doc-1",
          requested_by: "visitante-1",
        },
        error: null,
      },
      {
        data: {
          id: "req-1",
          status: "pendiente",
          worker_id: "worker-1",
          document_id: "doc-1",
          requested_by: "visitante-1",
        },
        error: null,
      },
    ],
    updateResults: [
      {
        data: {
          id: "req-1",
          status: "aprobado",
          worker_id: "worker-1",
          document_id: "doc-1",
          requested_by: "visitante-1",
        },
        error: null,
      },
      {
        data: null,
        error: null,
      },
    ],
  });
  const { adminClient, calls: adminCalls } = createAdminClientStub({});

  const first = await resolveDocumentDownloadRequest(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "rrhh-1",
      actorRole: "rrhh",
    },
    {
      workerId: "worker-1",
      requestId: "req-1",
      decision: "aprobado",
      decisionNote: null,
    },
  );

  const second = await resolveDocumentDownloadRequest(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "rrhh-1",
      actorRole: "rrhh",
    },
    {
      workerId: "worker-1",
      requestId: "req-1",
      decision: "aprobado",
      decisionNote: null,
    },
  );

  expect(first).toEqual({ ok: true, data: undefined });
  expect(second).toEqual({ ok: false, error: "La solicitud ya fue procesada" });
  expect(calls.updatePayloads).toHaveLength(2);
  expect(
    adminCalls.rpcCalls.filter(
      (rpcCall) => rpcCall.fn === "insert_audit_log" && rpcCall.args.p_action === "document_download_request_approved",
    ),
  ).toHaveLength(1);
});

test("createApprovedDownloadUrl bloquea sin permisos", async () => {
  const { supabase } = createDocumentSupabaseStub({
    request: null,
    document: null,
  });
  const { adminClient } = createAdminStorageClientStub({
    signedUrl: "https://signed.example/doc",
  });

  const result = await createApprovedDownloadUrl(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "visitante-id",
      actorRole: "visitante",
    },
    {
      workerId: "worker-1",
      requestId: "req-1",
      canReview: false,
      canConsumeApproved: false,
      expiresInSeconds: 300,
    },
  );

  expect(result).toEqual({
    ok: false,
    error: "No tienes permisos para usar enlaces aprobados",
  });
});

test("createApprovedDownloadUrl genera enlace temporal para solicitud aprobada", async () => {
  const { supabase, calls } = createDocumentSupabaseStub({
    request: {
      id: "req-1",
      status: "aprobado",
      worker_id: "worker-1",
      document_id: "doc-1",
      requested_by: "visitante-id",
    },
    document: {
      id: "doc-1",
      worker_id: "worker-1",
      file_path: "worker-1/folder_01/file.pdf",
    },
    signedUrl: "https://signed.example/doc",
  });
  const { adminClient, calls: adminCalls } = createAdminStorageClientStub({
    signedUrl: "https://signed.example/doc",
  });

  const result = await createApprovedDownloadUrl(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "visitante-id",
      actorRole: "visitante",
    },
    {
      workerId: "worker-1",
      requestId: "req-1",
      canReview: false,
      canConsumeApproved: true,
      expiresInSeconds: 300,
    },
  );

  expect(result).toEqual({
    ok: true,
    data: {
      signedUrl: "https://signed.example/doc",
      expiresAt: expect.any(String),
    },
  });
  expect(calls.downloadRequestFilters.requested_by).toBe("visitante-id");
  expect(adminCalls.signedUrlInput).toEqual({
    path: "worker-1/folder_01/file.pdf",
    expiresInSeconds: 300,
  });
  expect(adminCalls.rpcArgs?.fn).toBe("insert_audit_log");
  expect(adminCalls.rpcArgs?.args.p_action).toBe("document_downloaded");
});

test("createApprovedDownloadUrl falla cuando la solicitud no esta aprobada", async () => {
  const { supabase } = createDocumentSupabaseStub({
    request: {
      id: "req-1",
      status: "pendiente",
      worker_id: "worker-1",
      document_id: "doc-1",
      requested_by: "visitante-id",
    },
    document: {
      id: "doc-1",
      worker_id: "worker-1",
      file_path: "worker-1/folder_01/file.pdf",
    },
    signedUrl: "https://signed.example/doc",
  });
  const { adminClient } = createAdminStorageClientStub({
    signedUrl: "https://signed.example/doc",
  });

  const result = await createApprovedDownloadUrl(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "visitante-id",
      actorRole: "visitante",
    },
    {
      workerId: "worker-1",
      requestId: "req-1",
      canReview: false,
      canConsumeApproved: true,
      expiresInSeconds: 300,
    },
  );

  expect(result).toEqual({
    ok: false,
    error: "La solicitud aun no esta aprobada",
  });
});

test("createApprovedDownloadUrl bloquea solicitud aprobada de otro usuario", async () => {
  const { supabase } = createDocumentSupabaseStub({
    request: {
      id: "req-1",
      status: "aprobado",
      worker_id: "worker-1",
      document_id: "doc-1",
      requested_by: "otro-usuario",
    },
    document: {
      id: "doc-1",
      worker_id: "worker-1",
      file_path: "worker-1/folder_01/file.pdf",
    },
    signedUrl: "https://signed.example/doc",
  });
  const { adminClient } = createAdminStorageClientStub({
    signedUrl: "https://signed.example/doc",
  });

  const result = await createApprovedDownloadUrl(
    {
      supabase: supabase as never,
      adminClient: adminClient as never,
      actorUserId: "visitante-id",
      actorRole: "visitante",
    },
    {
      workerId: "worker-1",
      requestId: "req-1",
      canReview: false,
      canConsumeApproved: true,
      expiresInSeconds: 300,
    },
  );

  expect(result).toEqual({
    ok: false,
    error: "Solicitud aprobada no encontrada",
  });
});
