"use server";

import { redirect } from "next/navigation";

import { type AppRole } from "@/lib/constants/domain";
import { insertAuditLog } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

async function signOutWithAudit(reason: "manual" | "timeout") {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
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
      action: "auth_logout",
      entityType: "auth",
      metadata: { reason },
    });
  }

  await supabase.auth.signOut();

  if (reason === "timeout") {
    redirect("/login?reason=timeout");
  }

  redirect("/login");
}

export async function signOutAction() {
  await signOutWithAudit("manual");
}

export async function signOutByTimeoutAction() {
  await signOutWithAudit("timeout");
}
