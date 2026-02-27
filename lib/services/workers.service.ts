import "server-only";

import { type AppRole } from "@/lib/constants/domain";
import { type WorkerFormInput } from "@/lib/validators/workers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { logAuditEvent } from "@/lib/services/audit.service";
import { type ServiceResult } from "@/lib/services/service-result";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type WorkerServiceContext = {
  supabase: SupabaseServerClient;
  actorUserId: string;
  actorRole: AppRole;
  adminClient?: SupabaseAdminClient;
};

type WorkerAccessProfile = {
  id: string;
  role: string;
  worker_id: string | null;
};

function getAdminClient(context: WorkerServiceContext) {
  if (context.adminClient) {
    return {
      ok: true as const,
      client: context.adminClient,
    };
  }

  try {
    return {
      ok: true as const,
      client: createSupabaseAdminClient(),
    };
  } catch {
    return {
      ok: false as const,
      error: "Falta configuracion de servicio para gestionar accesos de trabajadores",
    };
  }
}

export function isUserSuspended(bannedUntil: string | null | undefined) {
  if (!bannedUntil) {
    return false;
  }

  const bannedUntilDate = new Date(bannedUntil);
  if (Number.isNaN(bannedUntilDate.getTime())) {
    return false;
  }

  return bannedUntilDate.getTime() > Date.now();
}

async function listAllAuthUsers(adminClient: SupabaseAdminClient) {
  const users: Array<{
    id: string;
    email?: string | null;
  }> = [];

  const perPage = 1000;
  let page = 1;

  while (page <= 50) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { users: null as null, error };
    }

    users.push(...data.users);
    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return { users, error: null };
}

async function linkWorkerProfileWithRole(params: {
  context: WorkerServiceContext;
  adminClient: SupabaseAdminClient;
  authUserId: string;
  fullName: string | null;
  workerId: string;
}): Promise<ServiceResult<void>> {
  if (params.context.actorRole === "admin") {
    const { error: profileBaseError } = await params.adminClient.from("profiles").upsert(
      {
        id: params.authUserId,
        full_name: params.fullName,
      },
      { onConflict: "id" },
    );

    if (profileBaseError) {
      return { ok: false, error: "No se pudo preparar el perfil del trabajador" };
    }

    const { error: assignmentError } = await params.context.supabase.rpc("admin_set_profile_role_and_worker", {
      profile_user_id: params.authUserId,
      new_role: "trabajador",
      new_worker_id: params.workerId,
    });

    if (assignmentError) {
      console.error("admin_set_profile_role_and_worker failed for worker profile", {
        actorRole: params.context.actorRole,
        authUserId: params.authUserId,
        workerId: params.workerId,
        error: assignmentError,
      });
      return { ok: false, error: "No se pudo vincular la cuenta al trabajador" };
    }

    return { ok: true, data: undefined };
  }

  const { error: profileError } = await params.adminClient.from("profiles").upsert(
    {
      id: params.authUserId,
      role: "trabajador",
      full_name: params.fullName,
      worker_id: params.workerId,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return { ok: false, error: "No se pudo vincular la cuenta al trabajador" };
  }

  return { ok: true, data: undefined };
}

export async function createWorkerRecord(
  context: WorkerServiceContext,
  payload: WorkerFormInput,
): Promise<ServiceResult<{ workerId: string }>> {
  const { data: worker, error } = await context.supabase
    .from("workers")
    .insert({
      rut: payload.rut,
      first_name: payload.firstName,
      last_name: payload.lastName,
      position: payload.position ?? null,
      area: payload.area ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      status: "activo",
      created_by: context.actorUserId,
      updated_by: context.actorUserId,
    })
    .select("id")
    .single();

  if (error) {
    const message =
      error.code === "23505" ? "Ya existe un trabajador con ese RUT" : "No se pudo crear el trabajador";
    return { ok: false, error: message };
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_created",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    entityId: worker.id,
    metadata: {
      rut: payload.rut,
    },
  });

  return { ok: true, data: { workerId: worker.id } };
}

