import { redirect } from "next/navigation";

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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Intranet Anagami</h1>
      <p className="mt-2 text-sm text-slate-600">Acceso al panel interno de gestion documental.</p>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-900">Iniciar sesion</p>
        <p className="mt-2 text-sm text-slate-600">
          Usa tu cuenta creada en Supabase Auth para entrar al dashboard.
        </p>

        {reason === "timeout" ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            La sesion se cerro por inactividad.
          </p>
        ) : null}

        <div className="mt-4">
          <LoginForm nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
