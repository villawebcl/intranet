import { NextRequest, NextResponse } from "next/server";

import { type AppRole } from "@/lib/constants/domain";
import { insertAuditLog } from "@/lib/audit/log";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export async function GET(request: NextRequest) {
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
      action: "auth_login",
      entityType: "auth",
      metadata: {
        method: "password",
      },
    });
  }

  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(nextPath, request.url));
}
