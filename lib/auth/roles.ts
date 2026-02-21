import { type AppRole } from "@/lib/constants/domain";

const workerManagerRoles: AppRole[] = ["admin", "rrhh"];

export function canManageWorkers(role: AppRole | null | undefined) {
  if (!role) {
    return false;
  }

  return workerManagerRoles.includes(role);
}
