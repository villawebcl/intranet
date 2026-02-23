import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FlashMessages } from "@/components/ui/flash-messages";
import {
  canDownloadDocuments,
  canReviewDocuments,
  canUploadDocuments,
  canViewDocuments,
} from "@/lib/auth/roles";
import { documentStatuses, folderLabels, folderTypes } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { downloadDocumentAction, reviewDocumentAction } from "./actions";

type WorkerDocumentsPageProps = {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getStatusBadgeClass(status: string) {
  if (status === "aprobado") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "rechazado") {
    return "bg-red-100 text-red-700";
  }
  return "bg-amber-100 text-amber-800";
}

function getStatusLabel(status: string) {
  if (status === "aprobado") {
    return "Aprobado";
  }
  if (status === "rechazado") {
    return "Rechazado";
  }
  return "Pendiente";
}

function getWorkerStatusLabel(status: string) {
  return status === "activo" ? "Activo" : "Inactivo";
}

function buildCurrentPath(workerId: string, folderFilter: string, statusFilter: string) {
  const search = new URLSearchParams();
  if (folderFilter) {
    search.set("folder", folderFilter);
  }
  if (statusFilter) {
    search.set("status", statusFilter);
  }

  const query = search.toString();
  return query ? `/dashboard/workers/${workerId}/documents?${query}` : `/dashboard/workers/${workerId}/documents`;
}

