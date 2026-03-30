type MissingEnvScreenProps = {
  missingKeys: string[];
};

export function MissingEnvScreen({ missingKeys }: MissingEnvScreenProps) {
  return (
    <main className="flex min-h-screen items-center bg-[#f7f7f5] px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_2px_16px_-6px_rgba(15,23,42,0.08)] sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600">
          Configuracion requerida
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Faltan variables de entorno para iniciar la intranet
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          El proyecto depende de Supabase incluso para validar sesion. Sin estas variables, la app no
          puede inicializarse en localhost.
        </p>

        <div className="mt-6 rounded-xl bg-slate-950 p-5 text-sm text-slate-100">
          <p className="font-medium text-white">1. Crea el archivo local</p>
          <pre className="mt-2 overflow-x-auto text-slate-300">{`cp .env.example .env.local`}</pre>

          <p className="mt-5 font-medium text-white">2. Completa estas variables</p>
          <ul className="mt-2 space-y-2 text-slate-300">
            {missingKeys.map((key) => (
              <li key={key} className="font-mono">
                {key}
              </li>
            ))}
          </ul>

          <p className="mt-5 font-medium text-white">3. Reinicia el servidor</p>
          <pre className="mt-2 overflow-x-auto text-slate-300">{`npm run dev`}</pre>
        </div>
      </div>
    </main>
  );
}
