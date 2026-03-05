"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { type AppRole } from "@/lib/constants/domain";
import { insertAuditLog } from "@/lib/audit/log";
import { checkRateLimit, clearRateLimit } from "@/lib/auth/rate-limiter";
import { logServerEvent } from "@/lib/observability/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const IP_LIMIT = 5;
const IP_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_LIMIT = 10;
const EMAIL_WINDOW_MS = 15 * 60 * 1000;

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

  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip =
    (forwardedFor ? forwardedFor.split(",")[0]?.trim() : null) ??
    headersList.get("x-real-ip") ??
    "unknown";

  const ipKey = `ip:${ip}`;
  const emailKey = `em:${email.toLowerCase()}`;

  const supabase = await createSupabaseServerClient();

  const ipCheck = await checkRateLimit(supabase, ipKey, IP_LIMIT, IP_WINDOW_MS);
  if (!ipCheck.ok) {
    await logServerEvent("warn", "auth_login_rate_limited", {
      scope: "ip",
      retryAfterSeconds: ipCheck.retryAfterSeconds,
    });
    redirect(withLoginError(nextPath, "rate_limited"));
  }

  const emailCheck = await checkRateLimit(supabase, emailKey, EMAIL_LIMIT, EMAIL_WINDOW_MS);
  if (!emailCheck.ok) {
    await logServerEvent("warn", "auth_login_rate_limited", {
      scope: "email",
      retryAfterSeconds: emailCheck.retryAfterSeconds,
    });
    redirect(withLoginError(nextPath, "rate_limited"));
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    await logServerEvent("warn", "auth_login_failed", {
      reason: "invalid_credentials",
    });
    redirect(withLoginError(nextPath, "invalid_credentials"));
  }

  await clearRateLimit(supabase, ipKey);
  await clearRateLimit(supabase, emailKey);

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

  await logServerEvent("info", "auth_login_success", {
    actorUserId: user.id,
    actorRole,
  });

  redirect(nextPath);
}