export default async function WorkerDocumentsPage({ params, searchParams }: WorkerDocumentsPageProps) {
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

  const canUpload = canUploadDocuments(profile?.role);
  const canReview = canReviewDocuments(profile?.role);
  const canView = canViewDocuments(profile?.role);
  const canDownload = canDownloadDocuments(profile?.role);

  if (!canView) {
    redirect("/dashboard/workers?error=No+tienes+permisos+para+ver+documentos");
  }

  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .select("id, first_name, last_name, rut, status")
    .eq("id", workerId)
    .maybeSingle();

  if (workerError || !worker) {
    notFound();
  }

  const requestedFolder = getStringParam(urlParams.folder);
  const requestedStatus = getStringParam(urlParams.status);
  const folderFilter = folderTypes.includes(requestedFolder as (typeof folderTypes)[number])
    ? requestedFolder
    : "";
  const statusFilter = documentStatuses.includes(requestedStatus as (typeof documentStatuses)[number])
    ? requestedStatus
    : "";
  const currentPath = buildCurrentPath(worker.id, folderFilter, statusFilter);
  const hasFilters = Boolean(folderFilter || statusFilter);

  let documentsQuery = supabase
    .from("documents")
    .select("id, folder_type, status, file_name, file_size_bytes, created_at, rejection_reason")
    .eq("worker_id", worker.id)
    .order("created_at", { ascending: false });

  if (folderFilter) {
    documentsQuery = documentsQuery.eq("folder_type", folderFilter);
  }
  if (statusFilter) {
    documentsQuery = documentsQuery.eq("status", statusFilter);
  }

  const { data: documents, error: documentsError } = await documentsQuery;
  const documentsCount = documents?.length ?? 0;

  return (
    <section className="space-y-5">
      <FlashMessages
        error={getStringParam(urlParams.error)}
        success={getStringParam(urlParams.success)}
      />

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Documentos del trabajador</h1>
            <p className="mt-1 text-sm text-slate-600">
              {worker.first_name} {worker.last_name} - {worker.rut}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {documentsCount} {documentsCount === 1 ? "documento" : "documentos"}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  worker.status === "activo"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                Trabajador {getWorkerStatusLabel(worker.status)}
              </span>
              {hasFilters ? (
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                  Filtros activos
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/workers/${worker.id}`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a trabajador
            </Link>
            {canUpload ? (
              <Link
                href={`/dashboard/workers/${worker.id}/documents/new`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Subir PDF
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {worker.status !== "activo" && canUpload ? (
        <AlertBanner variant="warning">
          El trabajador esta inactivo. La carga de nuevos documentos estara bloqueada hasta reactivarlo.
        </AlertBanner>
      ) : null}

      <form className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" method="get">
        <p className="text-sm font-medium text-slate-900">Filtros</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="folder" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Carpeta
            </label>
            <select
              id="folder"
              name="folder"
              defaultValue={folderFilter}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              <option value="">Todas</option>
              {folderTypes.map((folderType) => (
                <option key={folderType} value={folderType}>
                  {folderLabels[folderType]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Estado
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              <option value="">Todos</option>
              {documentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Aplicar
            </button>
            <Link
              href={`/dashboard/workers/${worker.id}/documents`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      {documentsError ? (
        <AlertBanner variant="error">
          No se pudo cargar documentos: {documentsError.message}
        </AlertBanner>
      ) : null}

      {!documentsError && !documentsCount ? (
        <EmptyStateCard
          title={hasFilters ? "No hay documentos para el filtro aplicado" : "Aun no hay documentos cargados"}
          description={
            hasFilters
              ? "Prueba con otra carpeta/estado o limpia los filtros para revisar todos los documentos del trabajador."
              : "Cuando se suban PDFs para este trabajador apareceran aqui con su estado y acciones disponibles."
          }
          actions={[
            ...(hasFilters
              ? [
                  {
                    href: `/dashboard/workers/${worker.id}/documents`,
                    label: "Limpiar filtros",
                    variant: "secondary" as const,
                  },
                ]
              : []),
            ...(canUpload
              ? [
                  {
                    href: `/dashboard/workers/${worker.id}/documents/new`,
                    label: "Subir PDF",
                    variant: "primary" as const,
                  },
                ]
              : []),
          ]}
        />
      ) : null}

      {!documentsError && documentsCount ? (
        <>
          <div className="grid gap-3 md:hidden">
            {documents?.map((document) => (
              <article
                key={document.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900" title={document.file_name}>
                      {document.file_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatFileSize(document.file_size_bytes)} • {formatDate(document.created_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(document.status)}`}
                  >
                    {getStatusLabel(document.status)}
                  </span>
                </div>

                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">Carpeta</dt>
                    <dd className="text-right text-slate-700">
                      {folderLabels[document.folder_type as (typeof folderTypes)[number]]}
                    </dd>
                  </div>
                  {document.rejection_reason ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-red-700">
                        Motivo de rechazo
                      </dt>
                      <dd className="mt-1 text-sm text-red-700">{document.rejection_reason}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-4 space-y-2">
                  {canDownload ? (
                    <form action={downloadDocumentAction}>
                      <input type="hidden" name="workerId" value={worker.id} />
                      <input type="hidden" name="documentId" value={document.id} />
                      <input type="hidden" name="returnTo" value={currentPath} />
                      <FormSubmitButton
                        pendingLabel="Preparando..."
                        className="w-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Descargar
                      </FormSubmitButton>
                    </form>
                  ) : null}

                  {canReview && document.status === "pendiente" ? (
                    <div className="space-y-2">
                      <form action={reviewDocumentAction}>
                        <input type="hidden" name="workerId" value={worker.id} />
                        <input type="hidden" name="documentId" value={document.id} />
                        <input type="hidden" name="decision" value="aprobado" />
                        <input type="hidden" name="returnTo" value={currentPath} />
                        <FormSubmitButton
                          pendingLabel="Aprobando..."
                          className="w-full border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Aprobar
                        </FormSubmitButton>
                      </form>

                      <form action={reviewDocumentAction} className="space-y-2">
                        <input type="hidden" name="workerId" value={worker.id} />
                        <input type="hidden" name="documentId" value={document.id} />
                        <input type="hidden" name="decision" value="rechazado" />
                        <input type="hidden" name="returnTo" value={currentPath} />
                        <input
                          name="rejectionReason"
                          placeholder="Motivo rechazo"
                          required
                          maxLength={500}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                        />
                        <FormSubmitButton
                          pendingLabel="Rechazando..."
                          className="w-full border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Rechazar
                        </FormSubmitButton>
                      </form>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Archivo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Carpeta</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents?.map((document) => (
                  <tr key={document.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="max-w-xs truncate font-medium text-slate-900" title={document.file_name}>
                        {document.file_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(document.file_size_bytes)}
                      </p>
                      {document.rejection_reason ? (
                        <p className="mt-1 text-xs text-red-600">Motivo rechazo: {document.rejection_reason}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {folderLabels[document.folder_type as (typeof folderTypes)[number]]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(document.status)}`}
                      >
                        {getStatusLabel(document.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(document.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {canDownload ? (
                          <form action={downloadDocumentAction}>
                            <input type="hidden" name="workerId" value={worker.id} />
                            <input type="hidden" name="documentId" value={document.id} />
                            <input type="hidden" name="returnTo" value={currentPath} />
                            <FormSubmitButton
                              pendingLabel="Preparando..."
                              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Descargar
                            </FormSubmitButton>
                          </form>
                        ) : null}

                        {canReview && document.status === "pendiente" ? (
                          <>
                            <form action={reviewDocumentAction}>
                              <input type="hidden" name="workerId" value={worker.id} />
                              <input type="hidden" name="documentId" value={document.id} />
                              <input type="hidden" name="decision" value="aprobado" />
                              <input type="hidden" name="returnTo" value={currentPath} />
                              <FormSubmitButton
                                pendingLabel="Aprobando..."
                                className="border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                              >
                                Aprobar
                              </FormSubmitButton>
                            </form>

                            <form action={reviewDocumentAction} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="workerId" value={worker.id} />
                              <input type="hidden" name="documentId" value={document.id} />
                              <input type="hidden" name="decision" value="rechazado" />
                              <input type="hidden" name="returnTo" value={currentPath} />
                              <input
                                name="rejectionReason"
                                placeholder="Motivo rechazo"
                                required
                                maxLength={500}
                                className="w-48 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none ring-blue-500 focus:ring-2"
                              />
                              <FormSubmitButton
                                pendingLabel="Rechazando..."
                                className="border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                              >
                                Rechazar
                              </FormSubmitButton>
                            </form>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
