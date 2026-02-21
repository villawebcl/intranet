"use server";

import { redirect } from "next/navigation";

import { type AppRole } from "@/lib/constants/domain";
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

    const { error } = await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      actor_role: actorRole,
      action: "auth_logout",
      entity_type: "auth",
      metadata: { reason },
    });

    if (error) {
      console.error("auth logout audit insert failed", error);
    }
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
