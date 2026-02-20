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
  folder_01: "Carpeta 01",
  folder_02: "Carpeta 02",
  folder_03: "Carpeta 03",
  folder_04: "Carpeta 04",
  folder_05: "Carpeta 05",
  folder_06: "Carpeta 06",
  folder_07: "Carpeta 07",
  folder_08: "Carpeta 08",
  folder_09: "Carpeta 09",
  folder_10: "Carpeta 10",
  folder_11: "Carpeta 11",
  folder_12: "Carpeta 12",
};
