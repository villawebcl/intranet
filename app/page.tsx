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
          Portal interno para gestionar accesos, trabajadores y documentos en un solo lugar.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <a
          href="/login"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
        >
          <p className="text-base font-semibold text-slate-950">Iniciar sesion</p>
          <p className="mt-1 text-sm text-slate-600">Accede con tu cuenta para ingresar a la intranet.</p>
          <p className="mt-2 text-xs text-slate-500">/login</p>
        </a>
        <a
          href="/dashboard"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
        >
          <p className="text-base font-semibold text-slate-950">Ir al panel</p>
          <p className="mt-1 text-sm text-slate-600">Revisa secciones, estados y accesos segun tu rol.</p>
          <p className="mt-2 text-xs text-slate-500">/dashboard</p>
        </a>
      </section>
    </main>
  );
}
