"use server";

import { redirect } from "next/navigation";

import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
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

function ensureAdminOrRedirect(role: AppRole | null, returnPath = USERS_BASE_PATH) {
  if (role !== "admin") {
    redirect(withMessage(returnPath, { error: "No tienes permisos para gestionar usuarios" }));
  }
}

function ensureCoreRoleOrRedirect(role: AppRole, returnPath = USERS_BASE_PATH) {
  if (role === "trabajador") {
    redirect(
      withMessage(returnPath, {
        error: "El rol trabajador se administra en la pestaña Trabajadores",
      }),
    );
  }
}

function getAdminClientOrRedirect(returnPath: string, errorMessage: string) {
  try {
    return createSupabaseAdminClient();
  } catch {
    redirect(
      withMessage(returnPath, {
        error: errorMessage,
      }),
    );
  }
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
    redirect(
      withMessage(USERS_BASE_PATH, {
        error: parsed.error.issues[0]?.message ?? "Datos invalidos para crear usuario",
      }),
    );
  }

  const context = await getAdminContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  ensureAdminOrRedirect(context.role);
  ensureCoreRoleOrRedirect(parsed.data.role, USERS_BASE_PATH);

  const result = await createCoreUser(
    {
      supabase: context.supabase,
      adminClient: getAdminClientOrRedirect(
        USERS_BASE_PATH,
        "Falta configuracion de servicio para gestionar usuarios",
      ),
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
    redirect(withMessage(USERS_BASE_PATH, { error: result.error }));
  }

  redirect(withMessage(USERS_BASE_PATH, { success: "Usuario creado correctamente" }));
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
    redirect(
      withMessage(returnPath, {
        error: parsed.error.issues[0]?.message ?? "Solicitud invalida para actualizar usuario",
      }),
    );
  }

  const context = await getAdminContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  ensureAdminOrRedirect(context.role, returnPath);

  if (parsed.data.userId === context.user.id && parsed.data.role !== "admin") {
    redirect(withMessage(returnPath, { error: "No puedes quitarte el rol admin desde esta pantalla" }));
  }

  ensureCoreRoleOrRedirect(parsed.data.role, returnPath);

  const result = await updateCoreUserProfile(
    {
      supabase: context.supabase,
      adminClient: getAdminClientOrRedirect(
        returnPath,
        "Falta configuracion de servicio para gestionar usuarios",
      ),
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
    redirect(withMessage(returnPath, { error: result.error }));
  }

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

  const result = await resetCoreUserPassword(
    {
      supabase: context.supabase,
      adminClient: getAdminClientOrRedirect(
        returnPath,
        "Falta configuracion de servicio para resetear contrasenas",
      ),
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      userId: parsed.data.userId,
      password: parsed.data.password,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

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

  const result = await deleteCoreUser(
    {
      supabase: context.supabase,
      adminClient: getAdminClientOrRedirect(
        returnPath,
        "Falta configuracion de servicio para eliminar usuarios",
      ),
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      targetUserId: parsed.data.userId,
      protectAdminAccounts: true,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(withMessage(returnPath, { success: "Usuario eliminado" }));
}
