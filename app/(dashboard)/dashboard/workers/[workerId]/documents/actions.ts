"use server";

import { redirect } from "next/navigation";

import {
  canAccessAssignedWorker,
  canDownloadDocuments,
  canRequestDocumentDownload,
  canReviewDocuments,
  canUploadDocumentToFolder,
  canUploadDocuments,
  isWorkerScopedRole,
} from "@/lib/auth/roles";
import { DOCUMENT_MAX_SIZE_BYTES, DOCUMENT_MAX_SIZE_MB } from "@/lib/constants/documents";
import { type AppRole } from "@/lib/constants/domain";
import {
  createApprovedDownloadUrl,
  createDocumentDownloadRequest,
  createDocumentDownloadUrl,
  resolveDocumentDownloadRequest,
  reviewWorkerDocument,
  uploadWorkerDocument,
} from "@/lib/services/documents.service";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  createDownloadRequestSchema,
  downloadApprovedRequestSchema,
  downloadDocumentSchema,
  resolveDownloadRequestSchema,
  reviewDocumentSchema,
  uploadDocumentSchema,
} from "@/lib/validators/documents";

const WORKERS_BASE_PATH = "/dashboard/workers";
const DIRECT_DOWNLOAD_SIGNED_URL_SECONDS = 60;
const APPROVED_DOWNLOAD_SIGNED_URL_SECONDS = 300;

function getSafePath(path: string | undefined, fallback: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  if (!path.startsWith(WORKERS_BASE_PATH)) {
    return fallback;
  }

  return path;
}

function withMessage(path: string, params: Record<string, string>) {
  const url = new URL(path, "http://localhost");

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const search = url.searchParams.toString();
  return search ? `${url.pathname}?${search}` : url.pathname;
}

async function getRoleContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, role: null as AppRole | null, profileWorkerId: null as string | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, worker_id")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    role: (profile?.role ?? "visitante") as AppRole,
    profileWorkerId: profile?.worker_id ?? null,
  };
}

function ensureWorkerScopeOrRedirect(params: {
  role: AppRole;
  profileWorkerId: string | null;
  targetWorkerId: string;
}) {
  if (!isWorkerScopedRole(params.role)) {
    return;
  }

  if (!params.profileWorkerId) {
    redirect(withMessage("/dashboard", { error: "Tu cuenta trabajador no tiene trabajador asignado" }));
  }

  if (!canAccessAssignedWorker(params.role, params.profileWorkerId, params.targetWorkerId)) {
    redirect(
      withMessage(`/dashboard/workers/${params.profileWorkerId}/documents`, {
        error: "Solo puedes ver tu documentacion",
      }),
    );
  }
}

function isValidPdfFile(file: File) {
  if (file.type === "application/pdf") {
    return true;
  }

  return file.name.toLowerCase().endsWith(".pdf");
}

