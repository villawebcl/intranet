import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { FlashMessages } from "@/components/ui/flash-messages";
import {
  ACCOUNTING_UPLOAD_FOLDER_TYPE,
  canManageWorkers,
  canUploadDocuments,
  canUploadDocumentToFolder,
  canViewDocuments,
  getUploadableDocumentFolders,
} from "@/lib/auth/roles";
import { folderLabels, folderTypes } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { deleteWorkerAction, toggleWorkerStatusAction } from "../actions";

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

function normalizeFoldersView(value: string) {
  return value === "grid" ? "grid" : "list";
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
  const foldersView = normalizeFoldersView(getStringParam(urlParams.foldersView));

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
  const isAdmin = profile?.role === "admin";
  const canUpload = canUploadDocuments(profile?.role);
  const uploadableFolders = getUploadableDocumentFolders(profile?.role);
  const primaryUploadFolder = uploadableFolders[0] ?? null;
  const hasSingleUploadFolder = uploadableFolders.length === 1;
  const canReadDocuments = canViewDocuments(profile?.role);

  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .select("id, rut, first_name, last_name, position, area, email, phone, status")
    .eq("id", workerId)
    .maybeSingle();

  if (workerError || !worker) {
    notFound();
  }

  let documents: Array<{ folder_type: string; status: string }> | null = null;
  let documentsError: { message: string } | null = null;

  if (canReadDocuments) {
    const { data, error } = await supabase
      .from("documents")
      .select("folder_type, status")
      .eq("worker_id", worker.id);

    documents = data;
    documentsError = error;
  }

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
      <FlashMessages
        error={getStringParam(urlParams.error)}
        success={getStringParam(urlParams.success)}
      />

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
                  <FormSubmitButton
                    pendingLabel={worker.status === "activo" ? "Desactivando..." : "Activando..."}
                    className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {worker.status === "activo" ? "Desactivar" : "Activar"}
                  </FormSubmitButton>
                </form>
              </>
            ) : null}
            {canUpload && primaryUploadFolder ? (
              <Link
                href={`/dashboard/workers/${worker.id}/documents/new${
                  hasSingleUploadFolder ? `?folder=${primaryUploadFolder}` : ""
                }`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {primaryUploadFolder === ACCOUNTING_UPLOAD_FOLDER_TYPE ? "Subir liquidacion" : "Subir documento"}
              </Link>
            ) : null}
            {canReadDocuments ? (
              <Link
                href={`/dashboard/workers/${worker.id}/documents`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver documentos
              </Link>
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

        {isAdmin ? (
          <details className="mt-4 rounded-xl border border-red-200 bg-red-50">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-red-700">
              Eliminar trabajador (solo admin)
            </summary>
            <form action={deleteWorkerAction} className="space-y-3 border-t border-red-200 px-4 py-4">
              <input type="hidden" name="workerId" value={worker.id} />
              <input type="hidden" name="returnTo" value="/dashboard/workers" />
              <p className="text-sm text-red-800">
                Vas a eliminar a {worker.first_name} {worker.last_name}. Esta accion no se puede deshacer.
              </p>
              <label className="flex items-start gap-2 text-sm text-red-900">
                <input
                  type="checkbox"
                  name="confirmDelete"
                  value="yes"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                Confirmo que quiero eliminar este trabajador
              </label>
              <FormSubmitButton
                pendingLabel="Eliminando..."
                className="border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Eliminar trabajador
              </FormSubmitButton>
            </form>
          </details>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Carpetas del trabajador</h2>
              <p className="mt-1 text-sm text-slate-600">
                Estructura fija de 12 carpetas para gestion documental del trabajador.
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
              <Link
                href={`/dashboard/workers/${worker.id}?foldersView=list`}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  foldersView === "list"
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                Lista
              </Link>
              <Link
                href={`/dashboard/workers/${worker.id}?foldersView=grid`}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  foldersView === "grid"
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                Cuadricula
              </Link>
            </div>
          </div>
        </header>

        {documentsError ? (
          <AlertBanner className="mt-4" variant="error">
            No se pudo cargar resumen documental: {documentsError.message}
          </AlertBanner>
        ) : null}

        {!canReadDocuments ? (
          <AlertBanner className="mt-4" variant="warning">
            Tu rol no tiene acceso a los documentos de trabajadores.
          </AlertBanner>
        ) : null}

        {foldersView === "list" ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <ul className="divide-y divide-slate-200 bg-white">
              {folderTypes.map((folderType) => {
                const summary = folderSummary[folderType];

                return (
                  <li key={folderType} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{folderLabels[folderType]}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                            Total: {summary.total}
                          </span>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                            Pendientes: {summary.pendiente}
                          </span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                            Aprobados: {summary.aprobado}
                          </span>
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700">
                            Rechazados: {summary.rechazado}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {canReadDocuments ? (
                          <Link
                            href={`/dashboard/workers/${worker.id}/documents?folder=${folderType}`}
                            className="inline-flex rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Ver documentos
                          </Link>
                        ) : null}
                        {canUpload && canUploadDocumentToFolder(profile?.role, folderType) ? (
                          <Link
                            href={`/dashboard/workers/${worker.id}/documents/new?folder=${folderType}`}
                            className="inline-flex rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            {folderType === ACCOUNTING_UPLOAD_FOLDER_TYPE ? "Subir liquidacion" : "Subir PDF"}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canReadDocuments ? (
                      <Link
                        href={`/dashboard/workers/${worker.id}/documents?folder=${folderType}`}
                        className="inline-flex rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Ver documentos
                      </Link>
                    ) : null}
                    {canUpload && canUploadDocumentToFolder(profile?.role, folderType) ? (
                      <Link
                        href={`/dashboard/workers/${worker.id}/documents/new?folder=${folderType}`}
                        className="inline-flex rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        {folderType === ACCOUNTING_UPLOAD_FOLDER_TYPE ? "Subir liquidacion" : "Subir PDF"}
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
