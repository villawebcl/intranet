import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { folderLabels, folderTypes } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { toggleWorkerStatusAction } from "../actions";

type WorkerDetailPageProps = {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

type FolderSummary = {
  total: number;
  pendiente: number;
  aprobado: number;
  rechazado: number;
};

export default async function WorkerDetailPage({ params, searchParams }: WorkerDetailPageProps) {
  const { workerId } = await params;
  const urlParams = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const canManage = canManageWorkers(profile?.role);

  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .select("id, rut, first_name, last_name, position, area, email, phone, status")
    .eq("id", workerId)
    .maybeSingle();

  if (workerError || !worker) {
    notFound();
  }

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("folder_type, status")
    .eq("worker_id", worker.id);

  const folderSummary = folderTypes.reduce(
    (acc, folderType) => {
      acc[folderType] = {
        total: 0,
        pendiente: 0,
        aprobado: 0,
        rechazado: 0,
      };
      return acc;
    },
    {} as Record<(typeof folderTypes)[number], FolderSummary>,
  );

  if (documents?.length) {
    documents.forEach((document) => {
      const folderType = document.folder_type as (typeof folderTypes)[number];
      if (!folderTypes.includes(folderType)) {
        return;
      }

      const summary = folderSummary[folderType];
      if (!summary) {
        return;
      }

      summary.total += 1;
      if (document.status === "pendiente") {
        summary.pendiente += 1;
      }
      if (document.status === "aprobado") {
        summary.aprobado += 1;
      }
      if (document.status === "rechazado") {
        summary.rechazado += 1;
      }
    });
  }

  return (
    <section className="space-y-5">
      {getStringParam(urlParams.success) ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {getStringParam(urlParams.success)}
        </p>
      ) : null}

      {getStringParam(urlParams.error) ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getStringParam(urlParams.error)}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              {worker.first_name} {worker.last_name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">RUT: {worker.rut}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/workers"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver
            </Link>
            {canManage ? (
              <>
                <Link
                  href={`/dashboard/workers/${worker.id}/edit`}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Editar datos
                </Link>
                <form action={toggleWorkerStatusAction}>
                  <input type="hidden" name="workerId" value={worker.id} />
                  <input type="hidden" name="currentStatus" value={worker.status} />
                  <input type="hidden" name="returnTo" value={`/dashboard/workers/${worker.id}`} />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {worker.status === "activo" ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </header>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Estado</p>
            <p className="mt-1 font-semibold text-slate-900">{worker.status}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Area</p>
            <p className="mt-1 font-semibold text-slate-900">{worker.area ?? "Sin area"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Cargo</p>
            <p className="mt-1 font-semibold text-slate-900">{worker.position ?? "Sin cargo"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Correo</p>
            <p className="mt-1 truncate font-semibold text-slate-900">{worker.email ?? "Sin correo"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-slate-950">Carpetas del trabajador</h2>
          <p className="mt-1 text-sm text-slate-600">
            Estructura fija de 12 carpetas para gestion documental del trabajador.
          </p>
        </header>

        {documentsError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            No se pudo cargar resumen documental: {documentsError.message}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folderTypes.map((folderType) => {
            const summary = folderSummary[folderType];
            return (
              <article key={folderType} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{folderLabels[folderType]}</p>
                <p className="mt-2 text-xs text-slate-600">Total: {summary.total}</p>
                <p className="mt-1 text-xs text-slate-600">Pendientes: {summary.pendiente}</p>
                <p className="mt-1 text-xs text-slate-600">Aprobados: {summary.aprobado}</p>
                <p className="mt-1 text-xs text-slate-600">Rechazados: {summary.rechazado}</p>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