export async function uploadDocumentAction(formData: FormData) {
  const parsed = uploadDocumentSchema.safeParse({
    workerId: formData.get("workerId"),
    folderType: formData.get("folderType"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida para subir documento" }));
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    redirect(withMessage(returnPath, { error: "Debes seleccionar un archivo PDF" }));
  }

  if (!isValidPdfFile(fileValue)) {
    redirect(withMessage(returnPath, { error: "Solo se permiten archivos PDF" }));
  }

  if (fileValue.size <= 0) {
    redirect(withMessage(returnPath, { error: "El archivo esta vacio" }));
  }

  if (fileValue.size > DOCUMENT_MAX_SIZE_BYTES) {
    redirect(
      withMessage(returnPath, {
        error: `El archivo supera el limite de ${DOCUMENT_MAX_SIZE_MB}MB`,
      }),
    );
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canUploadDocuments(context.role) || !canUploadDocumentToFolder(context.role, parsed.data.folderType)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para subir documentos" }));
  }

  const result = await uploadWorkerDocument(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
      folderType: parsed.data.folderType,
      file: fileValue,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(
    withMessage(returnPath, {
      success: "Documento cargado en estado pendiente",
    }),
  );
}

export async function reviewDocumentAction(formData: FormData) {
  const parsed = reviewDocumentSchema.safeParse({
    workerId: formData.get("workerId"),
    documentId: formData.get("documentId"),
    decision: formData.get("decision"),
    rejectionReason: formData.get("rejectionReason"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida para revisar documento" }));
  }

  const rejectionReason = parsed.data.rejectionReason?.trim() ?? "";
  if (parsed.data.decision === "rechazado" && !rejectionReason.length) {
    redirect(withMessage(returnPath, { error: "Debes indicar un motivo de rechazo" }));
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canReviewDocuments(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para revisar documentos" }));
  }

  const result = await reviewWorkerDocument(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
      documentId: parsed.data.documentId,
      decision: parsed.data.decision,
      rejectionReason: parsed.data.decision === "rechazado" ? rejectionReason : null,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(
    withMessage(returnPath, {
      success:
        parsed.data.decision === "aprobado" ? "Documento aprobado correctamente" : "Documento rechazado",
    }),
  );
}

export async function downloadDocumentAction(formData: FormData) {
  const parsed = downloadDocumentSchema.safeParse({
    workerId: formData.get("workerId"),
    documentId: formData.get("documentId"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida de descarga" }));
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canDownloadDocuments(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para descargar documentos" }));
  }

  const result = await createDocumentDownloadUrl(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
      documentId: parsed.data.documentId,
      expiresInSeconds: DIRECT_DOWNLOAD_SIGNED_URL_SECONDS,
      source: "direct",
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(result.data.signedUrl);
}

export async function requestDocumentDownloadAction(formData: FormData) {
  const parsed = createDownloadRequestSchema.safeParse({
    workerId: formData.get("workerId"),
    documentId: formData.get("documentId"),
    requestReason: formData.get("requestReason"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida de descarga" }));
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canRequestDocumentDownload(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para solicitar descargas" }));
  }

  const result = await createDocumentDownloadRequest(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
      documentId: parsed.data.documentId,
      requestReason: parsed.data.requestReason,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(
    withMessage(returnPath, {
      success: "Solicitud de descarga enviada al equipo administrador",
    }),
  );
}

export async function resolveDownloadRequestAction(formData: FormData) {
  const parsed = resolveDownloadRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    workerId: formData.get("workerId"),
    decision: formData.get("decision"),
    decisionNote: formData.get("decisionNote"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida para resolver descarga" }));
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canReviewDocuments(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para aprobar solicitudes" }));
  }

  const result = await resolveDocumentDownloadRequest(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
      requestId: parsed.data.requestId,
      decision: parsed.data.decision,
      decisionNote: parsed.data.decisionNote?.trim() ?? null,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(
    withMessage(returnPath, {
      success:
        parsed.data.decision === "aprobado"
          ? "Solicitud aprobada. Ya se puede generar un enlace temporal de 5 minutos."
          : "Solicitud rechazada",
    }),
  );
}

export async function downloadApprovedRequestAction(formData: FormData) {
  const parsed = downloadApprovedRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    workerId: formData.get("workerId"),
    returnTo: formData.get("returnTo"),
  });

  const fallbackPath = WORKERS_BASE_PATH;
  const returnPath = getSafePath(parsed.data?.returnTo, fallbackPath);

  if (!parsed.success) {
    redirect(withMessage(returnPath, { error: "Solicitud invalida de descarga aprobada" }));
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  const canReview = canReviewDocuments(context.role);
  const canConsumeApproved = canRequestDocumentDownload(context.role);

  const result = await createApprovedDownloadUrl(
    {
      supabase: context.supabase,
      actorUserId: context.user.id,
      actorRole: context.role,
    },
    {
      workerId: parsed.data.workerId,
      requestId: parsed.data.requestId,
      canReview,
      canConsumeApproved,
      expiresInSeconds: APPROVED_DOWNLOAD_SIGNED_URL_SECONDS,
    },
  );

  if (!result.ok) {
    redirect(withMessage(returnPath, { error: result.error }));
  }

  redirect(result.data.signedUrl);
}
