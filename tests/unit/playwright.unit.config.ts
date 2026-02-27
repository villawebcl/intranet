import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  workers: 1,
  reporter: "list",
});
