import "server-only";

import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { insertAuditLog } from "@/lib/audit/log";
import { serviceError, serviceOk, type ServiceResult } from "@/lib/services/service-result";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type UserServiceContext = {
  supabase: SupabaseServerClient;
  adminClient: SupabaseAdminClient;
  actorUserId: string;
  actorRole: AppRole;
};

type CoreUserPayload = {
  email: string;
  fullName?: string;
  role: AppRole;
  password: string;
};

async function assignProfileRoleAndWorker(params: {
  supabase: SupabaseServerClient;
  profileUserId: string;
  role: AppRole;
  workerId: string | null;
}) {
  const { error } = await params.supabase.rpc("admin_set_profile_role_and_worker", {
    profile_user_id: params.profileUserId,
    new_role: params.role,
    new_worker_id: params.workerId,
  });

  if (error) {
    console.error("admin_set_profile_role_and_worker failed", {
      profileUserId: params.profileUserId,
      role: params.role,
      workerId: params.workerId,
      error,
    });
    return serviceError("No se pudo asignar rol/perfil al usuario");
  }

  return serviceOk(undefined);
}

export async function createCoreUser(
  context: UserServiceContext,
  payload: CoreUserPayload,
): Promise<ServiceResult<{ userId: string }>> {
  const { data: createdUser, error: createError } = await context.adminClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.fullName ?? null,
    },
  });

  if (createError || !createdUser.user) {
    const message = createError?.message?.toLowerCase().includes("already")
      ? "Ya existe un usuario con ese correo"
      : "No se pudo crear el usuario";
    return serviceError(message);
  }

  const { error: profileError } = await context.adminClient.from("profiles").upsert(
    {
      id: createdUser.user.id,
      full_name: payload.fullName ?? null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return serviceError("Usuario creado en Auth, pero no se pudo registrar perfil/rol");
  }

  const assignmentResult = await assignProfileRoleAndWorker({
    supabase: context.supabase,
    profileUserId: createdUser.user.id,
    role: payload.role,
    workerId: null,
  });

  if (!assignmentResult.ok) {
    return serviceError("Usuario creado en Auth, pero no se pudo registrar perfil/rol");
  }

  await insertAuditLog({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: "user_created",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "auth",
    entityId: createdUser.user.id,
    metadata: {
      email: payload.email,
      role: payload.role,
      workerId: null,
    },
  });

  return serviceOk({ userId: createdUser.user.id });
}

export async function updateCoreUserProfile(
  context: UserServiceContext,
  payload: {
    userId: string;
    fullName?: string;
    role: AppRole;
  },
): Promise<ServiceResult<void>> {
  const { error: profileError } = await context.adminClient.from("profiles").upsert(
    {
      id: payload.userId,
      full_name: payload.fullName ?? null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return serviceError("No se pudo actualizar el perfil del usuario");
  }

  const assignmentResult = await assignProfileRoleAndWorker({
    supabase: context.supabase,
    profileUserId: payload.userId,
    role: payload.role,
    workerId: null,
  });

  if (!assignmentResult.ok) {
    return serviceError("No se pudo actualizar el perfil del usuario");
  }

  try {
    await context.adminClient.auth.admin.updateUserById(payload.userId, {
      user_metadata: {
        full_name: payload.fullName ?? null,
      },
    });
  } catch (error) {
    console.error("admin auth metadata update failed", error);
  }

  await insertAuditLog({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: "user_updated",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "auth",
    entityId: payload.userId,
    metadata: {
      role: payload.role,
      fullName: payload.fullName ?? null,
      workerId: null,
    },
  });

  return serviceOk(undefined);
}

export async function resetCoreUserPassword(
  context: UserServiceContext,
  payload: {
    userId: string;
    password: string;
  },
): Promise<ServiceResult<void>> {
  const { error } = await context.adminClient.auth.admin.updateUserById(payload.userId, {
    password: payload.password,
  });

  if (error) {
    return serviceError("No se pudo resetear la contrasena del usuario");
  }

  await insertAuditLog({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: "user_password_reset",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "auth",
    entityId: payload.userId,
  });

  return serviceOk(undefined);
}

export async function deleteCoreUser(
  context: UserServiceContext,
  payload: {
    targetUserId: string;
    protectAdminAccounts?: boolean;
  },
): Promise<ServiceResult<void>> {
  const { data: targetProfile, error: profileError } = await context.supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", payload.targetUserId)
    .maybeSingle();

  if (profileError) {
    return serviceError("No se pudo validar el usuario a eliminar");
  }

  if (payload.protectAdminAccounts !== false && targetProfile?.role === "admin") {
    return serviceError("Las cuentas admin estan protegidas y no se pueden eliminar");
  }

  const { data: authUserResult } = await context.adminClient.auth.admin.getUserById(payload.targetUserId);
  const targetEmail = authUserResult?.user?.email ?? null;

  const { error: hardDeleteError } = await context.adminClient.auth.admin.deleteUser(
    payload.targetUserId,
    false,
  );
  let deletionMode: "hard" | "soft" = "hard";

  if (hardDeleteError) {
    const { error: softDeleteError } = await context.adminClient.auth.admin.deleteUser(
      payload.targetUserId,
      true,
    );

    if (softDeleteError) {
      return serviceError("No se pudo eliminar el usuario");
    }

    deletionMode = "soft";
  }

  await insertAuditLog({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: "user_deleted",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "auth",
    entityId: payload.targetUserId,
    metadata: {
      email: targetEmail,
      role: targetProfile?.role ?? "visitante",
      fullName: targetProfile?.full_name ?? null,
      deletionMode,
    },
  });

  return serviceOk(undefined);
}
