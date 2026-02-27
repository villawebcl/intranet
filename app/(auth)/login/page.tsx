import { redirect } from "next/navigation";

import { loginWithPasswordAction } from "@/app/(auth)/actions";
import { LoginForm } from "@/components/auth/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSafeNextPath(nextParam: string | string[] | undefined) {
  if (typeof nextParam !== "string") {
    return "/dashboard";
  }

  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/dashboard";
  }

  return nextParam;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const reason = params.reason;
  const errorCode = typeof params.error === "string" ? params.error : null;
  const errorMessage =
    errorCode === "invalid_credentials" ? "No se pudo iniciar sesion. Revisa tus credenciales." : null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,420px)]">
        <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-8">
          <div className="absolute -right-12 -top-10 h-36 w-36 rounded-full bg-blue-200/40 blur-2xl" aria-hidden />
          <div className="absolute -bottom-10 left-10 h-24 w-24 rounded-full bg-cyan-200/40 blur-2xl" aria-hidden />

          <div className="relative">
            <p className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Panel interno
            </p>
            <h1 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Intranet Base
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Gestion documental interna con acceso por roles, trazabilidad y panel operativo para
              equipos administrativos.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Seguridad
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Sesiones controladas y permisos segun perfil.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Operacion
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Acceso rapido a trabajadores, documentos y auditoria.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.42)] backdrop-blur-sm sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Acceso
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Iniciar sesion</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Usa tu cuenta para ingresar al panel de gestion.
          </p>

          {reason === "timeout" ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-800">
              La sesion se cerro por inactividad.
            </p>
          ) : null}

          <div className="mt-5">
            <LoginForm nextPath={nextPath} errorMessage={errorMessage} action={loginWithPasswordAction} />
          </div>
        </section>
      </div>
    </main>
  );
}
