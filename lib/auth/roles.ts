import { type AppRole } from "@/lib/constants/domain";

const workerManagerRoles: AppRole[] = ["admin", "rrhh"];
const documentUploaderRoles: AppRole[] = ["admin", "rrhh"];
const documentReviewerRoles: AppRole[] = ["admin", "rrhh"];
const documentViewerRoles: AppRole[] = ["admin", "rrhh", "contabilidad"];
const auditViewerRoles: AppRole[] = ["admin"];

export function canManageWorkers(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return workerManagerRoles.includes(role);
}

export function canUploadDocuments(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return documentUploaderRoles.includes(role);
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
  return canViewDocuments(role);
}

export function canViewAudit(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return auditViewerRoles.includes(role);
}
