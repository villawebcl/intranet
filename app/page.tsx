export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
          Intranet Anagami
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Gestion documental
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-700">
          Proyecto base inicializado con Next.js, TypeScript, Tailwind y Supabase para empezar la
          implementacion del MVP de forma ordenada y segura.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <a
          href="/login"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
        >
          <p className="text-base font-semibold text-slate-950">/login</p>
          <p className="mt-1 text-sm text-slate-600">Ruta reservada para autenticacion y sesion.</p>
        </a>
        <a
          href="/dashboard"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
        >
          <p className="text-base font-semibold text-slate-950">/dashboard</p>
          <p className="mt-1 text-sm text-slate-600">
            Modulos iniciales listos para construir por tickets.
          </p>
        </a>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
          Estado actual
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
          <li>Configuracion de calidad: ESLint, Prettier y TypeScript estricto.</li>
          <li>Estructura de Supabase con migracion inicial y RLS base.</li>
          <li>Contexto funcional en `docs/` para guiar el desarrollo del MVP.</li>
        </ul>
      </section>
    </main>
  );
}
