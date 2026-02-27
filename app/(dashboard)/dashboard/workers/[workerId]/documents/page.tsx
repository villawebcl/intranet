import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardPageContainer } from "@/components/dashboard/page-container";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { FlashMessages } from "@/components/ui/flash-messages";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  ACCOUNTING_UPLOAD_FOLDER_TYPE,
  canAccessAssignedWorker,
  canDownloadDocuments,
  canRequestDocumentDownload,
  canReviewDocuments,
  canUploadDocuments,
  canViewDocuments,
  getUploadableDocumentFolders,
  isWorkerScopedRole,
} from "@/lib/auth/roles";
import { documentStatuses, folderLabels, folderTypes } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import {
  downloadApprovedRequestAction,
  downloadDocumentAction,
  resolveDownloadRequestAction,
  requestDocumentDownloadAction,
  reviewDocumentAction,
} from "./actions";

type WorkerDocumentsPageProps = {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DOCUMENTS_PAGE_SIZE = 20;

type DownloadRequestRow = {
  id: string;
  document_id: string;
  requested_by: string;
  status: "pendiente" | "aprobado" | "rechazado";
  reason: string;
  decision_note: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
};

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getPageParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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

function buildCurrentPath(
  workerId: string,
  folderFilter: string,
  statusFilter: string,
  page: number,
) {
  const search = new URLSearchParams();
  if (folderFilter) {
    search.set("folder", folderFilter);
  }
  if (statusFilter) {
    search.set("status", statusFilter);
  }
  if (page > 1) {
    search.set("page", String(page));
  }

  const query = search.toString();
  return query
    ? `/dashboard/workers/${workerId}/documents?${query}`
    : `/dashboard/workers/${workerId}/documents`;
}

function getLatestRequestByStatus(
  requests: DownloadRequestRow[],
  status: DownloadRequestRow["status"],
) {
  return requests.find((request) => request.status === status) ?? null;
}

function getDownloadRequestStatusLabel(status: DownloadRequestRow["status"]) {
  if (status === "aprobado") return "Aprobada";
  if (status === "rechazado") return "Rechazada";
  return "Pendiente";
}

function getDownloadRequestStatusClass(status: DownloadRequestRow["status"]) {
  if (status === "aprobado") return "bg-emerald-100 text-emerald-800";
  if (status === "rechazado") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-800";
}

function truncateId(value: string) {
  if (value.length <= 15) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default async function WorkerDocumentsPage({
  params,
  searchParams,
}: WorkerDocumentsPageProps) {
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
    .select("role, worker_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "visitante";

  if (isWorkerScopedRole(role)) {
    if (!profile?.worker_id) {
      redirect("/dashboard?error=Tu+cuenta+trabajador+no+tiene+trabajador+asignado");
    }

    if (!canAccessAssignedWorker(role, profile.worker_id, workerId)) {
      redirect(
        `/dashboard/workers/${profile.worker_id}/documents?error=Solo+puedes+ver+tu+documentacion`,
      );
    }
  }

  const canUpload = canUploadDocuments(role);
  const uploadableFolders = getUploadableDocumentFolders(role);
  const primaryUploadFolder = uploadableFolders[0] ?? null;
  const hasSingleUploadFolder = uploadableFolders.length === 1;
  const canReview = canReviewDocuments(role);
  const canView = canViewDocuments(role);
  const canDownload = canDownloadDocuments(role);
  const canRequestDownload = canRequestDocumentDownload(role);

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
  const currentPage = getPageParam(urlParams.page);
  const pageFrom = (currentPage - 1) * DOCUMENTS_PAGE_SIZE;
  const pageTo = pageFrom + DOCUMENTS_PAGE_SIZE - 1;
  const folderFilter = folderTypes.includes(requestedFolder as (typeof folderTypes)[number])
    ? requestedFolder
    : "";
  const statusFilter = documentStatuses.includes(
    requestedStatus as (typeof documentStatuses)[number],
  )
    ? requestedStatus
    : "";
  const currentPath = buildCurrentPath(worker.id, folderFilter, statusFilter, currentPage);
  const basePath = buildCurrentPath(worker.id, folderFilter, statusFilter, 1);
  const hasFilters = Boolean(folderFilter || statusFilter);

  let documentsQuery = supabase
    .from("documents")
    .select("id, folder_type, status, file_name, file_size_bytes, created_at, rejection_reason", {
      count: "exact",
    })
    .eq("worker_id", worker.id)
    .order("created_at", { ascending: false })
    .range(pageFrom, pageTo);

  if (folderFilter) {
    documentsQuery = documentsQuery.eq("folder_type", folderFilter);
  }
  if (statusFilter) {
    documentsQuery = documentsQuery.eq("status", statusFilter);
  }

  const {
    data: documents,
    error: documentsError,
    count: documentsTotalCountRaw,
  } = await documentsQuery;
  const documentsCount = documents?.length ?? 0;
  const documentsTotalCount = documentsTotalCountRaw ?? 0;

  if (!documentsError && currentPage > 1 && documentsCount === 0 && documentsTotalCount > 0) {
    const lastPage = Math.max(1, Math.ceil(documentsTotalCount / DOCUMENTS_PAGE_SIZE));
    redirect(buildCurrentPath(worker.id, folderFilter, statusFilter, lastPage));
  }

  const hasNextPage = !documentsError && currentPage * DOCUMENTS_PAGE_SIZE < documentsTotalCount;
  const previousPageHref =
    currentPage > 1
      ? buildCurrentPath(worker.id, folderFilter, statusFilter, currentPage - 1)
      : null;
  const nextPageHref = hasNextPage
    ? buildCurrentPath(worker.id, folderFilter, statusFilter, currentPage + 1)
    : null;
  const documentIds = (documents ?? []).map((document) => document.id);

  let downloadRequests: DownloadRequestRow[] = [];
  let downloadRequestsError: { message: string } | null = null;

  if (documentIds.length && (canRequestDownload || canReview)) {
    let requestsQuery = supabase
      .from("download_requests")
      .select(
        "id, document_id, requested_by, status, reason, decision_note, created_at, approved_at, rejected_at",
      )
      .eq("worker_id", worker.id)
      .in("document_id", documentIds)
      .order("created_at", { ascending: false });

    if (canRequestDownload && !canReview) {
      requestsQuery = requestsQuery.eq("requested_by", user.id);
    }

    const { data, error } = await requestsQuery;
    downloadRequests = (data as DownloadRequestRow[] | null) ?? [];
    downloadRequestsError = error;
  }

  const downloadRequestsByDocument = new Map<string, DownloadRequestRow[]>();
  downloadRequests.forEach((request) => {
    const current = downloadRequestsByDocument.get(request.document_id) ?? [];
    current.push(request);
    downloadRequestsByDocument.set(request.document_id, current);
  });

  return (
    <DashboardPageContainer>
      <section className="space-y-6 lg:space-y-7">
        <FlashMessages
          error={getStringParam(urlParams.error)}
          success={getStringParam(urlParams.success)}
        />

        <header className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Documentos del trabajador
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {worker.first_name} {worker.last_name} - {worker.rut}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {documentsCount} {documentsCount === 1 ? "documento" : "documentos"} en esta
                  pagina
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {documentsTotalCount}{" "}
                  {documentsTotalCount === 1 ? "documento total" : "documentos totales"}
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

            <div className="flex flex-wrap gap-2.5">
              {!isWorkerScopedRole(role) ? (
                <Link
                  href={`/dashboard/workers/${worker.id}`}
                  className="rounded-sm border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Volver a trabajador
                </Link>
              ) : null}
              {canUpload && primaryUploadFolder ? (
                <Link
                  href={`/dashboard/workers/${worker.id}/documents/new${
                    hasSingleUploadFolder ? `?folder=${primaryUploadFolder}` : ""
                  }`}
                  className="rounded-sm border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {primaryUploadFolder === ACCOUNTING_UPLOAD_FOLDER_TYPE
                    ? "Subir liquidacion"
                    : "Subir PDF"}
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        {worker.status !== "activo" && canUpload ? (
          <AlertBanner variant="warning">
            El trabajador esta inactivo. La carga de nuevos documentos estara bloqueada hasta
            reactivarlo.
          </AlertBanner>
        ) : null}

        {canRequestDownload && !canDownload ? (
          <AlertBanner variant="info">
            Tu rol puede visualizar documentos y enviar solicitudes de descarga, pero no descargar
            archivos directamente.
          </AlertBanner>
        ) : null}

        <form
          className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          method="get"
        >
          <p className="text-sm font-medium text-slate-900">Filtros</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label
                htmlFor="folder"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                Carpeta
              </label>
              <select
                id="folder"
                name="folder"
                defaultValue={folderFilter}
                className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
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
              <label
                htmlFor="status"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                Estado
              </label>
              <select
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              >
                <option value="">Todos</option>
                {documentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2.5">
              <button
                type="submit"
                className="rounded-sm bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Aplicar
              </button>
              <Link
                href={basePath}
                className="rounded-sm border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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

        {downloadRequestsError ? (
          <AlertBanner variant="error">
            No se pudieron cargar solicitudes de descarga: {downloadRequestsError.message}
          </AlertBanner>
        ) : null}

        {!documentsError && !documentsCount ? (
          <EmptyStateCard
            className="py-10 sm:py-12"
            title={
              hasFilters
                ? "No hay documentos para el filtro aplicado"
                : "Aun no hay documentos cargados"
            }
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
                      href: `/dashboard/workers/${worker.id}/documents/new${
                        hasSingleUploadFolder && primaryUploadFolder
                          ? `?folder=${primaryUploadFolder}`
                          : ""
                      }`,
                      label:
                        primaryUploadFolder === ACCOUNTING_UPLOAD_FOLDER_TYPE
                          ? "Subir liquidacion"
                          : "Subir PDF",
                      variant: "primary" as const,
                    },
                  ]
                : []),
            ]}
          />
        ) : null}

        {!documentsError && documentsCount ? (
          <>
            <PaginationControls
              className="px-5 py-4"
              currentPage={currentPage}
              previousHref={previousPageHref}
              nextHref={nextPageHref}
              showingCount={documentsCount}
              totalCount={documentsTotalCount}
            />

            <div className="grid gap-4 md:hidden">
              {documents?.map((document) => {
                const documentRequests = downloadRequestsByDocument.get(document.id) ?? [];
                const pendingDownloadRequest = getLatestRequestByStatus(
                  documentRequests,
                  "pendiente",
                );
                const approvedDownloadRequest = getLatestRequestByStatus(
                  documentRequests,
                  "aprobado",
                );
                const latestResolvedDownloadRequest =
                  getLatestRequestByStatus(documentRequests, "rechazado") ??
                  approvedDownloadRequest;

                return (
                  <article
                    key={document.id}
                    className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="truncate font-semibold text-slate-900"
                          title={document.file_name}
                        >
                          {document.file_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatFileSize(document.file_size_bytes)} •{" "}
                          {formatDate(document.created_at)}
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
                        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2">
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

                      {canRequestDownload ? (
                        <>
                          {approvedDownloadRequest ? (
                            <form action={downloadApprovedRequestAction} className="space-y-2">
                              <input
                                type="hidden"
                                name="requestId"
                                value={approvedDownloadRequest.id}
                              />
                              <input type="hidden" name="workerId" value={worker.id} />
                              <input type="hidden" name="returnTo" value={currentPath} />
                              <FormSubmitButton
                                pendingLabel="Generando..."
                                className="w-full border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                              >
                                Descargar aprobado (5 min)
                              </FormSubmitButton>
                            </form>
                          ) : pendingDownloadRequest ? (
                            <div className="rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                              Solicitud pendiente de aprobacion.
                            </div>
                          ) : (
                            <form action={requestDocumentDownloadAction} className="space-y-2">
                              <input type="hidden" name="workerId" value={worker.id} />
                              <input type="hidden" name="documentId" value={document.id} />
                              <input type="hidden" name="returnTo" value={currentPath} />
                              <label
                                htmlFor={`requestReason-mobile-${document.id}`}
                                className="sr-only"
                              >
                                Motivo de solicitud
                              </label>
                              <input
                                id={`requestReason-mobile-${document.id}`}
                                name="requestReason"
                                placeholder="Motivo de la solicitud"
                                required
                                maxLength={500}
                                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                              />
                              <FormSubmitButton
                                pendingLabel="Solicitando..."
                                className="w-full border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                              >
                                Solicitar descarga
                              </FormSubmitButton>
                            </form>
                          )}

                          {latestResolvedDownloadRequest ? (
                            <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                                Ultima solicitud
                              </p>
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getDownloadRequestStatusClass(latestResolvedDownloadRequest.status)}`}
                                >
                                  {getDownloadRequestStatusLabel(
                                    latestResolvedDownloadRequest.status,
                                  )}
                                </span>
                                <span className="text-xs text-slate-600">
                                  {formatDate(latestResolvedDownloadRequest.created_at)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                {latestResolvedDownloadRequest.reason}
                              </p>
                              {latestResolvedDownloadRequest.decision_note ? (
                                <p className="mt-1 text-xs text-slate-600">
                                  Nota: {latestResolvedDownloadRequest.decision_note}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      ) : null}

                      {canReview && documentRequests.length ? (
                        <details className="rounded-sm border border-slate-200 bg-slate-50">
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-slate-700">
                            Solicitudes ({documentRequests.length})
                          </summary>
                          <div className="space-y-2 border-t border-slate-200 px-3 py-3">
                            {documentRequests.slice(0, 3).map((request) => (
                              <div
                                key={request.id}
                                className="rounded-sm border border-slate-200 bg-white px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getDownloadRequestStatusClass(request.status)}`}
                                  >
                                    {getDownloadRequestStatusLabel(request.status)}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {formatDate(request.created_at)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-700">{request.reason}</p>
                                <p
                                  className="mt-1 font-mono text-[11px] text-slate-500"
                                  title={request.requested_by}
                                >
                                  {truncateId(request.requested_by)}
                                </p>
                                {request.status === "pendiente" ? (
                                  <div className="mt-2 space-y-2">
                                    <form
                                      action={resolveDownloadRequestAction}
                                      className="space-y-2"
                                    >
                                      <input type="hidden" name="requestId" value={request.id} />
                                      <input type="hidden" name="workerId" value={worker.id} />
                                      <input type="hidden" name="decision" value="aprobado" />
                                      <input type="hidden" name="returnTo" value={currentPath} />
                                      <input
                                        name="decisionNote"
                                        placeholder="Nota opcional"
                                        maxLength={500}
                                        className="w-full rounded-sm border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none ring-blue-500 focus:ring-2"
                                      />
                                      <FormSubmitButton
                                        pendingLabel="Aprobando..."
                                        className="w-full border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                      >
                                        Aprobar solicitud
                                      </FormSubmitButton>
                                    </form>
                                    <form
                                      action={resolveDownloadRequestAction}
                                      className="space-y-2"
                                    >
                                      <input type="hidden" name="requestId" value={request.id} />
                                      <input type="hidden" name="workerId" value={worker.id} />
                                      <input type="hidden" name="decision" value="rechazado" />
                                      <input type="hidden" name="returnTo" value={currentPath} />
                                      <input
                                        name="decisionNote"
                                        placeholder="Motivo de rechazo"
                                        maxLength={500}
                                        className="w-full rounded-sm border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none ring-blue-500 focus:ring-2"
                                      />
                                      <FormSubmitButton
                                        pendingLabel="Rechazando..."
                                        className="w-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                      >
                                        Rechazar solicitud
                                      </FormSubmitButton>
                                    </form>
                                  </div>
                                ) : null}
                                {request.status === "aprobado" ? (
                                  <form action={downloadApprovedRequestAction} className="mt-2">
                                    <input type="hidden" name="requestId" value={request.id} />
                                    <input type="hidden" name="workerId" value={worker.id} />
                                    <input type="hidden" name="returnTo" value={currentPath} />
                                    <FormSubmitButton
                                      pendingLabel="Generando..."
                                      className="w-full border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                    >
                                      Generar link (5 min)
                                    </FormSubmitButton>
                                  </form>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </details>
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
                            <label
                              htmlFor={`rejectionReason-mobile-${document.id}`}
                              className="sr-only"
                            >
                              Motivo de rechazo
                            </label>
                            <input
                              id={`rejectionReason-mobile-${document.id}`}
                              name="rejectionReason"
                              placeholder="Motivo rechazo"
                              required
                              maxLength={500}
                              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
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
                );
              })}
            </div>

            <div className="hidden overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-sm md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Archivo</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Carpeta</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Estado</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Fecha</th>
                    <th className="px-4 py-4 text-left font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents?.map((document) => {
                    const documentRequests = downloadRequestsByDocument.get(document.id) ?? [];
                    const pendingDownloadRequest = getLatestRequestByStatus(
                      documentRequests,
                      "pendiente",
                    );
                    const approvedDownloadRequest = getLatestRequestByStatus(
                      documentRequests,
                      "aprobado",
                    );

                    return (
                      <tr key={document.id} className="align-top">
                        <td className="px-4 py-4">
                          <p
                            className="max-w-xs truncate font-medium text-slate-900"
                            title={document.file_name}
                          >
                            {document.file_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatFileSize(document.file_size_bytes)}
                          </p>
                          {document.rejection_reason ? (
                            <p className="mt-1 text-xs text-red-600">
                              Motivo rechazo: {document.rejection_reason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {folderLabels[document.folder_type as (typeof folderTypes)[number]]}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(document.status)}`}
                          >
                            {getStatusLabel(document.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {formatDate(document.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            {canDownload ? (
                              <form action={downloadDocumentAction}>
                                <input type="hidden" name="workerId" value={worker.id} />
                                <input type="hidden" name="documentId" value={document.id} />
                                <input type="hidden" name="returnTo" value={currentPath} />
                                <FormSubmitButton
                                  pendingLabel="Preparando..."
                                  className="border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Descargar
                                </FormSubmitButton>
                              </form>
                            ) : null}

                            {canRequestDownload ? (
                              <>
                                {approvedDownloadRequest ? (
                                  <form action={downloadApprovedRequestAction}>
                                    <input
                                      type="hidden"
                                      name="requestId"
                                      value={approvedDownloadRequest.id}
                                    />
                                    <input type="hidden" name="workerId" value={worker.id} />
                                    <input type="hidden" name="returnTo" value={currentPath} />
                                    <FormSubmitButton
                                      pendingLabel="Generando..."
                                      className="border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                    >
                                      Descargar aprobado
                                    </FormSubmitButton>
                                  </form>
                                ) : pendingDownloadRequest ? (
                                  <p className="rounded-sm border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                                    Solicitud pendiente
                                  </p>
                                ) : (
                                  <form
                                    action={requestDocumentDownloadAction}
                                    className="space-y-2"
                                  >
                                    <input type="hidden" name="workerId" value={worker.id} />
                                    <input type="hidden" name="documentId" value={document.id} />
                                    <input type="hidden" name="returnTo" value={currentPath} />
                                    <input
                                      name="requestReason"
                                      placeholder="Motivo solicitud"
                                      required
                                      maxLength={500}
                                      className="w-52 rounded-sm border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none ring-blue-500 focus:ring-2"
                                    />
                                    <FormSubmitButton
                                      pendingLabel="Solicitando..."
                                      className="border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                    >
                                      Solicitar descarga
                                    </FormSubmitButton>
                                  </form>
                                )}
                              </>
                            ) : null}

                            {canReview && documentRequests.length ? (
                              <details className="rounded-sm border border-slate-200 bg-slate-50">
                                <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                  Solicitudes ({documentRequests.length})
                                </summary>
                                <div className="space-y-2 border-t border-slate-200 px-2.5 py-2">
                                  {documentRequests.slice(0, 3).map((request) => (
                                    <div
                                      key={request.id}
                                      className="rounded-sm border border-slate-200 bg-white px-2 py-2"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span
                                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getDownloadRequestStatusClass(request.status)}`}
                                        >
                                          {getDownloadRequestStatusLabel(request.status)}
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                          {formatDate(request.created_at)}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs text-slate-700">
                                        {request.reason}
                                      </p>
                                      <p
                                        className="mt-1 font-mono text-[11px] text-slate-500"
                                        title={request.requested_by}
                                      >
                                        {truncateId(request.requested_by)}
                                      </p>
                                      {request.status === "pendiente" ? (
                                        <div className="mt-2 space-y-2">
                                          <form
                                            action={resolveDownloadRequestAction}
                                            className="space-y-2"
                                          >
                                            <input
                                              type="hidden"
                                              name="requestId"
                                              value={request.id}
                                            />
                                            <input
                                              type="hidden"
                                              name="workerId"
                                              value={worker.id}
                                            />
                                            <input type="hidden" name="decision" value="aprobado" />
                                            <input
                                              type="hidden"
                                              name="returnTo"
                                              value={currentPath}
                                            />
                                            <input
                                              name="decisionNote"
                                              placeholder="Nota opcional"
                                              maxLength={500}
                                              className="w-full rounded-sm border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none ring-blue-500 focus:ring-2"
                                            />
                                            <FormSubmitButton
                                              pendingLabel="Aprobando..."
                                              className="w-full border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                            >
                                              Aprobar
                                            </FormSubmitButton>
                                          </form>
                                          <form
                                            action={resolveDownloadRequestAction}
                                            className="space-y-2"
                                          >
                                            <input
                                              type="hidden"
                                              name="requestId"
                                              value={request.id}
                                            />
                                            <input
                                              type="hidden"
                                              name="workerId"
                                              value={worker.id}
                                            />
                                            <input
                                              type="hidden"
                                              name="decision"
                                              value="rechazado"
                                            />
                                            <input
                                              type="hidden"
                                              name="returnTo"
                                              value={currentPath}
                                            />
                                            <input
                                              name="decisionNote"
                                              placeholder="Motivo rechazo"
                                              maxLength={500}
                                              className="w-full rounded-sm border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none ring-blue-500 focus:ring-2"
                                            />
                                            <FormSubmitButton
                                              pendingLabel="Rechazando..."
                                              className="w-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                            >
                                              Rechazar
                                            </FormSubmitButton>
                                          </form>
                                        </div>
                                      ) : null}
                                      {request.status === "aprobado" ? (
                                        <form
                                          action={downloadApprovedRequestAction}
                                          className="mt-2"
                                        >
                                          <input
                                            type="hidden"
                                            name="requestId"
                                            value={request.id}
                                          />
                                          <input type="hidden" name="workerId" value={worker.id} />
                                          <input
                                            type="hidden"
                                            name="returnTo"
                                            value={currentPath}
                                          />
                                          <FormSubmitButton
                                            pendingLabel="Generando..."
                                            className="w-full border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                          >
                                            Generar link (5 min)
                                          </FormSubmitButton>
                                        </form>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </details>
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
                                    className="border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                  >
                                    Aprobar
                                  </FormSubmitButton>
                                </form>

                                <form
                                  action={reviewDocumentAction}
                                  className="flex flex-wrap items-center gap-2"
                                >
                                  <input type="hidden" name="workerId" value={worker.id} />
                                  <input type="hidden" name="documentId" value={document.id} />
                                  <input type="hidden" name="decision" value="rechazado" />
                                  <input type="hidden" name="returnTo" value={currentPath} />
                                  <label
                                    htmlFor={`rejectionReason-table-${document.id}`}
                                    className="sr-only"
                                  >
                                    Motivo de rechazo
                                  </label>
                                  <input
                                    id={`rejectionReason-table-${document.id}`}
                                    name="rejectionReason"
                                    placeholder="Motivo rechazo"
                                    required
                                    maxLength={500}
                                    className="w-48 rounded-sm border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none ring-blue-500 focus:ring-2"
                                  />
                                  <FormSubmitButton
                                    pendingLabel="Rechazando..."
                                    className="border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                  >
                                    Rechazar
                                  </FormSubmitButton>
                                </form>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PaginationControls
              className="px-5 py-4"
              currentPage={currentPage}
              previousHref={previousPageHref}
              nextHref={nextPageHref}
              showingCount={documentsCount}
              totalCount={documentsTotalCount}
            />
          </>
        ) : null}
      </section>
    </DashboardPageContainer>
  );
}
