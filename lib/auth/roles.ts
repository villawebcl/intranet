import { type AppRole } from "@/lib/constants/domain";

const workerManagerRoles: AppRole[] = ["admin", "rrhh"];
const documentUploaderRoles: AppRole[] = ["admin", "rrhh", "contabilidad"];

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
