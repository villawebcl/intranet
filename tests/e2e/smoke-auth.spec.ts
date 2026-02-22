import { expect, test } from "@playwright/test";

import { loginAsRole } from "./support/auth";
import { getSmokeUsersSeed } from "./support/smoke-fixtures";

test.describe("Auth smoke", () => {
  test("login redirige a dashboard sin recarga manual", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Dashboard (base inicial)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();
  });

  test("logout manual cierra sesion y vuelve a /login", async ({ page }) => {
    await loginAsRole(page, "admin");

    await page.getByRole("button", { name: "Cerrar sesion" }).click();

    await page.waitForURL(/\/login(?:\?|$)/);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Intranet Anagami" })).toBeVisible();
    await expect(page.getByText("La sesion se cerro por inactividad.")).toHaveCount(0);
  });

  test("logout por timeout redirige a /login?reason=timeout", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __E2E_IDLE_TIMEOUT_MS__?: number }).__E2E_IDLE_TIMEOUT_MS__ = 6_000;
    });

    const admin = getSmokeUsersSeed().admin;

    await page.goto("/login");
    await page.getByLabel("Correo").fill(admin.email);
    await page.getByLabel("Contrasena").fill(admin.password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await page.waitForURL(/\/dashboard(?:\?|$)/);
    await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();

    await page.waitForURL(/\/login\?reason=timeout(?:&|$)/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/login\?reason=timeout(?:&|$)/);
    await expect(page.getByText("La sesion se cerro por inactividad.")).toBeVisible();
  });
});
