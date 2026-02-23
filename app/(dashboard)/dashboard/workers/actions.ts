"use server";

import { redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { deleteWorkerSchema, toggleWorkerStatusSchema, workerFormSchema } from "@/lib/validators/workers";

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

async function insertAuditLog(params: {
  action: string;
  actorUserId: string;
  actorRole: AppRole;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: params.actorUserId,
    actor_role: params.actorRole,
    action: params.action,
    entity_type: "worker",
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("audit log insert failed", error);
  }
}

export async function createWorkerAction(formData: FormData) {
  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canManageWorkers(context.role)) {
    redirect(withMessage(WORKERS_BASE_PATH, { error: "No tienes permisos para crear trabajadores" }));
  }

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

  const payload = parsed.data;
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
      created_by: context.user.id,
      updated_by: context.user.id,
    })
    .select("id")
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? "Ya existe un trabajador con ese RUT"
        : "No se pudo crear el trabajador";
    redirect(withMessage(`${WORKERS_BASE_PATH}/new`, { error: message }));
  }

  await insertAuditLog({
    action: "worker_created",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: worker.id,
    metadata: {
      rut: payload.rut,
    },
  });

  redirect(withMessage(WORKERS_BASE_PATH, { success: "Trabajador creado correctamente" }));
}

export async function updateWorkerAction(workerId: string, formData: FormData) {
  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canManageWorkers(context.role)) {
    redirect(withMessage(WORKERS_BASE_PATH, { error: "No tienes permisos para editar trabajadores" }));
  }

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

  const payload = parsed.data;
  const { error } = await context.supabase
    .from("workers")
    .update({
      rut: payload.rut,
      first_name: payload.firstName,
      last_name: payload.lastName,
      position: payload.position ?? null,
      area: payload.area ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      updated_by: context.user.id,
    })
    .eq("id", workerId);

  if (error) {
    const message =
      error.code === "23505"
        ? "Ya existe un trabajador con ese RUT"
        : "No se pudo actualizar el trabajador";
    redirect(withMessage(`${WORKERS_BASE_PATH}/${workerId}`, { error: message }));
  }

  await insertAuditLog({
    action: "worker_updated",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: workerId,
  });

  redirect(withMessage(`${WORKERS_BASE_PATH}/${workerId}`, { success: "Datos actualizados" }));
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

  const nextStatus = parsed.data.currentStatus === "activo" ? "inactivo" : "activo";

  const { error } = await context.supabase
    .from("workers")
    .update({
      status: nextStatus,
      updated_by: context.user.id,
    })
    .eq("id", parsed.data.workerId);

  if (error) {
    redirect(withMessage(returnPath, { error: "No se pudo cambiar el estado" }));
  }

  await insertAuditLog({
    action: "worker_status_changed",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: parsed.data.workerId,
    metadata: {
      nextStatus,
    },
  });

  redirect(withMessage(returnPath, { success: "Estado actualizado" }));
}

export async function deleteWorkerAction(formData: FormData) {
  const parsed = deleteWorkerSchema.safeParse({
    workerId: formData.get("workerId"),
    confirmDelete: formData.get("confirmDelete"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Debes confirmar la eliminacion del trabajador" }));
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (context.role !== "admin") {
    redirect(withMessage(returnPath, { error: "Solo admin puede eliminar trabajadores" }));
  }

  const { data: worker, error: workerError } = await context.supabase
    .from("workers")
    .select("id, rut, first_name, last_name")
    .eq("id", parsed.data.workerId)
    .maybeSingle();

  if (workerError) {
    redirect(withMessage(returnPath, { error: "No se pudo validar el trabajador" }));
  }

  if (!worker) {
    redirect(withMessage(returnPath, { error: "El trabajador no existe o ya fue eliminado" }));
  }

  const { error: deleteError } = await context.supabase
    .from("workers")
    .delete()
    .eq("id", parsed.data.workerId);

  if (deleteError) {
    const message =
      deleteError.code === "23503"
        ? "No se puede eliminar: el trabajador tiene documentos u otros registros asociados"
        : "No se pudo eliminar el trabajador";
    redirect(withMessage(returnPath, { error: message }));
  }

  await insertAuditLog({
    action: "worker_deleted",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: parsed.data.workerId,
    metadata: {
      rut: worker.rut,
      workerName: `${worker.first_name} ${worker.last_name}`.trim(),
    },
  });

  redirect(withMessage(returnPath, { success: "Trabajador eliminado" }));
}
