"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { canUploadDocuments } from "@/lib/auth/roles";
import { type AppRole } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { uploadDocumentSchema } from "@/lib/validators/documents";

const DOCUMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
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
    return { supabase, user: null, role: null as AppRole | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, role: profile?.role ?? "visitante" };
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
    redirect(withMessage(returnPath, { error: "El archivo supera el limite de 5MB" }));
  }

  const context = await getRoleContext();
  if (!context.user) {
    redirect(withMessage("/login", { error: "Debes iniciar sesion" }));
  }

  if (!canUploadDocuments(context.role)) {
    redirect(withMessage(returnPath, { error: "No tienes permisos para subir documentos" }));
  }

  const workerId = parsed.data.workerId;
  const folderType = parsed.data.folderType;

  const { data: worker } = await context.supabase
    .from("workers")
    .select("id, status")
    .eq("id", workerId)
    .maybeSingle();

  if (!worker) {
    redirect(withMessage(returnPath, { error: "Trabajador no encontrado" }));
  }

  if (worker.status !== "activo") {
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

  redirect(
    withMessage(returnPath, {
      success: "Documento cargado en estado pendiente",
    }),
  );
}
