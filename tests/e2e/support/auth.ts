import { expect, type Page } from "@playwright/test";

import type { SmokeRole } from "./smoke-fixtures";
import { getSmokeUsersSeed } from "./smoke-fixtures";

export async function loginAsRole(page: Page, role: SmokeRole) {
  const user = getSmokeUsersSeed()[role];
  const errorMessage = "No se pudo iniciar sesion";

  async function ensureLoginPageReady() {
    await page.goto("/login");

    if (/\/dashboard(?:\?|$)/.test(page.url())) {
      const logoutButton = page.getByRole("button", { name: "Cerrar sesion" });
      if (await logoutButton.isVisible().catch(() => false)) {
        await logoutButton.click();
        await page.waitForURL(/\/login(?:\?|$)/, { timeout: 10_000 });
      }
    }

    await expect(page.getByLabel("Correo")).toBeVisible();
    await expect(page.getByLabel("Contrasena")).toBeVisible();
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await ensureLoginPageReady();

    await page.getByLabel("Correo").fill(user.email);
    await page.getByLabel("Contrasena").fill(user.password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    try {
      await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 12_000 });
      await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();
      return;
    } catch {
      const hasAuthError = await page
        .getByText(errorMessage)
        .first()
        .isVisible()
        .catch(() => false);

      if (attempt === 3) {
        const currentUrl = page.url();
        throw new Error(
          `No fue posible iniciar sesion para ${role}. URL actual: ${currentUrl}. Error visible: ${hasAuthError}`,
        );
      }

      await page.waitForTimeout(hasAuthError ? 700 : 1200);
    }
  }
}
