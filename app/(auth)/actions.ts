"use server";

import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function registerAuthLoginAction() {
  const supabase = await createSupabaseServerClient();
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

  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_role: actorRole,
    action: "auth_login",
    entity_type: "auth",
    metadata: {
      method: "password",
    },
  });

  if (error) {
    console.error("auth login audit insert failed", error);
  }
}
