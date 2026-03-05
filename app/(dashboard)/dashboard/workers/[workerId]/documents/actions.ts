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
import {
  createDownloadRequestSchema,
  downloadApprovedRequestSchema,
  downloadDocumentSchema,
  resolveDownloadRequestSchema,
  reviewDocumentSchema,
  uploadDocumentSchema,
} from "@/lib/validators/documents";
import { setFlash } from "@/lib/flash";
import { getRoleContext, getSafePath, WORKERS_BASE_PATH } from "../../_shared/action-utils";
import { getApprovedDownloadErrorMessage } from "./download-errors";

const DIRECT_DOWNLOAD_SIGNED_URL_SECONDS = 60;
const APPROVED_DOWNLOAD_SIGNED_URL_SECONDS = 300;

function getWorkerScopeError(params: {
  role: AppRole;
  profileWorkerId: string | null;
  targetWorkerId: string;
}) {
  if (!isWorkerScopedRole(params.role)) {
    return null;
  }

  if (!params.profileWorkerId) {
    return "Tu cuenta trabajador no tiene trabajador asignado";
  }

  if (!canAccessAssignedWorker(params.role, params.profileWorkerId, params.targetWorkerId)) {
    return "Solo puedes ver tu documentacion";
  }

  return null;
}

async function ensureWorkerScopeOrRedirect(params: {
  role: AppRole;
  profileWorkerId: string | null;
  targetWorkerId: string;
}) {
  const scopeError = getWorkerScopeError(params);
  if (!scopeError) {
    return;
  }

  await setFlash({ error: scopeError });

  if (scopeError === "Tu cuenta trabajador no tiene trabajador asignado") {
    redirect("/dashboard");
  } else {
    redirect(`/dashboard/workers/${params.profileWorkerId}/documents`);
  }
}

type ApprovedDownloadActionInput = {
  requestId: string;
  workerId: string;
  returnTo?: string;
};

export type ApprovedDownloadActionResult =
  | { ok: true; signedUrl: string }
  | { ok: false; error: string };

export async function getApprovedDownloadUrlAction(
  input: ApprovedDownloadActionInput,
): Promise<ApprovedDownloadActionResult> {
  const parsed = downloadApprovedRequestSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Solicitud invalida de descarga aprobada" };
  }

  const context = await getRoleContext();
  if (!context.user) {
    return { ok: false, error: "Debes iniciar sesion" };
  }

  const scopeError = getWorkerScopeError({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });
  if (scopeError) {
    return { ok: false, error: scopeError };
  }

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
    return { ok: false, error: getApprovedDownloadErrorMessage(result.error) };
  }

  return { ok: true, signedUrl: result.data.signedUrl };
}

function isValidPdfFile(file: File) {
  if (file.type === "application/pdf") {
    return true;
  }

  return file.name.toLowerCase().endsWith(".pdf");
}

/**
 * Verify the file starts with the PDF magic bytes (%PDF-).
 * The MIME type and extension are client-controlled, but the actual file
 * content can only be faked if someone crafts a valid PDF header — which
 * is good enough for a first-pass server-side content check.
 */
async function hasPdfMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 5).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // %PDF- in ASCII: 0x25 0x50 0x44 0x46 0x2D
    return (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2D
    );
  } catch {
    return false;
  }
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
    await setFlash({ error: "Solicitud invalida para subir documento" });
    redirect(returnPath);
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    await setFlash({ error: "Debes seleccionar un archivo PDF" });
    redirect(returnPath);
  }

  if (!isValidPdfFile(fileValue)) {
    await setFlash({ error: "Solo se permiten archivos PDF" });
    redirect(returnPath);
  }

  if (fileValue.size <= 0) {
    await setFlash({ error: "El archivo esta vacio" });
    redirect(returnPath);
  }

  if (!(await hasPdfMagicBytes(fileValue))) {
    await setFlash({ error: "El archivo no es un PDF valido" });
    redirect(returnPath);
  }

  if (fileValue.size > DOCUMENT_MAX_SIZE_BYTES) {
    await setFlash({ error: `El archivo supera el limite de ${DOCUMENT_MAX_SIZE_MB}MB` });
    redirect(returnPath);
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect("/login");
  }

  await ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canUploadDocuments(context.role) || !canUploadDocumentToFolder(context.role, parsed.data.folderType)) {
    await setFlash({ error: "No tienes permisos para subir documentos" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Documento cargado en estado pendiente" });
  redirect(returnPath);
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
    await setFlash({ error: "Solicitud invalida para revisar documento" });
    redirect(returnPath);
  }

  const rejectionReason = parsed.data.rejectionReason?.trim() ?? "";
  if (parsed.data.decision === "rechazado" && !rejectionReason.length) {
    await setFlash({ error: "Debes indicar un motivo de rechazo" });
    redirect(returnPath);
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect("/login");
  }

  await ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canReviewDocuments(context.role)) {
    await setFlash({ error: "No tienes permisos para revisar documentos" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({
    success:
      parsed.data.decision === "aprobado" ? "Documento aprobado correctamente" : "Documento rechazado",
  });
  redirect(returnPath);
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
    await setFlash({ error: "Solicitud invalida de descarga" });
    redirect(returnPath);
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect("/login");
  }

  await ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canDownloadDocuments(context.role)) {
    await setFlash({ error: "No tienes permisos para descargar documentos" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
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
    await setFlash({ error: "Solicitud invalida de descarga" });
    redirect(returnPath);
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect("/login");
  }

  await ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canRequestDocumentDownload(context.role)) {
    await setFlash({ error: "No tienes permisos para solicitar descargas" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({ success: "Solicitud de descarga enviada al equipo administrador" });
  redirect(returnPath);
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
    await setFlash({ error: "Solicitud invalida para resolver descarga" });
    redirect(returnPath);
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect("/login");
  }

  await ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: parsed.data.workerId,
  });

  if (!canReviewDocuments(context.role)) {
    await setFlash({ error: "No tienes permisos para aprobar solicitudes" });
    redirect(returnPath);
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
    await setFlash({ error: result.error });
    redirect(returnPath);
  }

  await setFlash({
    success:
      parsed.data.decision === "aprobado"
        ? "Solicitud aprobada. Ya se puede generar un enlace temporal de 5 minutos."
        : "Solicitud rechazada",
  });
  redirect(returnPath);
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
    await setFlash({ error: "Solicitud invalida de descarga aprobada" });
    redirect(returnPath);
  }

  const result = await getApprovedDownloadUrlAction(parsed.data);

  if (!result.ok) {
    await setFlash({ error: getApprovedDownloadErrorMessage(result.error) });
    redirect(returnPath);
  }

  redirect(result.signedUrl);
}