export async function updateWorkerRecord(
  context: WorkerServiceContext,
  payload: {
    workerId: string;
    data: WorkerFormInput;
  },
): Promise<ServiceResult<void>> {
  const { data: existingWorker, error: existingWorkerError } = await context.supabase
    .from("workers")
    .select("id, is_active")
    .eq("id", payload.workerId)
    .maybeSingle();

  if (existingWorkerError || !existingWorker) {
    return { ok: false, error: "Trabajador no encontrado" };
  }

  if (!existingWorker.is_active) {
    return { ok: false, error: "No puedes editar un trabajador archivado" };
  }

  const { error } = await context.supabase
    .from("workers")
    .update({
      rut: payload.data.rut,
      first_name: payload.data.firstName,
      last_name: payload.data.lastName,
      position: payload.data.position ?? null,
      area: payload.data.area ?? null,
      email: payload.data.email ?? null,
      phone: payload.data.phone ?? null,
      updated_by: context.actorUserId,
    })
    .eq("id", payload.workerId);

  if (error) {
    const message =
      error.code === "23505"
        ? "Ya existe un trabajador con ese RUT"
        : "No se pudo actualizar el trabajador";
    return { ok: false, error: message };
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_updated",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    entityId: payload.workerId,
  });

  return { ok: true, data: undefined };
}

export async function createWorkerAccess(
  context: WorkerServiceContext,
  payload: {
    workerId: string;
    temporaryPassword: string;
  },
): Promise<ServiceResult<void>> {
  const adminClientResult = getAdminClient(context);
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error };
  }
  const adminClient = adminClientResult.client;

  const { data: worker, error: workerError } = await context.supabase
    .from("workers")
    .select("id, first_name, last_name, email, is_active")
    .eq("id", payload.workerId)
    .maybeSingle();

  if (workerError || !worker) {
    return { ok: false, error: "Trabajador no encontrado" };
  }

  if (!worker.is_active) {
    return { ok: false, error: "No puedes crear acceso para un trabajador archivado" };
  }

  if (!worker.email) {
    return { ok: false, error: "El trabajador debe tener correo para crear su acceso" };
  }

  const normalizedEmail = worker.email.trim().toLowerCase();

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("worker_id", worker.id)
    .maybeSingle();

  if (existingProfileError) {
    return { ok: false, error: "No se pudo validar acceso existente del trabajador" };
  }

  if (existingProfile) {
    return { ok: false, error: "El trabajador ya tiene una cuenta asociada" };
  }

  const { data: usersPage, error: usersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersError) {
    return { ok: false, error: "No se pudo validar si el correo ya esta registrado" };
  }

  const existingEmailUser = usersPage.users.find((item) => (item.email ?? "").toLowerCase() === normalizedEmail);
  if (existingEmailUser) {
    return {
      ok: false,
      error: "Ya existe una cuenta con ese correo. Usa otro correo o vincula esa cuenta manualmente.",
    };
  }

  const fullName = `${worker.first_name ?? ""} ${worker.last_name ?? ""}`.trim();
  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: payload.temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || null,
    },
  });

  if (createUserError || !createdUser.user) {
    return { ok: false, error: "No se pudo crear la cuenta de acceso del trabajador" };
  }

  const profileLinkResult = await linkWorkerProfileWithRole({
    context,
    adminClient,
    authUserId: createdUser.user.id,
    fullName: fullName || null,
    workerId: worker.id,
  });

  if (!profileLinkResult.ok) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return { ok: false, error: profileLinkResult.error };
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_access_created",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    entityId: worker.id,
    metadata: {
      workerEmail: normalizedEmail,
      authUserId: createdUser.user.id,
    },
  });

  return { ok: true, data: undefined };
}

export async function createMissingWorkerAccesses(
  context: WorkerServiceContext,
): Promise<
  ServiceResult<{
    createdCount: number;
    skippedCount: number;
    errorCount: number;
    totalCandidates: number;
  }>
