import { redirect } from "next/navigation";
import Link from "next/link";

import { IdleSessionWatcher } from "@/components/auth/idle-session-watcher";
import { getClientEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { signOutAction } from "./actions";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const env = getClientEnv();
  const displayName = profile?.full_name || user.email || "Usuario";
  const role = profile?.role || "visitante";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <p className="text-sm font-semibold text-slate-900">Intranet Anagami</p>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{role}</p>
              <p className="max-w-52 truncate text-sm text-slate-700">{displayName}</p>
            </div>

            <Link
              href="/dashboard/notifications"
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Notificaciones
            </Link>

            {role === "admin" ? (
              <Link
                href="/dashboard/audit"
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Auditoria
              </Link>
            ) : null}

            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar sesion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      <IdleSessionWatcher timeoutMinutes={env.INACTIVITY_TIMEOUT_MINUTES} />
    </div>
  );
}
