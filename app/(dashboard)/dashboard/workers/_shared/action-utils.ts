import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const WORKERS_BASE_PATH = "/dashboard/workers";

/**
 * Validate and return a safe redirect path restricted to /dashboard/workers subtree.
 * Prevents open redirects by rejecting paths outside the allowed prefix.
 */
export function getSafePath(path: string | undefined, fallback: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  if (!path.startsWith(WORKERS_BASE_PATH)) {
    return fallback;
  }

  return path;
}


export type RoleContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: { id: string; email?: string } | null;
  role: AppRole;
  profileWorkerId: string | null;
};

/**
 * Fetch the authenticated user and their role + assigned worker_id from profiles.
 * Returns nulls for user/role/profileWorkerId if the user is not authenticated.
 */
export async function getRoleContext(): Promise<RoleContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, role: "visitante" as AppRole, profileWorkerId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, worker_id")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    role: (profile?.role ?? "visitante") as AppRole,
    profileWorkerId: profile?.worker_id ?? null,
  };
}
