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
    errorCode === "invalid_credentials"
      ? "No se pudo iniciar sesion. Revisa tus credenciales."
      : errorCode === "rate_limited"
        ? "Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente."
        : null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="flex min-h-screen items-center bg-[#f7f7f5] px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-sm lg:max-w-5xl">
        <div className="grid w-full gap-5 lg:grid-cols-[1fr_380px]">

          {/* Left — branding (hidden on mobile) */}
          <section className="hidden flex-col justify-between rounded-xl bg-slate-900 p-8 text-white lg:flex lg:p-10">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-[11px] font-bold text-white">
                  IB
                </span>
                <span className="text-sm font-semibold text-white/80">Intranet Base</span>
              </div>

              <h1 className="mt-10 max-w-sm text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                Panel interno de gestion documental
              </h1>
              <p className="mt-4 max-w-xs text-sm leading-6 text-white/55">
                Acceso restringido por roles. Cada sesion queda registrada en auditoria.
              </p>
            </div>

            <ul className="mt-12 space-y-3 border-t border-white/10 pt-8">
              {[
                { icon: "fi-rr-shield-check", label: "Acceso controlado por rol" },
                { icon: "fi-rr-document", label: "Trazabilidad de documentos" },
                { icon: "fi-rr-list", label: "Auditoria de sesiones" },
              ].map(({ icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-white/60">
                  <i className={`fi ${icon} text-base leading-none text-white/30`} />
                  {label}
                </li>
              ))}
            </ul>
          </section>

          {/* Right — form */}
          <section className="flex flex-col justify-center rounded-xl border border-slate-200/80 bg-white p-8 shadow-[0_2px_16px_-6px_rgba(15,23,42,0.08)] sm:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Acceso
            </p>
            <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-950">
              Iniciar sesion
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              Usa tu cuenta para ingresar al panel.
            </p>

            {reason === "timeout" ? (
              <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                La sesion se cerro por inactividad.
              </p>
            ) : null}

            <div className="mt-7">
              <LoginForm nextPath={nextPath} errorMessage={errorMessage} action={loginWithPasswordAction} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
