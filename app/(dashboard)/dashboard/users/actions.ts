"use server";

import { redirect } from "next/navigation";

import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { setFlash } from "@/lib/flash";
import {
  createUserAdminSchema,
  deleteUserAdminSchema,
  resetUserPasswordAdminSchema,
  updateUserAdminSchema,
} from "@/lib/validators/users";
import {
  createCoreUser,
  deleteCoreUser,
  resetCoreUserPassword,
  updateCoreUserProfile,
} from "@/lib/services/users.service";

const USERS_BASE_PATH = "/dashboard/users";
const ACCESS_BASE_PATH = "/dashboard/access";

function getSafePath(path: string | undefined, fallback: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  if (!path.startsWith(USERS_BASE_PATH) && !path.startsWith(ACCESS_BASE_PATH)) {
    return fallback;
  }

  return path;
}

async function getAdminContext() {
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

async function ensureAdminOrRedirect(role: AppRole | null, returnPath = USERS_BASE_PATH) {
  if (role !== "admin") {
    await setFlash({ error: "No tienes permisos para gestionar usuarios" });
    redirect(returnPath);
  }
}

async function ensureCoreRoleOrRedirect(role: AppRole, returnPath = USERS_BASE_PATH) {
  if (role === "trabajador") {
    await setFlash({ error: "El rol trabajador se administra en la pestaña Trabajadores" });
    redirect(returnPath);
  }
}

function getAdminClientOrThrow() {
  return createSupabaseAdminClient();
}

export async function createUserAdminAction(formData: FormData) {
  const parsed = createUserAdminSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    workerId: formData.get("workerId"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    await setFlash({ error: parsed.error.issues[0]?.message ?? "Datos invalidos para crear usuario" });
    redirect(USERS_BASE_PATH);
  }

  const context = await getAdminContext();
  if (!context.user) {
    redirect("/login");
  }

  await ensureAdminOrRedirect(context.role);
  await ensureCoreRoleOrRedirect(parsed.data.role, USERS_BASE_PATH);

  let adminClient;
  try {
    adminClient = getAdminClientOrThrow();
  } catch {
    await setFlash({ error: "Falta configuracion de servicio para gestionar usuarios" });
    redirect(USERS_BASE_PATH);
  }

  const result = await createCoreUser(
    {
      supabase: context.supabase,
      adminClient,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      password: parsed.data.password,
    },
  );

  if (!result.ok) {
    await setFlash({ error: result.error });
    redirect(USERS_BASE_PATH);
  }

  await setFlash({ success: "Usuario creado correctamente" });
  redirect(USERS_BASE_PATH);
}

export async function updateUserAdminAction(formData: FormData) {
  const parsed = updateUserAdminSchema.safeParse({
    userId: formData.get("userId"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    workerId: formData.get("workerId"),
    returnTo: formData.get("returnTo"),
  });

  const returnPath = getSafePath(parsed.data?.returnTo, USERS_BASE_PATH);

  if (!parsed.success) {
    await setFlash({ error: parsed.error.issues[0]?.message ?? "Solicitud invalida para actualizar usuario" });
    redirect(returnPath);
  }

  const context = await getAdminContext();
  if (!context.user) {
    redirect("/login");
  }

  await ensureAdminOrRedirect(context.role, returnPath);

  if (parsed.data.userId === context.user.id && parsed.data.role !== "admin") {
    await setFlash({ error: "No puedes quitarte el rol admin desde esta pantalla" });
    redirect(returnPath);
  }

  await ensureCoreRoleOrRedirect(parsed.data.role, returnPath);

  let adminClient;
  try {
    adminClient = getAdminClientOrThrow();
  } catch {
    await setFlash({ error: "Falta configuracion de servicio para gestionar usuarios" });
    redirect(returnPath);
  }

  const result = await updateCoreUserProfile(
    {
      supabase: context.supabase,
      adminClient,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      userId: parsed.data.userId,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
    },
  );

  if (!result.ok) {
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Usuario actualizado" });
  redirect(returnPath);
}

export async function resetUserPasswordAdminAction(formData: FormData) {
  const parsed = resetUserPasswordAdminSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
    returnTo: formData.get("returnTo"),
  });

  const returnPath = getSafePath(parsed.data?.returnTo, USERS_BASE_PATH);

  if (!parsed.success) {
    await setFlash({ error: parsed.error.issues[0]?.message ?? "Solicitud invalida para reset de contrasena" });
    redirect(returnPath);
  }

  const context = await getAdminContext();
  if (!context.user) {
    redirect("/login");
  }

  await ensureAdminOrRedirect(context.role, returnPath);

  let adminClient;
  try {
    adminClient = getAdminClientOrThrow();
  } catch {
    await setFlash({ error: "Falta configuracion de servicio para resetear contrasenas" });
    redirect(returnPath);
  }

  const result = await resetCoreUserPassword(
    {
      supabase: context.supabase,
      adminClient,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      userId: parsed.data.userId,
      password: parsed.data.password,
    },
  );

  if (!result.ok) {
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Contrasena actualizada" });
  redirect(returnPath);
}

export async function deleteUserAdminAction(formData: FormData) {
  const parsed = deleteUserAdminSchema.safeParse({
    userId: formData.get("userId"),
    confirmDelete: formData.get("confirmDelete"),
    returnTo: formData.get("returnTo"),
  });

  const returnPath = getSafePath(parsed.data?.returnTo, USERS_BASE_PATH);

  if (!parsed.success) {
    await setFlash({ error: "Debes confirmar la eliminacion del usuario" });
    redirect(returnPath);
  }

  const context = await getAdminContext();
  if (!context.user) {
    redirect("/login");
  }

  await ensureAdminOrRedirect(context.role, returnPath);

  if (parsed.data.userId === context.user.id) {
    await setFlash({ error: "No puedes eliminar tu propia cuenta admin" });
    redirect(returnPath);
  }

  let adminClient;
  try {
    adminClient = getAdminClientOrThrow();
  } catch {
    await setFlash({ error: "Falta configuracion de servicio para eliminar usuarios" });
    redirect(returnPath);
  }

  const result = await deleteCoreUser(
    {
      supabase: context.supabase,
      adminClient,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      targetUserId: parsed.data.userId,
      protectAdminAccounts: true,
    },
  );

  if (!result.ok) {
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Usuario eliminado" });
  redirect(returnPath);
}
