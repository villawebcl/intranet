"use server";

import { redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { setFlash } from "@/lib/flash";
import {
  activateWorkerAccessSchema,
  createMissingWorkerAccessesSchema,
  createWorkerAccessSchema,
  deactivateWorkerSchema,
  deleteWorkerSchema,
  reactivateWorkerSchema,
  suspendWorkerAccessSchema,
  toggleWorkerStatusSchema,
  workerFormSchema,
} from "@/lib/validators/workers";
import { getRoleContext, getSafePath, WORKERS_BASE_PATH } from "./_shared/action-utils";
import {
  activateWorkerAccess,
  archiveWorker,
  createMissingWorkerAccesses,
  createWorkerAccess,
  createWorkerRecord,
  deleteWorkerPermanently,
  suspendWorkerAccess,
  toggleWorkerStatus,
  unarchiveWorker,
  updateWorkerRecord,
} from "@/lib/services/workers.service";


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
  const createAccessNow = formData.get("createAccessNow") === "yes";
  const temporaryPasswordInput =
    typeof formData.get("temporaryPassword") === "string"
      ? (formData.get("temporaryPassword") as string)
      : "";

  if (!parsed.success) {
    await setFlash({ error: parsed.error.issues[0]?.message ?? "Datos invalidos" });
    redirect(`${WORKERS_BASE_PATH}/new`);
  }

  if (createAccessNow && !parsed.data.email) {
    await setFlash({ error: "Debes ingresar correo para crear acceso a intranet" });
    redirect(`${WORKERS_BASE_PATH}/new`);
  }

  if (createAccessNow) {
    const passwordValidation = createWorkerAccessSchema.shape.temporaryPassword.safeParse(
      temporaryPasswordInput,
    );
    if (!passwordValidation.success) {
      await setFlash({
        error: passwordValidation.error.issues[0]?.message ?? "Contrasena temporal invalida",
      });
      redirect(`${WORKERS_BASE_PATH}/new`);
    }
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!canManageWorkers(context.role)) {
    await setFlash({ error: "No tienes permisos para crear trabajadores" });
    redirect(WORKERS_BASE_PATH);
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
    await setFlash({ error: result.error });
    redirect(`${WORKERS_BASE_PATH}/new`);
  }

  const workerDetailPath = `${WORKERS_BASE_PATH}/${result.data.workerId}`;

  if (createAccessNow) {
    const accessResult = await createWorkerAccess(
      {
        supabase: context.supabase,
        actorUserId: context.user.id,
        actorRole: context.role,
      },
      {
        workerId: result.data.workerId,
        temporaryPassword: temporaryPasswordInput,
      },
    );

    if (!accessResult.ok) {
      await setFlash({
        error: `Trabajador creado, pero no se pudo crear acceso: ${accessResult.error}`,
      });
      redirect(workerDetailPath);
    }

    await setFlash({ success: "Trabajador y acceso creados correctamente" });
    redirect(workerDetailPath);
  }

  await setFlash({ success: "Trabajador creado correctamente" });
  redirect(workerDetailPath);
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
    await setFlash({ error: parsed.error.issues[0]?.message ?? "Datos invalidos" });
    redirect(`${WORKERS_BASE_PATH}/${workerId}`);
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!canManageWorkers(context.role)) {
    await setFlash({ error: "No tienes permisos para editar trabajadores" });
    redirect(WORKERS_BASE_PATH);
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
    await setFlash({ error: result.error });
    redirect(`${WORKERS_BASE_PATH}/${workerId}`);
  }

  await setFlash({ success: "Datos actualizados" });
  redirect(`${WORKERS_BASE_PATH}/${workerId}`);
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
    await setFlash({ error: parsed.error.issues[0]?.message ?? "Solicitud invalida para crear acceso" });
    redirect(returnPath);
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!canManageWorkers(context.role)) {
    await setFlash({ error: "No tienes permisos para crear accesos de trabajadores" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Acceso trabajador creado correctamente" });
  redirect(returnPath);
}

export async function createMissingWorkerAccessesAction(formData: FormData) {
  const parsed = createMissingWorkerAccessesSchema.safeParse({
    confirmCreate: formData.get("confirmCreate"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    await setFlash({ error: "Debes confirmar la creacion masiva de accesos" });
    redirect(returnPath);
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!canManageWorkers(context.role)) {
    await setFlash({ error: "No tienes permisos para crear accesos de trabajadores" });
    redirect(returnPath);
  }

  const result = await createMissingWorkerAccesses({
    supabase: context.supabase,
    actorUserId: context.user.id,
    actorRole: context.role,
  });

  if (!result.ok) {
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  if (result.data.createdCount === 0) {
    await setFlash({
      error: `No se crearon accesos. Omitidos: ${result.data.skippedCount}. Errores: ${result.data.errorCount}.`,
    });
    redirect(returnPath);
  }

  await setFlash({
    success: `Invitaciones enviadas: ${result.data.createdCount}. Omitidos: ${result.data.skippedCount}. Errores: ${result.data.errorCount}.`,
  });
  redirect(returnPath);
}

export async function suspendWorkerAccessAction(formData: FormData) {
  const parsed = suspendWorkerAccessSchema.safeParse({
    workerId: formData.get("workerId"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    await setFlash({ error: "Solicitud invalida para suspender acceso" });
    redirect(returnPath);
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!canManageWorkers(context.role)) {
    await setFlash({ error: "No tienes permisos para suspender accesos" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Acceso trabajador suspendido" });
  redirect(returnPath);
}

export async function activateWorkerAccessAction(formData: FormData) {
  const parsed = activateWorkerAccessSchema.safeParse({
    workerId: formData.get("workerId"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    await setFlash({ error: "Solicitud invalida para activar acceso" });
    redirect(returnPath);
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!canManageWorkers(context.role)) {
    await setFlash({ error: "No tienes permisos para activar accesos" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Acceso trabajador activado" });
  redirect(returnPath);
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
    await setFlash({ error: "Solicitud invalida" });
    redirect(returnPath);
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!canManageWorkers(context.role)) {
    await setFlash({ error: "No tienes permisos para cambiar estado" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Estado actualizado" });
  redirect(returnPath);
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
    await setFlash({ error: "Debes confirmar el archivado del trabajador" });
    redirect(returnPath);
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (context.role !== "admin") {
    await setFlash({ error: "Solo admin puede archivar trabajadores" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Trabajador archivado" });
  redirect(returnPath);
}

export async function reactivateWorkerAction(formData: FormData) {
  const parsed = reactivateWorkerSchema.safeParse({
    workerId: formData.get("workerId"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = `${WORKERS_BASE_PATH}?archive=archived`;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    await setFlash({ error: "Solicitud invalida para desarchivar trabajador" });
    redirect(returnPath);
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (context.role !== "admin") {
    await setFlash({ error: "Solo admin puede desarchivar trabajadores" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Trabajador desarchivado en estado inactivo" });
  redirect(returnPath);
}

export async function deleteWorkerAction(formData: FormData) {
  const parsed = deleteWorkerSchema.safeParse({
    workerId: formData.get("workerId"),
    confirmDelete: formData.get("confirmDelete"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = `${WORKERS_BASE_PATH}?archive=archived`;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    await setFlash({ error: "Debes confirmar la eliminacion definitiva del trabajador" });
    redirect(returnPath);
  }

  const context = await getRoleContext();

  if (!context.user) {
    redirect("/login");
  }

  if (context.role !== "admin") {
    await setFlash({ error: "Solo admin puede eliminar trabajadores" });
    redirect(returnPath);
  }

  const result = await deleteWorkerPermanently(
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  if (result.data.hadLinkedAccess && !result.data.linkedAccessDeleted) {
    await setFlash({
      success: "Trabajador eliminado. No se pudo eliminar su acceso asociado; revisa Usuarios nucleo.",
    });
    redirect(returnPath);
  }

  await setFlash({ success: "Trabajador eliminado definitivamente" });
  redirect(returnPath);
}
