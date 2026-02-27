import "server-only";

import { randomUUID } from "crypto";

import { BLOCK_UPLOAD_FOR_INACTIVE_WORKERS } from "@/lib/constants/documents";
import { type AppRole, type FolderType } from "@/lib/constants/domain";
import { logAuditEvent } from "@/lib/services/audit.service";
import {
  notifyDocumentReviewed,
  notifyDocumentUploaded,
  notifyDownloadRequested,
} from "@/lib/services/notifications.service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type ServiceResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

type DocumentServiceContext = {
  supabase: SupabaseServerClient;
  actorUserId: string;
  actorRole: AppRole;
  adminClient?: SupabaseAdminClient;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildWorkerName(firstName: string | null | undefined, lastName: string | null | undefined, fallback: string) {
  const fullName = [firstName ?? "", lastName ?? ""].join(" ").trim();
  return fullName || fallback;
}

export async function uploadWorkerDocument(
  context: DocumentServiceContext,
  payload: {
    workerId: string;
    folderType: FolderType;
    file: File;
  },
): Promise<ServiceResult<void>> {
  const { data: worker } = await context.supabase
    .from("workers")
    .select("id, status, is_active, first_name, last_name")
    .eq("id", payload.workerId)
    .maybeSingle();

  if (!worker) {
    return { ok: false, error: "Trabajador no encontrado" };
  }

  if (!worker.is_active) {
    return { ok: false, error: "No se permiten cargas para trabajadores archivados" };
  }

  if (BLOCK_UPLOAD_FOR_INACTIVE_WORKERS && worker.status !== "activo") {
    return { ok: false, error: "No se permiten cargas para trabajadores inactivos" };
  }

  const originalName = sanitizeFileName(payload.file.name) || `documento-${Date.now()}.pdf`;
  const storagePath = `${payload.workerId}/${payload.folderType}/${Date.now()}-${randomUUID()}-${originalName}`;

  const { error: uploadError } = await context.supabase.storage
    .from("documents")
    .upload(storagePath, payload.file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: "No se pudo subir el archivo a storage" };
  }

  const { data: document, error: insertError } = await context.supabase
    .from("documents")
    .insert({
      worker_id: payload.workerId,
      folder_type: payload.folderType,
      status: "pendiente",
      file_name: payload.file.name,
      file_path: storagePath,
      file_size_bytes: payload.file.size,
      mime_type: "application/pdf",
      uploaded_by: context.actorUserId,
    })
    .select("id")
    .single();

  if (insertError) {
    await context.supabase.storage.from("documents").remove([storagePath]);
    return { ok: false, error: "No se pudo registrar el documento" };
  }

  await logAuditEvent({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: "document_uploaded",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "document",
    entityId: document.id,
    metadata: {
      workerId: payload.workerId,
      folderType: payload.folderType,
      fileSizeBytes: payload.file.size,
    },
  });

  const workerName = buildWorkerName(worker.first_name, worker.last_name, payload.workerId);
  await notifyDocumentUploaded({
    supabase: context.supabase,
    actorUserId: context.actorUserId,
    workerId: payload.workerId,
    documentId: document.id,
    folderType: payload.folderType,
    fileName: payload.file.name,
    workerName,
  });

  return { ok: true, data: undefined };
}

export async function reviewWorkerDocument(
  context: DocumentServiceContext,
  payload: {
    workerId: string;
    documentId: string;
    decision: "aprobado" | "rechazado";
    rejectionReason: string | null;
  },
): Promise<ServiceResult<void>> {
  const { data: document, error: documentError } = await context.supabase
    .from("documents")
    .select("id, status, worker_id, uploaded_by, file_name, folder_type")
    .eq("id", payload.documentId)
    .eq("worker_id", payload.workerId)
    .maybeSingle();

  if (documentError || !document) {
    return { ok: false, error: "Documento no encontrado" };
  }

  if (document.status !== "pendiente") {
    return { ok: false, error: "Solo se pueden revisar documentos pendientes" };
  }

  const { data: worker } = await context.supabase
    .from("workers")
    .select("first_name, last_name")
    .eq("id", payload.workerId)
    .maybeSingle();

  const { error: updateError } = await context.supabase
    .from("documents")
    .update({
      status: payload.decision,
      reviewed_by: context.actorUserId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: payload.decision === "rechazado" ? payload.rejectionReason : null,
    })
    .eq("id", document.id);

  if (updateError) {
    return { ok: false, error: "No se pudo actualizar el estado del documento" };
  }

  await logAuditEvent({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: payload.decision === "aprobado" ? "document_approved" : "document_rejected",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "document",
    entityId: document.id,
    metadata: {
      workerId: payload.workerId,
      rejectionReason: payload.decision === "rechazado" ? payload.rejectionReason : null,
    },
  });

  const workerName = buildWorkerName(worker?.first_name, worker?.last_name, payload.workerId);
  await notifyDocumentReviewed({
    supabase: context.supabase,
    actorUserId: context.actorUserId,
    workerId: payload.workerId,
    documentId: document.id,
    folderType: document.folder_type as FolderType,
    fileName: document.file_name,
    workerName,
    uploadedBy: document.uploaded_by,
    decision: payload.decision,
    rejectionReason: payload.decision === "rechazado" ? payload.rejectionReason : null,
  });

  return { ok: true, data: undefined };
}

