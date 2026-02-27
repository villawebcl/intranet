import { expect, test } from "@playwright/test";

import { loginAsRole } from "./support/auth";
import { type SmokeRole } from "./support/smoke-fixtures";

test.describe("Auth smoke", () => {
  test("login redirige a dashboard sin recarga manual", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(page.getByTestId("dashboard-title")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();
  });

  test("logout manual cierra sesion y vuelve a /login", async ({ page }) => {
    await loginAsRole(page, "admin");

    await page.getByRole("button", { name: "Cerrar sesion" }).click();

    await page.waitForURL(/\/login(?:\?|$)/);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByLabel("Correo")).toBeVisible();
    await expect(page.getByText("La sesion se cerro por inactividad.")).toHaveCount(0);
  });

  test("logout por timeout redirige a /login?reason=timeout", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __E2E_IDLE_TIMEOUT_MS__?: number }).__E2E_IDLE_TIMEOUT_MS__ = 6_000;
    });

    await loginAsRole(page, "admin");

    await page.waitForURL(/\/login\?reason=timeout(?:&|$)/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/login\?reason=timeout(?:&|$)/);
    await expect(page.getByText("La sesion se cerro por inactividad.")).toBeVisible();
  });

  const rolesWithAuditExpectation: Array<{ role: SmokeRole; canOpenAudit: boolean }> = [
    { role: "admin", canOpenAudit: true },
    { role: "rrhh", canOpenAudit: false },
    { role: "contabilidad", canOpenAudit: false },
    { role: "visitante", canOpenAudit: false },
  ];

  for (const { role, canOpenAudit } of rolesWithAuditExpectation) {
    test(`redireccion por rol al abrir /dashboard/audit (${role})`, async ({ page }) => {
      await loginAsRole(page, role);

      await page.goto("/dashboard/audit");

      if (canOpenAudit) {
        await expect(page).toHaveURL(/\/dashboard\/audit(?:\?|$)/);
      } else {
        await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
        await expect(page.getByTestId("dashboard-title")).toBeVisible();

        const url = new URL(page.url());
        expect(url.pathname).toBe("/dashboard");
        expect(url.searchParams.get("error")).toBe("No tienes permisos para ver auditoria");
      }
    });
  }
});