> {
  const adminClientResult = getAdminClient(context);
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error };
  }
  const adminClient = adminClientResult.client;

  const { data: workers, error: workersError } = await context.supabase
    .from("workers")
    .select("id, first_name, last_name, email, is_active")
    .eq("is_active", true)
    .not("email", "is", null);

  if (workersError) {
    return { ok: false, error: "No se pudieron cargar trabajadores candidatos" };
  }

  const candidates = (workers ?? []).filter((worker) => Boolean(worker.email?.trim().length));

  if (!candidates.length) {
    return { ok: false, error: "No hay trabajadores activos con correo para crear accesos" };
  }

  const workerIds = candidates.map((worker) => worker.id);
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, role, worker_id")
    .in("worker_id", workerIds);

  if (profilesError) {
    return { ok: false, error: "No se pudo validar accesos existentes" };
  }

  const profileByWorkerId = new Map(
    (profiles ?? [])
      .filter((profile): profile is WorkerAccessProfile => Boolean(profile.worker_id))
      .map((profile) => [profile.worker_id, profile]),
  );

  const { users, error: usersError } = await listAllAuthUsers(adminClient);
  if (usersError || !users) {
    return { ok: false, error: "No se pudo validar correos existentes en Auth" };
  }

  const existingEmails = new Set(users.map((item) => (item.email ?? "").toLowerCase()).filter(Boolean));

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const worker of candidates) {
    const normalizedEmail = worker.email!.trim().toLowerCase();
    const linkedProfile = profileByWorkerId.get(worker.id);

    if (linkedProfile?.role === "trabajador") {
      skippedCount += 1;
      continue;
    }

    if (linkedProfile && linkedProfile.role !== "trabajador") {
      errorCount += 1;
      continue;
    }

    if (existingEmails.has(normalizedEmail)) {
      errorCount += 1;
      continue;
    }

    const fullName = `${worker.first_name ?? ""} ${worker.last_name ?? ""}`.trim();
    const { data: invitedData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          full_name: fullName || null,
        },
      },
    );

    if (inviteError || !invitedData.user) {
      errorCount += 1;
      continue;
    }

    const profileLinkResult = await linkWorkerProfileWithRole({
      context,
      adminClient,
      authUserId: invitedData.user.id,
      fullName: fullName || null,
      workerId: worker.id,
    });

    if (!profileLinkResult.ok) {
      await adminClient.auth.admin.deleteUser(invitedData.user.id);
      errorCount += 1;
      continue;
    }

    existingEmails.add(normalizedEmail);
    createdCount += 1;

    await logAuditEvent({
      supabase: context.supabase,
      action: "worker_access_created",
      actorUserId: context.actorUserId,
      actorRole: context.actorRole,
      entityType: "worker",
      entityId: worker.id,
      metadata: {
        workerEmail: normalizedEmail,
        authUserId: invitedData.user.id,
        bulk: true,
      },
    });
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_access_bulk_created",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    metadata: {
      createdCount,
      skippedCount,
      errorCount,
      totalCandidates: candidates.length,
    },
  });

  return {
    ok: true,
    data: {
      createdCount,
      skippedCount,
      errorCount,
      totalCandidates: candidates.length,
    },
  };
}

export async function suspendWorkerAccess(
  context: WorkerServiceContext,
  payload: {
    workerId: string;
  },
): Promise<ServiceResult<void>> {
  const adminClientResult = getAdminClient(context);
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error };
  }
  const adminClient = adminClientResult.client;

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, worker_id")
    .eq("worker_id", payload.workerId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: "No se pudo validar acceso asociado al trabajador" };
  }

  if (!profile || profile.role !== "trabajador") {
    return { ok: false, error: "El trabajador no tiene acceso para suspender" };
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(profile.id);
  if (authError || !authData.user) {
    return { ok: false, error: "No se encontro la cuenta de acceso del trabajador" };
  }

  if (isUserSuspended(authData.user.banned_until)) {
    return { ok: false, error: "El acceso del trabajador ya esta suspendido" };
  }

  const { error: suspendError } = await adminClient.auth.admin.updateUserById(profile.id, {
    ban_duration: "876000h",
  });

  if (suspendError) {
    return { ok: false, error: "No se pudo suspender el acceso del trabajador" };
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_access_suspended",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    entityId: payload.workerId,
    metadata: {
      authUserId: profile.id,
    },
  });

  return { ok: true, data: undefined };
}

