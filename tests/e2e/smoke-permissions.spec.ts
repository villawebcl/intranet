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

  test("admin puede filtrar auditoria y ver eventos auth_login", async ({ page }) => {
    await loginAsRole(page, "admin");

    await page.goto("/dashboard/audit?action=auth_login&entity=auth");

    await expect(page).toHaveURL(/\/dashboard\/audit\?.*action=auth_login.*entity=auth/);
    await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible();
    await expect(page.getByText("No hay eventos para este filtro.")).toHaveCount(0);

    const row = page.locator("tbody tr").filter({ hasText: "auth_login" }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText("auth");
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

  test("contabilidad puede ver /documents en modo lectura", async ({ page }) => {
    const fixtures = readSmokeRuntimeFixtures();

    await loginAsRole(page, "contabilidad");
    await page.goto(`/dashboard/workers/${fixtures.worker.id}/documents`);

    await expect(page).toHaveURL(new RegExp(`/dashboard/workers/${fixtures.worker.id}/documents(?:\\?.*)?$`));
    await expect(page.getByRole("heading", { name: "Documentos del trabajador" })).toBeVisible();

    const row = page.locator("tbody tr").filter({ hasText: fixtures.document.fileName }).first();
    await expect(row).toBeVisible();
    await expect(row.getByRole("button", { name: "Descargar" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Aprobar" })).toHaveCount(0);
  });

  test("contabilidad puede descargar fixture documental (signed URL PDF)", async ({ page }) => {
    const fixtures = readSmokeRuntimeFixtures();

    await loginAsRole(page, "contabilidad");
    await page.goto(`/dashboard/workers/${fixtures.worker.id}/documents`);

    const row = page.locator("tbody tr").filter({ hasText: fixtures.document.fileName }).first();
    await expect(row).toBeVisible();

    const downloadResponsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes("/storage/v1/object/sign/documents/") &&
        response.request().method() === "GET"
      );
    });

    const downloadEventPromise = page.waitForEvent("download", { timeout: 10_000 }).catch(() => null);

    await row.getByRole("button", { name: "Descargar" }).click();

    const [downloadResponse, downloadEvent] = await Promise.all([downloadResponsePromise, downloadEventPromise]);

    expect(downloadResponse.ok()).toBeTruthy();
    expect(downloadResponse.headers()["content-type"] ?? "").toContain("application/pdf");
    expect(downloadResponse.url()).toContain("/storage/v1/object/sign/documents/");

    if (downloadEvent) {
      expect(downloadEvent.suggestedFilename().toLowerCase()).toContain(".pdf");
    }
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
