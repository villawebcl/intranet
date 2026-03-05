import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-[11px] font-bold text-white">
            IB
          </span>
          <span className="text-sm font-semibold text-slate-900">Intranet Base</span>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Acceder <span aria-hidden className="opacity-60">→</span>
        </Link>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6">
        <div className="border-t border-slate-200/70 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Herramienta interna · v1.0
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.1] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Gestión documental interna, sin friccion
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-500">
            Trabajadores, documentos y accesos desde un solo panel.
            Trazabilidad completa en cada operacion del equipo.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.5)] hover:bg-slate-800 hover:-translate-y-px transition-transform"
            >
              Iniciar sesion
              <span aria-hidden>→</span>
            </Link>
            <span className="text-xs text-slate-400">Acceso solo por invitacion</span>
          </div>
        </div>
      </main>

      {/* Features — spec-sheet style */}
      <section className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          {[
            {
              index: "01",
              title: "Gestion de trabajadores",
              description:
                "Perfiles con estado activo/inactivo, carpetas de documentos por persona y acceso segmentado por rol.",
            },
            {
              index: "02",
              title: "Documentos seguros",
              description:
                "Carga, revision y descarga con historial completo. Cada accion queda registrada con autor y timestamp.",
            },
            {
              index: "03",
              title: "Control de accesos",
              description:
                "5 roles configurables: admin, rrhh, contabilidad, trabajador y visitante. Auditoria de sesiones incluida.",
            },
          ].map((feature, i) => (
            <div
              key={feature.index}
              className={`grid gap-4 py-8 sm:grid-cols-[64px_200px_1fr] sm:gap-10${
                i > 0 ? " border-t border-slate-100" : ""
              }`}
            >
              <span className="hidden pt-0.5 font-mono text-xs font-medium text-slate-300 sm:block">
                {feature.index}
              </span>
              <p className="font-semibold text-slate-900">{feature.title}</p>
              <p className="text-sm leading-6 text-slate-500 sm:max-w-md">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-6 py-6">
        <p className="text-xs text-slate-400">© 2026 · Intranet Base</p>
      </footer>
    </div>
  );
}
