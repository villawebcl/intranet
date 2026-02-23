"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  createUserAdminSchema,
  deleteUserAdminSchema,
  resetUserPasswordAdminSchema,
  updateUserAdminSchema,
} from "@/lib/validators/users";
import { type AppRole } from "@/lib/constants/domain";

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

function withMessage(path: string, params: Record<string, string>) {
  const url = new URL(path, "http://localhost");

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const search = url.searchParams.toString();
  return search ? `${url.pathname}?${search}` : url.pathname;
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
    entity_type: "auth",
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("audit log insert failed", error);
  }
}

function ensureAdminOrRedirect(role: AppRole | null, returnPath = USERS_BASE_PATH) {
  if (role !== "admin") {
    redirect(withMessage(returnPath, { error: "No tienes permisos para gestionar usuarios" }));
  }
}

export async function createUserAdminAction(formData: FormData) {
  const context = await getAdminContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }
  ensureAdminOrRedirect(context.role);

  const parsed = createUserAdminSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(
      withMessage(USERS_BASE_PATH, {
        error: parsed.error.issues[0]?.message ?? "Datos invalidos para crear usuario",
      }),
    );
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    redirect(
      withMessage(USERS_BASE_PATH, {
        error: "Falta configuracion de servicio para gestionar usuarios",
      }),
    );
  }

  const payload = parsed.data;
  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
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
    redirect(withMessage(USERS_BASE_PATH, { error: message }));
  }

  const { error: profileError } = await context.supabase.from("profiles").upsert(
    {
      id: createdUser.user.id,
      role: payload.role,
      full_name: payload.fullName ?? null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    redirect(
      withMessage(USERS_BASE_PATH, {
        error: "Usuario creado en Auth, pero no se pudo registrar perfil/rol",
      }),
    );
  }

  await insertAuditLog({
    action: "user_created",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: createdUser.user.id,
    metadata: {
      email: payload.email,
      role: payload.role,
    },
  });

  redirect(withMessage(USERS_BASE_PATH, { success: "Usuario creado correctamente" }));
}

export async function updateUserAdminAction(formData: FormData) {
  const parsed = updateUserAdminSchema.safeParse({
    userId: formData.get("userId"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    returnTo: formData.get("returnTo"),
  });

  const returnPath = getSafePath(parsed.data?.returnTo, USERS_BASE_PATH);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida para actualizar usuario" }));
  }

  const context = await getAdminContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }
  ensureAdminOrRedirect(context.role, returnPath);

  if (parsed.data.userId === context.user.id && parsed.data.role !== "admin") {
    redirect(withMessage(returnPath, { error: "No puedes quitarte el rol admin desde esta pantalla" }));
  }

  const { error: profileError } = await context.supabase.from("profiles").upsert(
    {
      id: parsed.data.userId,
      role: parsed.data.role,
      full_name: parsed.data.fullName ?? null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    redirect(withMessage(returnPath, { error: "No se pudo actualizar el perfil del usuario" }));
  }

  try {
    const adminClient = createSupabaseAdminClient();
    await adminClient.auth.admin.updateUserById(parsed.data.userId, {
      user_metadata: {
        full_name: parsed.data.fullName ?? null,
      },
    });
  } catch (error) {
    console.error("admin auth metadata update failed", error);
  }

  await insertAuditLog({
    action: "user_updated",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: parsed.data.userId,
    metadata: {
      role: parsed.data.role,
      fullName: parsed.data.fullName ?? null,
    },
  });

  redirect(withMessage(returnPath, { success: "Usuario actualizado" }));
}

export async function resetUserPasswordAdminAction(formData: FormData) {
  const parsed = resetUserPasswordAdminSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
    returnTo: formData.get("returnTo"),
  });

  const returnPath = getSafePath(parsed.data?.returnTo, USERS_BASE_PATH);

  if (!parsed.success) {
    redirect(
      withMessage(returnPath, {
        error: parsed.error.issues[0]?.message ?? "Solicitud invalida para reset de contrasena",
      }),
    );
  }

  const context = await getAdminContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }
  ensureAdminOrRedirect(context.role, returnPath);

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    redirect(
      withMessage(returnPath, {
        error: "Falta configuracion de servicio para resetear contrasenas",
      }),
    );
  }

  const { error } = await adminClient.auth.admin.updateUserById(parsed.data.userId, {
    password: parsed.data.password,
  });

  if (error) {
    redirect(withMessage(returnPath, { error: "No se pudo resetear la contrasena del usuario" }));
  }

  await insertAuditLog({
    action: "user_password_reset",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: parsed.data.userId,
  });

  redirect(withMessage(returnPath, { success: "Contrasena actualizada" }));
}

export async function deleteUserAdminAction(formData: FormData) {
  const parsed = deleteUserAdminSchema.safeParse({
    userId: formData.get("userId"),
    confirmDelete: formData.get("confirmDelete"),
    returnTo: formData.get("returnTo"),
  });

  const returnPath = getSafePath(parsed.data?.returnTo, USERS_BASE_PATH);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Debes confirmar la eliminacion del usuario" }));
  }

  const context = await getAdminContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }
  ensureAdminOrRedirect(context.role, returnPath);

  if (parsed.data.userId === context.user.id) {
    redirect(withMessage(returnPath, { error: "No puedes eliminar tu propia cuenta admin" }));
  }

  const { data: targetProfile, error: profileError } = await context.supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  if (profileError) {
    redirect(withMessage(returnPath, { error: "No se pudo validar el usuario a eliminar" }));
  }

  if (targetProfile?.role === "admin") {
    redirect(withMessage(returnPath, { error: "Las cuentas admin estan protegidas y no se pueden eliminar" }));
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    redirect(
      withMessage(returnPath, {
        error: "Falta configuracion de servicio para eliminar usuarios",
      }),
    );
  }

  const { data: authUserResult } = await adminClient.auth.admin.getUserById(parsed.data.userId);
  const targetEmail = authUserResult?.user?.email ?? null;

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(parsed.data.userId);

  if (deleteError) {
    redirect(withMessage(returnPath, { error: "No se pudo eliminar el usuario" }));
  }

  await insertAuditLog({
    action: "user_deleted",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: parsed.data.userId,
    metadata: {
      email: targetEmail,
      role: targetProfile?.role ?? "visitante",
      fullName: targetProfile?.full_name ?? null,
    },
  });

  redirect(withMessage(returnPath, { success: "Usuario eliminado" }));
}