export async function createDocumentDownloadUrl(
  context: DocumentServiceContext,
  payload: {
    workerId: string;
    documentId: string;
    expiresInSeconds: number;
    source: string;
    requestId?: string;
  },
): Promise<ServiceResult<{ signedUrl: string }>> {
  const { data: document, error: documentError } = await context.supabase
    .from("documents")
    .select("id, file_path, worker_id")
    .eq("id", payload.documentId)
    .eq("worker_id", payload.workerId)
    .maybeSingle();

  if (documentError || !document) {
    return { ok: false, error: "Documento no encontrado" };
  }

  const { data, error } = await context.supabase.storage
    .from("documents")
    .createSignedUrl(document.file_path, payload.expiresInSeconds);

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      error:
        payload.source === "direct"
          ? "No se pudo generar la descarga del documento"
          : "No se pudo generar el enlace temporal",
    };
  }

  await logAuditEvent({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: "document_downloaded",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "document",
    entityId: document.id,
    metadata: {
      workerId: payload.workerId,
      source: payload.source,
      requestId: payload.requestId ?? null,
      expiresInSeconds: payload.expiresInSeconds,
    },
  });

  return { ok: true, data: { signedUrl: data.signedUrl } };
}

export async function createDocumentDownloadRequest(
  context: DocumentServiceContext,
  payload: {
    workerId: string;
    documentId: string;
    requestReason: string;
  },
): Promise<ServiceResult<void>> {
  const { data: document, error: documentError } = await context.supabase
    .from("documents")
    .select("id, worker_id, file_name, folder_type")
    .eq("id", payload.documentId)
    .eq("worker_id", payload.workerId)
    .maybeSingle();

  if (documentError || !document) {
    return { ok: false, error: "Documento no encontrado" };
  }

  const { data: request, error: requestError } = await context.supabase
    .from("download_requests")
    .insert({
      worker_id: payload.workerId,
      document_id: document.id,
      requested_by: context.actorUserId,
      reason: payload.requestReason,
      status: "pendiente",
    })
    .select("id")
    .single();

  if (requestError) {
    const alreadyPending = requestError.code === "23505";
    return {
      ok: false,
      error: alreadyPending
        ? "Ya tienes una solicitud pendiente para este documento"
        : "No se pudo registrar la solicitud de descarga",
    };
  }

  await notifyDownloadRequested({
    supabase: context.supabase,
    actorUserId: context.actorUserId,
    workerId: payload.workerId,
    documentId: document.id,
    requestId: request.id,
    folderType: document.folder_type as FolderType,
    fileName: document.file_name,
    requestReason: payload.requestReason,
  });

  await logAuditEvent({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: "document_download_requested",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "document",
    entityId: document.id,
    metadata: {
      workerId: payload.workerId,
      fileName: document.file_name,
      folderType: document.folder_type,
      requestId: request.id,
    },
  });

  return { ok: true, data: undefined };
}

