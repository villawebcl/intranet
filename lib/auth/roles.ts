import { folderTypes, type AppRole, type FolderType } from "@/lib/constants/domain";

const workerManagerRoles: AppRole[] = ["admin", "rrhh"];
const documentUploaderRoles: AppRole[] = ["admin", "rrhh", "contabilidad"];
const documentReviewerRoles: AppRole[] = ["admin", "rrhh"];
const documentViewerRoles: AppRole[] = ["admin", "rrhh", "contabilidad", "visitante"];
const documentDownloaderRoles: AppRole[] = ["admin", "rrhh", "contabilidad"];
const auditViewerRoles: AppRole[] = ["admin"];
export const ACCOUNTING_UPLOAD_FOLDER_TYPE: FolderType = "folder_10";

export function canManageWorkers(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return workerManagerRoles.includes(role);
}

export function canManageUsers(role: AppRole | null | undefined) {
  return role === "admin";
}

export function canUploadDocuments(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return documentUploaderRoles.includes(role);
}

export function canUploadDocumentToFolder(
  role: AppRole | null | undefined,
  folderType: FolderType,
) {
  if (!role) {
    return false;
  }

  if (role === "admin" || role === "rrhh") {
    return true;
  }

  if (role === "contabilidad") {
    return folderType === ACCOUNTING_UPLOAD_FOLDER_TYPE;
  }

  return false;
}

export function getUploadableDocumentFolders(role: AppRole | null | undefined) {
  if (!role) {
    return [] as FolderType[];
  }

  if (role === "admin" || role === "rrhh") {
    return [...folderTypes];
  }

  if (role === "contabilidad") {
    return [ACCOUNTING_UPLOAD_FOLDER_TYPE];
  }

  return [] as FolderType[];
}

export function canViewDocuments(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return documentViewerRoles.includes(role);
}

export function canReviewDocuments(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return documentReviewerRoles.includes(role);
}

export function canDownloadDocuments(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return documentDownloaderRoles.includes(role);
}

export function canRequestDocumentDownload(role: AppRole | null | undefined) {
  return role === "visitante";
}

export function canViewAudit(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return auditViewerRoles.includes(role);
}
