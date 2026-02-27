import { expect, test } from "@playwright/test";

import { createApprovedDownloadUrl } from "../../lib/services/documents.service";
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
  deleteUserResult?: { error: unknown };
  profileUpsertError?: unknown;
}) {
  const calls: {
    profileUpsertPayload?: Record<string, unknown>;
  } = {};

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
        deleteUser: async () => options.deleteUserResult ?? { error: null },
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

function createAdminStorageClientStub(options?: { signedUrl?: string; signedUrlError?: unknown }) {
  const calls: {
    signedUrlInput?: { path: string; expiresInSeconds: number };
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
    calls.rpcCalls.some((rpcCall) => rpcCall.fn === "insert_audit_log" && rpcCall.args.p_action === "user_created"),
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
  expect(calls.rpcArgs?.fn).toBe("insert_audit_log");
  expect(calls.rpcArgs?.args.p_action).toBe("document_downloaded");
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
