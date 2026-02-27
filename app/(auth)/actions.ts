"use server";

import { redirect } from "next/navigation";

import { type AppRole } from "@/lib/constants/domain";
import { insertAuditLog } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

function withLoginError(nextPath: string, errorCode: string) {
  const url = new URL("/login", "http://localhost");
  url.searchParams.set("next", nextPath);
  url.searchParams.set("error", errorCode);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export async function loginWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = getSafeNextPath(String(formData.get("nextPath") ?? ""));

  if (!email || !password) {
    redirect(withLoginError(nextPath, "invalid_credentials"));
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    redirect(withLoginError(nextPath, "invalid_credentials"));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const actorRole: AppRole = profile?.role ?? "visitante";

  await insertAuditLog({
    supabase,
    actorUserId: user.id,
    actorRole,
    action: "auth_login",
    entityType: "auth",
    metadata: {
      method: "password",
    },
  });

  redirect(nextPath);
}