export async function activateWorkerAccess(
  context: WorkerServiceContext,
  payload: {
    workerId: string;
  },
): Promise<ServiceResult<void>> {
  const adminClientResult = getAdminClient(context);
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error };
  }
  const adminClient = adminClientResult.client;

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, worker_id")
    .eq("worker_id", payload.workerId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: "No se pudo validar acceso asociado al trabajador" };
  }

  if (!profile || profile.role !== "trabajador") {
    return { ok: false, error: "El trabajador no tiene acceso para activar" };
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(profile.id);
  if (authError || !authData.user) {
    return { ok: false, error: "No se encontro la cuenta de acceso del trabajador" };
  }

  if (!isUserSuspended(authData.user.banned_until)) {
    return { ok: false, error: "El acceso del trabajador ya esta activo" };
  }

  const { error: activateError } = await adminClient.auth.admin.updateUserById(profile.id, {
    ban_duration: "none",
  });

  if (activateError) {
    return { ok: false, error: "No se pudo activar el acceso del trabajador" };
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_access_activated",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    entityId: payload.workerId,
    metadata: {
      authUserId: profile.id,
    },
  });

  return { ok: true, data: undefined };
}

export async function toggleWorkerStatus(
  context: WorkerServiceContext,
  payload: {
    workerId: string;
  },
): Promise<ServiceResult<void>> {
  const { data: worker, error: workerError } = await context.supabase
    .from("workers")
    .select("id, status, is_active")
    .eq("id", payload.workerId)
    .maybeSingle();

  if (workerError || !worker) {
    return { ok: false, error: "Trabajador no encontrado" };
  }

  if (!worker.is_active) {
    return { ok: false, error: "No puedes cambiar estado de un trabajador archivado" };
  }

  const nextStatus = worker.status === "activo" ? "inactivo" : "activo";

  const { error, data: updatedWorker } = await context.supabase
    .from("workers")
    .update({
      status: nextStatus,
      updated_by: context.actorUserId,
    })
    .eq("id", payload.workerId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error || !updatedWorker) {
    return { ok: false, error: "No se pudo cambiar el estado" };
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_status_changed",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    entityId: payload.workerId,
    metadata: {
      nextStatus,
    },
  });

  return { ok: true, data: undefined };
}

export async function archiveWorker(
  context: WorkerServiceContext,
  payload: {
    workerId: string;
  },
): Promise<ServiceResult<void>> {
  const { data: worker, error: workerError } = await context.supabase
    .from("workers")
    .select("id, rut, first_name, last_name, is_active")
    .eq("id", payload.workerId)
    .maybeSingle();

  if (workerError) {
    return { ok: false, error: "No se pudo validar el trabajador" };
  }

  if (!worker) {
    return { ok: false, error: "El trabajador no existe" };
  }

  if (!worker.is_active) {
    return { ok: false, error: "El trabajador ya esta archivado" };
  }

  const { error: archiveError, data: archivedWorker } = await context.supabase
    .from("workers")
    .update({
      is_active: false,
      status: "inactivo",
      deleted_at: new Date().toISOString(),
      deleted_by: context.actorUserId,
      updated_by: context.actorUserId,
    })
    .eq("id", payload.workerId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (archiveError || !archivedWorker) {
    return { ok: false, error: "No se pudo archivar el trabajador" };
  }

  let suspendedAccess = false;
  const adminClientResult = getAdminClient(context);
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error };
  }

  const adminClient = adminClientResult.client;
  const { data: workerAccessProfile } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("worker_id", payload.workerId)
    .maybeSingle();

  if (workerAccessProfile?.role === "trabajador") {
    const { data: authData } = await adminClient.auth.admin.getUserById(workerAccessProfile.id);
    if (authData.user && !isUserSuspended(authData.user.banned_until)) {
      const { error: suspendError } = await adminClient.auth.admin.updateUserById(workerAccessProfile.id, {
        ban_duration: "876000h",
      });

      if (!suspendError) {
        suspendedAccess = true;
      }
    }
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_archived",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    entityId: payload.workerId,
    metadata: {
      rut: worker.rut,
      workerName: `${worker.first_name} ${worker.last_name}`.trim(),
      accessSuspended: suspendedAccess,
    },
  });

  return { ok: true, data: undefined };
}

