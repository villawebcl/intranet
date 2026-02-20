export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Intranet Anagami</h1>
      <p className="mt-2 text-sm text-slate-600">
        Base inicial lista. Aqui ira el formulario de autenticacion en el siguiente ticket.
      </p>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-900">Ruta reservada: /login</p>
        <p className="mt-2 text-sm text-slate-600">
          Pendiente de implementar con Supabase Auth y control de sesion por inactividad.
        </p>
      </section>
    </main>
  );
}
