const modules = ["Acceso y roles", "Trabajadores", "Documentos PDF", "Notificaciones", "Auditoria"];

export default function DashboardPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Dashboard (base inicial)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Estructura lista para comenzar implementacion por tickets pequenos.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {modules.map((module) => (
          <li
            key={module}
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm"
          >
            {module}
          </li>
        ))}
      </ul>
    </section>
  );
}
