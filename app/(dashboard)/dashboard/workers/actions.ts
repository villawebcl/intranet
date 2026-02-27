"use server";

import { redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  activateWorkerAccessSchema,
  createMissingWorkerAccessesSchema,
  createWorkerAccessSchema,
  deactivateWorkerSchema,
  reactivateWorkerSchema,
  suspendWorkerAccessSchema,
  toggleWorkerStatusSchema,
  workerFormSchema,
} from "@/lib/validators/workers";
import {
  activateWorkerAccess,
  archiveWorker,
  createMissingWorkerAccesses,
  createWorkerAccess,
  createWorkerRecord,
  suspendWorkerAccess,
  toggleWorkerStatus,
  unarchiveWorker,
  updateWorkerRecord,
} from "@/lib/services/workers.service";

const WORKERS_BASE_PATH = "/dashboard/workers";

function getSafePath(path: string | undefined, fallback: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  if (!path.startsWith(WORKERS_BASE_PATH)) {
    return fallback;
  }

  return path;
}

function withMessage(path: string, params: Record<string, string>) {
  const url = new URL(path, "http://localhost");

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const search = url.searchParams.toString();
  return search ? `${url.pathname}?${search}` : url.pathname;
}

async function getRoleContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, role: null as AppRole | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, role: profile?.role ?? "visitante" };
}

export async function createWorkerAction(formData: FormData) {
  const parsed = workerFormSchema.safeParse({
    rut: formData.get("rut"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    position: formData.get("position"),
    area: formData.get("area"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    redirect(
      withMessage(`${WORKERS_BASE_PATH}/new`, {
        error: parsed.error.issues[0]?.message ?? "Datos invalidos",
      }),
    );
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canManageWorkers(context.role)) {
    redirect(withMessage(WORKERS_BASE_PATH, { error: "No tienes permisos para crear trabajadores" }));
  }

  const result = await createWorkerRecord(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    parsed.data,
  );

  if (!result.ok) {
    redirect(withMessage(`${WORKERS_BASE_PATH}/new`, { error: result.error }));
  }

  redirect(withMessage(WORKERS_BASE_PATH, { success: "Trabajador creado correctamente" }));
}

export async function updateWorkerAction(workerId: string, formData: FormData) {
  const parsed = workerFormSchema.safeParse({
    rut: formData.get("rut"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    position: formData.get("position"),
    area: formData.get("area"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    redirect(
      withMessage(`${WORKERS_BASE_PATH}/${workerId}`, {
        error: parsed.error.issues[0]?.message ?? "Datos invalidos",
      }),
    );
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canManageWorkers(context.role)) {
    redirect(withMessage(WORKERS_BASE_PATH, { error: "No tienes permisos para editar trabajadores" }));
  }

  const result = await updateWorkerRecord(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId,
      data: parsed.data,
    },
  );

  if (!result.ok) {
    redirect(withMessage(`${WORKERS_BASE_PATH}/${workerId}`, { error: result.error }));
  }

  redirect(withMessage(`${WORKERS_BASE_PATH}/${workerId}`, { success: "Datos actualizados" }));
}

export async function createWorkerAccessAction(formData: FormData) {
  const parsed = createWorkerAccessSchema.safeParse({
    workerId: formData.get("workerId"),
    temporaryPassword: formData.get("temporaryPassword"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(
      withMessage(returnPath, {
        error: parsed.error.issues[0]?.message ?? "Solicitud invalida para crear acceso",
      }),
    );
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canManageWorkers(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para crear accesos de trabajadores" }));
  }

  const result = await createWorkerAccess(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
      temporaryPassword: parsed.data.temporaryPassword,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(withMessage(returnPath, { success: "Acceso trabajador creado correctamente" }));
}

export async function createMissingWorkerAccessesAction(formData: FormData) {
  const parsed = createMissingWorkerAccessesSchema.safeParse({
    confirmCreate: formData.get("confirmCreate"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Debes confirmar la creacion masiva de accesos" }));
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canManageWorkers(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para crear accesos de trabajadores" }));
  }

  const result = await createMissingWorkerAccesses({
    supabase: context.supabase,
    actorUserId: context.user.id,
    actorRole: context.role,
  });

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  if (result.data.createdCount === 0) {
    redirect(
      withMessage(returnPath, {
        error: `No se crearon accesos. Omitidos: ${result.data.skippedCount}. Errores: ${result.data.errorCount}.`,
      }),
    );
  }

  redirect(
    withMessage(returnPath, {
      success: `Invitaciones enviadas: ${result.data.createdCount}. Omitidos: ${result.data.skippedCount}. Errores: ${result.data.errorCount}.`,
    }),
  );
}

export async function suspendWorkerAccessAction(formData: FormData) {
  const parsed = suspendWorkerAccessSchema.safeParse({
    workerId: formData.get("workerId"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida para suspender acceso" }));
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canManageWorkers(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para suspender accesos" }));
  }

  const result = await suspendWorkerAccess(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(withMessage(returnPath, { success: "Acceso trabajador suspendido" }));
}

export async function activateWorkerAccessAction(formData: FormData) {
  const parsed = activateWorkerAccessSchema.safeParse({
    workerId: formData.get("workerId"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida para activar acceso" }));
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canManageWorkers(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para activar accesos" }));
  }

  const result = await activateWorkerAccess(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(withMessage(returnPath, { success: "Acceso trabajador activado" }));
}

export async function toggleWorkerStatusAction(formData: FormData) {
  const parsed = toggleWorkerStatusSchema.safeParse({
    workerId: formData.get("workerId"),
    currentStatus: formData.get("currentStatus"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida" }));
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canManageWorkers(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para cambiar estado" }));
  }

  const result = await toggleWorkerStatus(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(withMessage(returnPath, { success: "Estado actualizado" }));
}

export async function deactivateWorkerAction(formData: FormData) {
  const parsed = deactivateWorkerSchema.safeParse({
    workerId: formData.get("workerId"),
    confirmArchive: formData.get("confirmArchive"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Debes confirmar el archivado del trabajador" }));
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (context.role !== "admin") {
    redirect(withMessage(returnPath, { error: "Solo admin puede archivar trabajadores" }));
  }

  const result = await archiveWorker(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(withMessage(returnPath, { success: "Trabajador archivado" }));
}

export async function reactivateWorkerAction(formData: FormData) {
  const parsed = reactivateWorkerSchema.safeParse({
    workerId: formData.get("workerId"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = `${WORKERS_BASE_PATH}?archive=archived`;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida para desarchivar trabajador" }));
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (context.role !== "admin") {
    redirect(withMessage(returnPath, { error: "Solo admin puede desarchivar trabajadores" }));
  }

  const result = await unarchiveWorker(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(withMessage(returnPath, { success: "Trabajador desarchivado en estado inactivo" }));
}
