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

export type SmokeRuntimeFixtures = {
  users: Record<SmokeRole, { id: string; email: string; password: string }>;
  worker: {
    id: string;
    rut: string;
    firstName: string;
    lastName: string;
    status: "activo" | "inactivo";
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

export function readSmokeRuntimeFixtures(): SmokeRuntimeFixtures {
  const raw = readFileSync(smokeFixturesFilePath, "utf8");
  return JSON.parse(raw) as SmokeRuntimeFixtures;
}
