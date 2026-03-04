import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { FlashMessages } from "@/components/ui/flash-messages";
import {
  ACCOUNTING_UPLOAD_FOLDER_TYPE,
  canAccessAssignedWorker,
  canManageWorkers,
  canUploadDocuments,
  canUploadDocumentToFolder,
  canViewDocuments,
  getUploadableDocumentFolders,
  isWorkerScopedRole,
} from "@/lib/auth/roles";
import { folderLabels, folderTypes } from "@/lib/constants/domain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  activateWorkerAccessAction,
  createWorkerAccessAction,
  deactivateWorkerAction,
  deleteWorkerAction,
  reactivateWorkerAction,
  suspendWorkerAccessAction,
  toggleWorkerStatusAction,
} from "../actions";

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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

type FolderSummary = {
  total: number;
  pendiente: number;
  aprobado: number;
  rechazado: number;
};

type WorkerAccessState = "sin_acceso" | "activo" | "suspendido";

function isUserSuspended(bannedUntil: string | null | undefined) {
  if (!bannedUntil) {
    return false;
  }

  const bannedUntilDate = new Date(bannedUntil);
  if (Number.isNaN(bannedUntilDate.getTime())) {
    return false;
  }

  return bannedUntilDate.getTime() > Date.now();
}

function getAccessBadgeClass(state: WorkerAccessState) {
  if (state === "activo") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }

  if (state === "suspendido") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getAccessStateLabel(state: WorkerAccessState) {
  if (state === "activo") {
    return "Activo";
  }

  if (state === "suspendido") {
    return "Suspendido";
  }

  return "Sin acceso";
}

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
    .select("role, worker_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "visitante";

  if (isWorkerScopedRole(role)) {
    if (!profile?.worker_id) {
      redirect("/dashboard?error=Tu+cuenta+trabajador+no+tiene+trabajador+asignado");
    }

    if (!canAccessAssignedWorker(role, profile.worker_id, workerId)) {
      redirect(`/dashboard/workers/${profile.worker_id}/documents?error=Solo+puedes+ver+tu+documentacion`);
    }

    redirect(`/dashboard/workers/${workerId}/documents`);
  }

  const canManage = canManageWorkers(role);
  const isAdmin = role === "admin";
  const canUpload = canUploadDocuments(role);
  const uploadableFolders = getUploadableDocumentFolders(role);
  const primaryUploadFolder = uploadableFolders[0] ?? null;
  const hasSingleUploadFolder = uploadableFolders.length === 1;
  const canReadDocuments = canViewDocuments(role);

  async function fetchWorkerRecord() {
    return supabase
      .from("workers")
      .select("id, rut, first_name, last_name, position, area, email, phone, status, is_active")
      .eq("id", workerId)
      .maybeSingle();
  }

  let { data: worker, error: workerError } = await fetchWorkerRecord();

  if (workerError) {
    const retryResult = await fetchWorkerRecord();
    worker = retryResult.data;
    workerError = retryResult.error;
  }

  if (workerError) {
    redirect("/dashboard/workers?error=No+se+pudo+cargar+el+trabajador");
  }

  if (!worker) {
    notFound();
  }

  let workerAccessState: WorkerAccessState = "sin_acceso";
  let workerAccessEmail: string | null = null;
  let workerAccessUserId: string | null = null;
  let workerAccessLastSignInAt: string | null = null;
  let workerAccessError: string | null = null;

  if (canManage) {
    try {
      const adminClient = createSupabaseAdminClient();
      const { data: accessProfile, error: accessProfileError } = await adminClient
        .from("profiles")
        .select("id, role")
        .eq("worker_id", worker.id)
        .maybeSingle();

      if (accessProfileError) {
        workerAccessError = "No se pudo validar el acceso del trabajador";
      } else if (accessProfile) {
        workerAccessUserId = accessProfile.id;

        if (accessProfile.role !== "trabajador") {
          workerAccessError = "Existe una cuenta asociada con rol invalido para este trabajador";
        } else {
          const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(accessProfile.id);

          if (authError || !authData.user) {
            workerAccessError = "No se encontro la cuenta de autenticacion asociada";
          } else {
            workerAccessEmail = authData.user.email ?? null;
            workerAccessLastSignInAt = authData.user.last_sign_in_at ?? null;
            workerAccessState = isUserSuspended(authData.user.banned_until) ? "suspendido" : "activo";
          }
        }
      }
    } catch {
      workerAccessError = "Falta configuracion de servicio para administrar accesos";
    }
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

      <section className="rounded-xl bg-white p-6 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.08)]">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Trabajador</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {worker.first_name} {worker.last_name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">RUT: {worker.rut}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/workers"
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Volver
            </Link>
            {canManage && worker.is_active ? (
              <>
                <Link
                  href={`/dashboard/workers/${worker.id}/edit`}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
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
                {isAdmin ? (
                  <details className="rounded-md border border-red-200 bg-red-50">
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-red-700">
                      Archivar
                    </summary>
                    <form
                      action={deactivateWorkerAction}
                      className="space-y-3 border-t border-red-200 px-3 py-3"
                    >
                      <input type="hidden" name="workerId" value={worker.id} />
                      <input type="hidden" name="returnTo" value={`/dashboard/workers/${worker.id}`} />
                      <p className="text-sm text-red-800">
                        Vas a archivar a {worker.first_name} {worker.last_name}. El registro no se elimina de la base.
                      </p>
                      <label className="flex items-start gap-2 text-sm text-red-900">
                        <input
                          type="checkbox"
                          name="confirmArchive"
                          value="yes"
                          required
                          className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                        />
                        Confirmo que quiero archivar este trabajador
                      </label>
                      <FormSubmitButton
                        pendingLabel="Archivando..."
                        className="border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Archivar trabajador
                      </FormSubmitButton>
                    </form>
                  </details>
                ) : null}
              </>
            ) : null}
            {!worker.is_active ? (
              <>
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  Registro archivado
                </span>
                {isAdmin ? (
                  <form action={reactivateWorkerAction}>
                    <input type="hidden" name="workerId" value={worker.id} />
                    <input type="hidden" name="returnTo" value={`/dashboard/workers/${worker.id}`} />
                    <FormSubmitButton
                      pendingLabel="Desarchivando..."
                      className="border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Desarchivar
                    </FormSubmitButton>
                  </form>
                ) : null}
                {isAdmin ? (
                  <details className="rounded-md border border-red-200 bg-red-50">
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-red-700">
                      Eliminar definitivo
                    </summary>
                    <form
                      action={deleteWorkerAction}
                      className="space-y-3 border-t border-red-200 px-3 py-3"
                    >
                      <input type="hidden" name="workerId" value={worker.id} />
                      <input type="hidden" name="returnTo" value="/dashboard/workers?archive=archived" />
                      <p className="text-sm text-red-800">
                        Esta accion elimina definitivamente el trabajador y su acceso asociado.
                      </p>
                      <label className="flex items-start gap-2 text-sm text-red-900">
                        <input
                          type="checkbox"
                          name="confirmDelete"
                          value="yes"
                          required
                          className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                        />
                        Confirmo que quiero eliminar definitivamente este trabajador
                      </label>
                      <FormSubmitButton
                        pendingLabel="Eliminando..."
                        className="border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Eliminar definitivamente
                      </FormSubmitButton>
                    </form>
                  </details>
                ) : null}
              </>
            ) : null}
            {canReadDocuments ? (
              <Link
                href={`/dashboard/workers/${worker.id}/documents`}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver documentos
              </Link>
            ) : null}
            {canUpload && primaryUploadFolder && worker.is_active ? (
              <Link
                href={`/dashboard/workers/${worker.id}/documents/new${
                  hasSingleUploadFolder ? `?folder=${primaryUploadFolder}` : ""
                }`}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {primaryUploadFolder === ACCOUNTING_UPLOAD_FOLDER_TYPE ? "Subir liquidacion" : "Subir documento"}
              </Link>
            ) : null}
          </div>
        </header>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Estado</p>
            <p className="mt-1 font-semibold text-slate-900">{worker.status}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Registro</p>
            <p className="mt-1 font-semibold text-slate-900">{worker.is_active ? "Activo" : "Archivado"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Area</p>
            <p className="mt-1 font-semibold text-slate-900">{worker.area ?? "Sin area"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Cargo</p>
            <p className="mt-1 font-semibold text-slate-900">{worker.position ?? "Sin cargo"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Correo</p>
            <p className="mt-1 truncate font-semibold text-slate-900">{worker.email ?? "Sin correo"}</p>
          </div>
        </div>

        {canManage ? (
          <section className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Acceso al portal</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Gestiona la cuenta de ingreso del trabajador y su acceso a documentacion personal.
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getAccessBadgeClass(workerAccessState)}`}
              >
                {getAccessStateLabel(workerAccessState)}
              </span>
            </header>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Correo acceso</p>
                <p className="mt-1 truncate font-medium text-slate-900">{workerAccessEmail ?? "Sin cuenta"}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Ultimo login</p>
                <p className="mt-1 font-medium text-slate-900">{formatDateTime(workerAccessLastSignInAt)}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">ID cuenta</p>
                <p className="mt-1 truncate font-medium text-slate-900">{workerAccessUserId ?? "Sin cuenta"}</p>
              </div>
            </div>

            {workerAccessError ? (
              <AlertBanner className="mt-3" variant="warning">
                {workerAccessError}
              </AlertBanner>
            ) : null}

            {workerAccessState === "sin_acceso" && !workerAccessError ? (
              <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                {!worker.is_active ? (
                  <AlertBanner variant="warning">Debes desarchivar el trabajador para crear su acceso.</AlertBanner>
                ) : !worker.email ? (
                  <AlertBanner variant="warning">
                    Debes completar el correo del trabajador antes de crear su acceso.
                  </AlertBanner>
                ) : (
                  <form action={createWorkerAccessAction} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <input type="hidden" name="workerId" value={worker.id} />
                    <input type="hidden" name="returnTo" value={`/dashboard/workers/${worker.id}`} />
                    <div className="space-y-1.5">
                      <label htmlFor="temporary-password" className="text-sm font-medium text-slate-900">
                        Contrasena temporal
                      </label>
                      <input
                        id="temporary-password"
                        name="temporaryPassword"
                        type="password"
                        minLength={8}
                        required
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                        placeholder="Minimo 8 caracteres"
                      />
                    </div>
                    <FormSubmitButton
                      pendingLabel="Creando acceso..."
                      className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Crear acceso
                    </FormSubmitButton>
                  </form>
                )}
              </div>
            ) : null}

            {workerAccessState === "activo" ? (
              <form action={suspendWorkerAccessAction} className="mt-3">
                <input type="hidden" name="workerId" value={worker.id} />
                <input type="hidden" name="returnTo" value={`/dashboard/workers/${worker.id}`} />
                <FormSubmitButton
                  pendingLabel="Suspendiendo..."
                  className="border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                >
                  Suspender acceso
                </FormSubmitButton>
              </form>
            ) : null}

            {workerAccessState === "suspendido" ? (
              <form action={activateWorkerAccessAction} className="mt-3">
                <input type="hidden" name="workerId" value={worker.id} />
                <input type="hidden" name="returnTo" value={`/dashboard/workers/${worker.id}`} />
                <FormSubmitButton
                  pendingLabel="Activando..."
                  className="border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  Reactivar acceso
                </FormSubmitButton>
              </form>
            ) : null}
          </section>
        ) : null}

      </section>

      <section className="rounded-xl bg-white p-6 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.08)]">
        <header>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Carpetas del trabajador</h2>
              <p className="mt-1 text-sm text-slate-600">
                Estructura fija de 12 carpetas para gestion documental del trabajador.
              </p>
            </div>
            <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
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
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
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
                            className="inline-flex rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Ver documentos
                          </Link>
                        ) : null}
                        {canUpload && worker.is_active && canUploadDocumentToFolder(role, folderType) ? (
                          <Link
                            href={`/dashboard/workers/${worker.id}/documents/new?folder=${folderType}`}
                            className="inline-flex rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {folderTypes.map((folderType) => {
              const summary = folderSummary[folderType];
              return (
                <article key={folderType} className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-slate-700">
                    {folderLabels[folderType]}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      T {summary.total}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      P {summary.pendiente}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      A {summary.aprobado}
                    </span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                      R {summary.rechazado}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {canReadDocuments ? (
                      <Link
                        href={`/dashboard/workers/${worker.id}/documents?folder=${folderType}`}
                        className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Ver
                      </Link>
                    ) : null}
                    {canUpload && worker.is_active && canUploadDocumentToFolder(role, folderType) ? (
                      <Link
                        href={`/dashboard/workers/${worker.id}/documents/new?folder=${folderType}`}
                        className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {folderType === ACCOUNTING_UPLOAD_FOLDER_TYPE ? "Subir" : "PDF"}
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
