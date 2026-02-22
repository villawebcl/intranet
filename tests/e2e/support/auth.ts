import { expect, type Page } from "@playwright/test";

import type { SmokeRole } from "./smoke-fixtures";
import { getSmokeUsersSeed } from "./smoke-fixtures";

export async function loginAsRole(page: Page, role: SmokeRole) {
  const user = getSmokeUsersSeed()[role];
  const errorMessage = "No se pudo iniciar sesion. Revisa tus credenciales.";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Intranet Anagami" })).toBeVisible();

    await page.getByLabel("Correo").fill(user.email);
    await page.getByLabel("Contrasena").fill(user.password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    try {
      await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 12_000 });
      await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await expect(page.getByText(errorMessage)).toBeVisible();
      await page.waitForTimeout(500);
    }
  }
}
