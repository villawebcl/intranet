import { expect, test } from "@playwright/test";

import { loginAsRole } from "./support/auth";

test.describe("Auth smoke", () => {
  test("login redirige a dashboard sin recarga manual", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Dashboard (base inicial)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();
  });
});
