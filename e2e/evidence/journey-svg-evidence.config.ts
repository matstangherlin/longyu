import { defineConfig, devices } from "@playwright/test";

/**
 * RC2.3.13R.3.2.3 — evidence capture only (screenshots + scroll video).
 * Not part of the CI projects: `npx playwright test -c e2e/evidence/journey-svg-evidence.config.ts`.
 * Point PLAYWRIGHT_BASE_URL at a running production preview (npm run build && npm run preview).
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.capture.ts",
  timeout: 180_000,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173",
    locale: "pt-BR",
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } }
      : {}),
  },
});
