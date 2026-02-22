import { readFileSync } from "node:fs";
import path from "node:path";

export type SmokeRole = "admin" | "rrhh" | "contabilidad" | "visitante";

type SmokeUserSeed = {
  role: SmokeRole;
  email: string;
  password: string;
  fullName: string;
};

type SmokeWorkerSeed = {
  rut: string;
  firstName: string;
  lastName: string;
  status: "activo" | "inactivo";
  area: string;
  position: string;
  email: string;
  phone: string;
};

type SmokeDocumentSeed = {
  folderType: "folder_01";
  fileName: string;
  filePathSuffix: string;
  mimeType: "application/pdf";
  content: string;
};

export type SmokeRuntimeFixtures = {
  users: Record<SmokeRole, { id: string; email: string; password: string }>;
  worker: {
    id: string;
    rut: string;
    firstName: string;
    lastName: string;
    status: "activo" | "inactivo";
  };
  document: {
    id: string;
    fileName: string;
    filePath: string;
    folderType: "folder_01";
  };
};

export const smokeFixturesFilePath = path.resolve(process.cwd(), "tests/e2e/.generated/smoke-fixtures.json");

export function getSmokeUsersSeed(): Record<SmokeRole, SmokeUserSeed> {
  return {
    admin: {
      role: "admin",
      email: process.env.E2E_SMOKE_ADMIN_EMAIL ?? "e2e.smoke.admin@anagami.local",
      password: process.env.E2E_SMOKE_ADMIN_PASSWORD ?? "E2E-smoke-1234!",
      fullName: "E2E Smoke Admin",
    },
    rrhh: {
      role: "rrhh",
      email: process.env.E2E_SMOKE_RRHH_EMAIL ?? "e2e.smoke.rrhh@anagami.local",
      password: process.env.E2E_SMOKE_RRHH_PASSWORD ?? "E2E-smoke-1234!",
      fullName: "E2E Smoke RRHH",
    },
    contabilidad: {
      role: "contabilidad",
      email: process.env.E2E_SMOKE_CONTABILIDAD_EMAIL ?? "e2e.smoke.contabilidad@anagami.local",
      password: process.env.E2E_SMOKE_CONTABILIDAD_PASSWORD ?? "E2E-smoke-1234!",
      fullName: "E2E Smoke Contabilidad",
    },
    visitante: {
      role: "visitante",
      email: process.env.E2E_SMOKE_VISITANTE_EMAIL ?? "e2e.smoke.visitante@anagami.local",
      password: process.env.E2E_SMOKE_VISITANTE_PASSWORD ?? "E2E-smoke-1234!",
      fullName: "E2E Smoke Visitante",
    },
  };
}

export function getSmokeWorkerSeed(): SmokeWorkerSeed {
  return {
    rut: process.env.E2E_SMOKE_WORKER_RUT ?? "99.999.999-9",
    firstName: "Trabajador",
    lastName: "Smoke",
    status: "activo",
    area: "QA",
    position: "Tester E2E",
    email: "trabajador.smoke@anagami.local",
    phone: "+56900000000",
  };
}

export function getSmokeDocumentSeed(): SmokeDocumentSeed {
  return {
    folderType: "folder_01",
    fileName: process.env.E2E_SMOKE_DOCUMENT_FILE_NAME ?? "e2e-smoke-document.pdf",
    filePathSuffix: process.env.E2E_SMOKE_DOCUMENT_PATH_SUFFIX ?? "e2e-smoke/e2e-smoke-document.pdf",
    mimeType: "application/pdf",
    // Minimal PDF payload sufficient for storage/download smoke fixtures.
    content: "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  };
}

export function readSmokeRuntimeFixtures(): SmokeRuntimeFixtures {
  const raw = readFileSync(smokeFixturesFilePath, "utf8");
  return JSON.parse(raw) as SmokeRuntimeFixtures;
}
