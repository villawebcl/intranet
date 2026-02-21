import Link from "next/link";

const modules = [
  {
    name: "Acceso y roles",
    description: "Login, sesion y permisos por rol",
    href: "/dashboard",
  },
  {
    name: "Trabajadores",
    description: "CRUD base + activo/inactivo",
    href: "/dashboard/workers",
  },
  {
    name: "Documentos PDF",
    description: "Pendiente de implementar",
    href: "/dashboard",
  },
  {
    name: "Notificaciones",
    description: "Pendiente de implementar",
    href: "/dashboard",
  },
  {
    name: "Auditoria",
    description: "Pendiente de implementar",
    href: "/dashboard",
  },
];

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
          <li key={module.name}>
            <Link
              href={module.href}
              className="block rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <p className="font-semibold text-slate-900">{module.name}</p>
              <p className="mt-1 text-xs text-slate-600">{module.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