export async function resolveDocumentDownloadRequest(
  context: DocumentServiceContext,
  payload: {
    workerId: string;
    requestId: string;
    decision: "aprobado" | "rechazado";
    decisionNote: string | null;
  },
): Promise<ServiceResult<void>> {
  const { data: request, error: requestError } = await context.supabase
    .from("download_requests")
    .select("id, status, worker_id, document_id, requested_by")
    .eq("id", payload.requestId)
    .eq("worker_id", payload.workerId)
    .maybeSingle();

  if (requestError || !request) {
    return { ok: false, error: "Solicitud de descarga no encontrada" };
  }

  if (request.status !== "pendiente") {
    return { ok: false, error: "La solicitud ya fue procesada" };
  }

  const nowIso = new Date().toISOString();
  const isApproved = payload.decision === "aprobado";
  const updatePayload = isApproved
    ? {
        status: "aprobado" as const,
        decision_note: payload.decisionNote,
        approved_by: context.actorUserId,
        approved_at: nowIso,
      }
    : {
        status: "rechazado" as const,
        decision_note: payload.decisionNote,
        rejected_by: context.actorUserId,
        rejected_at: nowIso,
      };

  const { data: updatedRequest, error: updateError } = await context.supabase
    .from("download_requests")
    .update(updatePayload)
    .eq("id", request.id)
    .eq("status", "pendiente")
    .select("id, status, worker_id, document_id, requested_by")
    .maybeSingle();

  if (updateError) {
    return { ok: false, error: "No se pudo actualizar la solicitud" };
  }

  if (!updatedRequest) {
    return { ok: false, error: "La solicitud ya fue procesada" };
  }

  await logAuditEvent({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: isApproved ? "document_download_request_approved" : "document_download_request_rejected",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "document",
    entityId: updatedRequest.document_id,
    metadata: {
      workerId: updatedRequest.worker_id,
      requestId: updatedRequest.id,
      requestedBy: updatedRequest.requested_by,
    },
  });

  return { ok: true, data: undefined };
}

export async function createApprovedDownloadUrl(
  context: DocumentServiceContext,
  payload: {
    workerId: string;
    requestId: string;
    canReview: boolean;
    canConsumeApproved: boolean;
    expiresInSeconds: number;
  },
): Promise<ServiceResult<{ signedUrl: string; expiresAt: string }>> {
  if (!payload.canReview && !payload.canConsumeApproved) {
    return { ok: false, error: "No tienes permisos para usar enlaces aprobados" };
  }

  let requestQuery = context.supabase
    .from("download_requests")
    .select("id, status, worker_id, document_id, requested_by")
    .eq("id", payload.requestId)
    .eq("worker_id", payload.workerId);

  if (!payload.canReview) {
    requestQuery = requestQuery.eq("requested_by", context.actorUserId);
  }

  const { data: request, error: requestError } = await requestQuery.maybeSingle();

  if (requestError || !request) {
    return { ok: false, error: "Solicitud aprobada no encontrada" };
  }

  if (!payload.canReview && request.requested_by !== context.actorUserId) {
    return { ok: false, error: "Solicitud aprobada no encontrada" };
  }

  if (request.status !== "aprobado") {
    return { ok: false, error: "La solicitud aun no esta aprobada" };
  }

  const { data: document, error: documentError } = await context.supabase
    .from("documents")
    .select("id, file_path, worker_id")
    .eq("id", request.document_id)
    .eq("worker_id", request.worker_id)
    .maybeSingle();

  if (documentError || !document) {
    return { ok: false, error: "Documento no encontrado" };
  }

  let adminClient = context.adminClient;
  if (!adminClient) {
    try {
      adminClient = createSupabaseAdminClient();
    } catch {
      return { ok: false, error: "No se pudo generar el enlace temporal" };
    }
  }

  const { data: signedData, error: signedError } = await adminClient.storage
    .from("documents")
    .createSignedUrl(document.file_path, payload.expiresInSeconds);

  if (signedError || !signedData?.signedUrl) {
    return { ok: false, error: "No se pudo generar el enlace temporal" };
  }

  await logAuditEvent({
    supabase: context.supabase,
    adminClient: context.adminClient,
    action: "document_downloaded",
    actorUserId: context.actorUserId,
    actorRole: context.actorRole,
    entityType: "document",
    entityId: document.id,
    metadata: {
      workerId: request.worker_id,
      source: payload.canReview ? "approved_request_reviewer" : "approved_request_requester",
      requestId: request.id,
      expiresInSeconds: payload.expiresInSeconds,
    },
  });

  return {
    ok: true,
    data: {
      signedUrl: signedData.signedUrl,
      expiresAt: new Date(Date.now() + payload.expiresInSeconds * 1000).toISOString(),
    },
  };
}
