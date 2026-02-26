"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import {
  canAccessAssignedWorker,
  canUploadDocumentToFolder,
  canDownloadDocuments,
  canRequestDocumentDownload,
  canReviewDocuments,
  canUploadDocuments,
  isWorkerScopedRole,
} from "@/lib/auth/roles";
import {
  BLOCK_UPLOAD_FOR_INACTIVE_WORKERS,
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_MAX_SIZE_MB,
} from "@/lib/constants/documents";
import { type AppRole, type FolderType } from "@/lib/constants/domain";
import {
  buildDocumentReviewedEmail,
  buildDocumentUploadedEmail,
} from "@/lib/notifications/email-templates";
import {
  getDefaultReviewerUserIds,
  getUserEmailsByIds,
  insertNotifications,
  markNotificationsSent,
  sendResendEmail,
} from "@/lib/notifications/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  downloadDocumentSchema,
  reviewDocumentSchema,
  uploadDocumentSchema,
} from "@/lib/validators/documents";

const WORKERS_BASE_PATH = "/dashboard/workers";

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

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

async function insertAuditLog(params: {
  action: string;
  actorUserId: string;
  actorRole: AppRole;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: params.actorUserId,
    actor_role: params.actorRole,
    action: params.action,
    entity_type: "document",
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("audit log insert failed", error);
  }
}

function isValidPdfFile(file: File) {
  if (file.type === "application/pdf") {
    return true;
  }

  return file.name.toLowerCase().endsWith(".pdf");
}

