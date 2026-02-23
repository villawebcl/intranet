export const appRoles = ["admin", "rrhh", "contabilidad", "visitante"] as const;
export type AppRole = (typeof appRoles)[number];

export const workerStatuses = ["activo", "inactivo"] as const;
export type WorkerStatus = (typeof workerStatuses)[number];

export const documentStatuses = ["pendiente", "aprobado", "rechazado"] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

export const folderTypes = [
  "folder_01",
  "folder_02",
  "folder_03",
  "folder_04",
  "folder_05",
  "folder_06",
  "folder_07",
  "folder_08",
  "folder_09",
  "folder_10",
  "folder_11",
  "folder_12",
] as const;
export type FolderType = (typeof folderTypes)[number];

export const folderLabels: Record<FolderType, string> = {
  folder_01: "Curriculum",
  folder_02: "Antecedentes",
  folder_03: "Residencia",
  folder_04: "Estudios",
  folder_05: "Cedula de Identidad",
  folder_06: "Licencias Medicas",
  folder_07: "Amonestaciones",
  folder_08: "Finiquitos",
  folder_09: "Capacitaciones",
  folder_10: "Liquidaciones",
  folder_11: "Contratos y Anexos",
  folder_12: "Inasistencias",
};
