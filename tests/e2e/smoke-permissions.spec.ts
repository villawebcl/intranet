import { expect, test } from "@playwright/test";

import { loginAsRole } from "./support/auth";
import { readSmokeRuntimeFixtures } from "./support/smoke-fixtures";

test.describe("Permissions smoke", () => {
  test("admin puede abrir /dashboard/audit", async ({ page }) => {
    await loginAsRole(page, "admin");

    await page.goto("/dashboard/audit");

    await expect(page).toHaveURL(/\/dashboard\/audit(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible();
  });

  test("rrhh no puede abrir /dashboard/audit", async ({ page }) => {
    await loginAsRole(page, "rrhh");

    await page.goto("/dashboard/audit");

    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Dashboard (base inicial)" })).toBeVisible();

    const url = new URL(page.url());
    expect(url.pathname).toBe("/dashboard");
    expect(url.searchParams.get("error")).toBe("No tienes permisos para ver auditoria");
  });

  test("contabilidad no puede abrir /documents/new", async ({ page }) => {
    const fixtures = readSmokeRuntimeFixtures();

    await loginAsRole(page, "contabilidad");
    await page.goto(`/dashboard/workers/${fixtures.worker.id}/documents/new`);

    await expect(page).toHaveURL(new RegExp(`/dashboard/workers/${fixtures.worker.id}(?:\\?.*)?$`));
    await expect(page.getByText("No tienes permisos para subir documentos")).toBeVisible();
    await expect(page.locator(`a[href="/dashboard/workers/${fixtures.worker.id}/documents"]`)).toBeVisible();
  });

  test("visitante no puede acceder al modulo documental del trabajador", async ({ page }) => {
    const fixtures = readSmokeRuntimeFixtures();

    await loginAsRole(page, "visitante");
    await page.goto(`/dashboard/workers/${fixtures.worker.id}/documents`);

    await expect(page).toHaveURL(/\/dashboard\/workers(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Trabajadores" })).toBeVisible();
    await expect(page.getByText("No tienes permisos para ver documentos")).toBeVisible();
  });
});