function buildWorkerName(firstName: string | null | undefined, lastName: string | null | undefined, fallback: string) {
  const fullName = [firstName ?? "", lastName ?? ""].join(" ").trim();
  return fullName || fallback;
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

  const workerId = parsed.data.workerId;
  const folderType = parsed.data.folderType;

  ensureWorkerScopeOrRedirect({
    role: context.role,
    profileWorkerId: context.profileWorkerId,
    targetWorkerId: workerId,
  });

  if (!canUploadDocuments(context.role) || !canUploadDocumentToFolder(context.role, folderType)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para subir documentos" }));
  }

  const { data: worker } = await context.supabase
    .from("workers")
    .select("id, status, first_name, last_name")
    .eq("id", workerId)
    .maybeSingle();

  if (!worker) {
    redirect(withMessage(returnPath, { error: "Trabajador no encontrado" }));
  }

  if (BLOCK_UPLOAD_FOR_INACTIVE_WORKERS && worker.status !== "activo") {
    redirect(
      withMessage(returnPath, {
        error: "No se permiten cargas para trabajadores inactivos",
      }),
    );
  }

  const originalName = sanitizeFileName(fileValue.name) || `documento-${Date.now()}.pdf`;
  const storagePath = `${workerId}/${folderType}/${Date.now()}-${randomUUID()}-${originalName}`;

  const { error: uploadError } = await context.supabase.storage.from("documents").upload(storagePath, fileValue, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (uploadError) {
    redirect(withMessage(returnPath, { error: "No se pudo subir el archivo a storage" }));
  }

  const { data: document, error: insertError } = await context.supabase
    .from("documents")
    .insert({
      worker_id: workerId,
      folder_type: folderType,
      status: "pendiente",
      file_name: fileValue.name,
      file_path: storagePath,
      file_size_bytes: fileValue.size,
      mime_type: "application/pdf",
      uploaded_by: context.user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    await context.supabase.storage.from("documents").remove([storagePath]);
    redirect(withMessage(returnPath, { error: "No se pudo registrar el documento" }));
  }

  await insertAuditLog({
    action: "document_uploaded",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: document.id,
    metadata: {
      workerId,
      folderType,
      fileSizeBytes: fileValue.size,
    },
  });

  const reviewerUserIds = await getDefaultReviewerUserIds();
  const insertedNotifications = await insertNotifications({
    supabase: context.supabase,
    recipientUserIds: [...reviewerUserIds, context.user.id],
    eventType: "document_uploaded",
    payload: {
      workerId,
      documentId: document.id,
      folderType,
      fileName: fileValue.name,
      status: "pendiente",
    },
    createdBy: context.user.id,
  });

  const workerName = buildWorkerName(worker.first_name, worker.last_name, workerId);
  const uploadedTemplate = buildDocumentUploadedEmail({
    fileName: fileValue.name,
    workerName,
    folderType,
  });
  const emailsByUserId = await getUserEmailsByIds(insertedNotifications.map((notification) => notification.user_id));
  const sentNotificationIds = (
    await Promise.all(
      insertedNotifications.map(async (notification) => {
        const recipientEmail = emailsByUserId[notification.user_id];
        if (!recipientEmail) {
          return null;
        }

        const sent = await sendResendEmail({
          to: recipientEmail,
          subject: uploadedTemplate.subject,
          html: uploadedTemplate.html,
        });

        return sent ? notification.id : null;
      }),
    )
  ).filter((notificationId): notificationId is string => Boolean(notificationId));

  await markNotificationsSent(context.supabase, sentNotificationIds);

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

  const { data: document, error: documentError } = await context.supabase
    .from("documents")
    .select("id, status, worker_id, uploaded_by, file_name, folder_type")
    .eq("id", parsed.data.documentId)
    .eq("worker_id", parsed.data.workerId)
    .maybeSingle();

  if (documentError || !document) {
    redirect(withMessage(returnPath, { error: "Documento no encontrado" }));
  }

  if (document.status !== "pendiente") {
    redirect(withMessage(returnPath, { error: "Solo se pueden revisar documentos pendientes" }));
  }

  const { data: worker } = await context.supabase
    .from("workers")
    .select("first_name, last_name")
    .eq("id", parsed.data.workerId)
    .maybeSingle();

  const { error: updateError } = await context.supabase
    .from("documents")
    .update({
      status: parsed.data.decision,
      reviewed_by: context.user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: parsed.data.decision === "rechazado" ? rejectionReason : null,
    })
    .eq("id", document.id);

  if (updateError) {
    redirect(withMessage(returnPath, { error: "No se pudo actualizar el estado del documento" }));
  }

  await insertAuditLog({
    action: parsed.data.decision === "aprobado" ? "document_approved" : "document_rejected",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: document.id,
    metadata: {
      workerId: parsed.data.workerId,
      rejectionReason: parsed.data.decision === "rechazado" ? rejectionReason : null,
    },
  });

  const reviewerUserIds = await getDefaultReviewerUserIds();
  const insertedNotifications = await insertNotifications({
    supabase: context.supabase,
    recipientUserIds: [...reviewerUserIds, document.uploaded_by].filter(Boolean),
    eventType: parsed.data.decision === "aprobado" ? "document_approved" : "document_rejected",
    payload: {
      workerId: parsed.data.workerId,
      documentId: document.id,
      folderType: document.folder_type,
      fileName: document.file_name,
      decision: parsed.data.decision,
      rejectionReason: parsed.data.decision === "rechazado" ? rejectionReason : null,
    },
    createdBy: context.user.id,
  });

  const workerName = buildWorkerName(worker?.first_name, worker?.last_name, parsed.data.workerId);
  const reviewedTemplate = buildDocumentReviewedEmail({
    fileName: document.file_name,
    workerName,
    folderType: document.folder_type as FolderType,
    decision: parsed.data.decision,
    rejectionReason: parsed.data.decision === "rechazado" ? rejectionReason : null,
  });
  const emailsByUserId = await getUserEmailsByIds(insertedNotifications.map((notification) => notification.user_id));
  const sentNotificationIds = (
    await Promise.all(
      insertedNotifications.map(async (notification) => {
        const recipientEmail = emailsByUserId[notification.user_id];
        if (!recipientEmail) {
          return null;
        }

        const sent = await sendResendEmail({
          to: recipientEmail,
          subject: reviewedTemplate.subject,
          html: reviewedTemplate.html,
        });

        return sent ? notification.id : null;
      }),
    )
  ).filter((notificationId): notificationId is string => Boolean(notificationId));

  await markNotificationsSent(context.supabase, sentNotificationIds);

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

  const { data: document, error: documentError } = await context.supabase
    .from("documents")
    .select("id, file_path, worker_id")
    .eq("id", parsed.data.documentId)
    .eq("worker_id", parsed.data.workerId)
    .maybeSingle();

  if (documentError || !document) {
    redirect(withMessage(returnPath, { error: "Documento no encontrado" }));
  }

  const { data, error } = await context.supabase.storage
    .from("documents")
    .createSignedUrl(document.file_path, 60);

  if (error || !data?.signedUrl) {
    redirect(withMessage(returnPath, { error: "No se pudo generar la descarga del documento" }));
  }

  await insertAuditLog({
    action: "document_downloaded",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: document.id,
    metadata: {
      workerId: parsed.data.workerId,
    },
  });

  redirect(data.signedUrl);
}

export async function requestDocumentDownloadAction(formData: FormData) {
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

  if (!canRequestDocumentDownload(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para solicitar descargas" }));
  }

  const { data: document, error: documentError } = await context.supabase
    .from("documents")
    .select("id, worker_id, file_name, folder_type")
    .eq("id", parsed.data.documentId)
    .eq("worker_id", parsed.data.workerId)
    .maybeSingle();

  if (documentError || !document) {
    redirect(withMessage(returnPath, { error: "Documento no encontrado" }));
  }

  const reviewerUserIds = await getDefaultReviewerUserIds();
  await insertNotifications({
    supabase: context.supabase,
    recipientUserIds: reviewerUserIds,
    eventType: "document_download_requested",
    payload: {
      workerId: parsed.data.workerId,
      documentId: document.id,
      folderType: document.folder_type,
      fileName: document.file_name,
      requestedBy: context.user.id,
    },
    createdBy: context.user.id,
  });

  await insertAuditLog({
    action: "document_download_requested",
    actorUserId: context.user.id,
    actorRole: context.role,
    entityId: document.id,
    metadata: {
      workerId: parsed.data.workerId,
      fileName: document.file_name,
      folderType: document.folder_type,
    },
  });

  redirect(
    withMessage(returnPath, {
      success: "Solicitud de descarga enviada al equipo administrador",
    }),
  );
}
