export const SMOKE_ADMIN_DEFAULT_EMAIL = "e2e.smoke.admin@anagami.local";
export const SMOKE_ADMIN_DEFAULT_PASSWORD = "E2E-smoke-1234!";
export const SMOKE_ADMIN_FULL_NAME = "E2E Smoke Admin";

export function getSmokeAdminCredentials() {
  return {
    email: process.env.E2E_SMOKE_ADMIN_EMAIL ?? SMOKE_ADMIN_DEFAULT_EMAIL,
    password: process.env.E2E_SMOKE_ADMIN_PASSWORD ?? SMOKE_ADMIN_DEFAULT_PASSWORD,
  };
}
