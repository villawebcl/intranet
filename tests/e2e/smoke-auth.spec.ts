import { expect, test } from "@playwright/test";

import { getSmokeAdminCredentials } from "./support/smoke-user";

test.describe("Auth smoke", () => {
  test("login redirige a dashboard sin recarga manual", async ({ page }) => {
    const { email, password } = getSmokeAdminCredentials();

    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Intranet Anagami" })).toBeVisible();

    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contrasena").fill(password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await page.waitForURL(/\/dashboard(?:\?|$)/);
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Dashboard (base inicial)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();
  });
});