export async function deleteWorkerPermanently(
  context: WorkerServiceContext,
  payload: {
    workerId: string;
  },
): Promise<ServiceResult<{ hadLinkedAccess: boolean; linkedAccessDeleted: boolean }>> {
  const { data: worker, error: workerError } = await context.supabase
    .from("workers")
    .select("id, rut, first_name, last_name, is_active")
    .eq("id", payload.workerId)
    .maybeSingle();

  if (workerError) {
    return { ok: false, error: "No se pudo validar el trabajador" };
  }

  if (!worker) {
    return { ok: false, error: "El trabajador no existe" };
  }

  if (worker.is_active) {
    return {
      ok: false,
      error: "Solo puedes eliminar definitivamente trabajadores archivados",
    };
  }

  const adminClientResult = getAdminClient(context);
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error };
  }
  const adminClient = adminClientResult.client;

  const { data: linkedProfile, error: linkedProfileError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("worker_id", payload.workerId)
    .maybeSingle();

  if (linkedProfileError) {
    return { ok: false, error: "No se pudo validar acceso asociado al trabajador" };
  }

  const hadLinkedAccess = linkedProfile?.role === "trabajador";

  const { data: deletedWorker, error: deleteWorkerError } = await adminClient
    .from("workers")
    .delete()
    .eq("id", payload.workerId)
    .eq("is_active", false)
    .select("id")
    .maybeSingle();

  if (deleteWorkerError || !deletedWorker) {
    return { ok: false, error: "No se pudo eliminar definitivamente el trabajador" };
  }

  let linkedAccessDeleted = !hadLinkedAccess;

  if (hadLinkedAccess && linkedProfile) {
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(linkedProfile.id, true);

    if (deleteUserError) {
      linkedAccessDeleted = false;
      console.error("worker linked access soft delete failed", {
        workerId: payload.workerId,
        authUserId: linkedProfile.id,
        error: deleteUserError,
      });
    } else {
      linkedAccessDeleted = true;
    }
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_deleted",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    entityId: payload.workerId,
    metadata: {
      rut: worker.rut,
      workerName: `${worker.first_name} ${worker.last_name}`.trim(),
      permanent: true,
      hadLinkedAccess,
      linkedAccessDeleted,
    },
  });

  return {
    ok: true,
    data: {
      hadLinkedAccess,
      linkedAccessDeleted,
    },
  };
}

export async function unarchiveWorker(
  context: WorkerServiceContext,
  payload: {
    workerId: string;
  },
): Promise<ServiceResult<void>> {
  const { data: worker, error: workerError } = await context.supabase
    .from("workers")
    .select("id, rut, first_name, last_name, is_active")
    .eq("id", payload.workerId)
    .maybeSingle();

  if (workerError) {
    return { ok: false, error: "No se pudo validar el trabajador" };
  }

  if (!worker) {
    return { ok: false, error: "El trabajador no existe" };
  }

  if (worker.is_active) {
    return { ok: false, error: "El trabajador ya esta activo" };
  }

  const { error: restoreError, data: restoredWorker } = await context.supabase
    .from("workers")
    .update({
      is_active: true,
      deleted_at: null,
      deleted_by: null,
      status: "inactivo",
      updated_by: context.actorUserId,
    })
    .eq("id", payload.workerId)
    .eq("is_active", false)
    .select("id")
    .maybeSingle();

  if (restoreError || !restoredWorker) {
    return { ok: false, error: "No se pudo desarchivar el trabajador" };
  }

  await logAuditEvent({
    supabase: context.supabase,
    action: "worker_unarchived",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "worker",
    entityId: payload.workerId,
    metadata: {
      rut: worker.rut,
      workerName: `${worker.first_name} ${worker.last_name}`.trim(),
      restoredStatus: "inactivo",
    },
  });

  return { ok: true, data: undefined };
}
