import { defineConfig, devices } from "@playwright/test";

// Ambientes com Chromium pré-instalado (sem download do Playwright) apontam o
// binário via PLAYWRIGHT_CHROMIUM_EXECUTABLE; no CI padrão fica vazio.
const chromiumLaunch: { launchOptions?: { executablePath: string } } =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } }
    : {};

// A suíte completa roda nos motores de mesa (chromium/firefox/webkit). Os
// projetos mobile/tablet/reduced-motion focam no arquivo dedicado de QA real
// de dispositivo — mais rápido e sem reexecutar asserts pensados para desktop.
const DEVICE_SPEC = "**/mobile-device.spec.ts";
// Captura de evidências (docs/screenshots) — só no projeto `screenshots`.
const SCREENSHOT_SPEC = "**/screenshots.spec.ts";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Os e2e rodam contra o build de produção (preview) e alguns fluxos tocam a
  // rede (Supabase). 45s dá folga para navegação dupla sem mascarar travas reais.
  timeout: 45_000,
  // No CI, além do console, gera playwright-report/ (salvo como artifact).
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // ── Motores de mesa: suíte completa ────────────────────────────────────
    // Chromium é o portão padrão (roda em qualquer ambiente, inclusive só-Chromium).
    {
      name: "chromium",
      testIgnore: SCREENSHOT_SPEC,
      use: { ...devices["Desktop Chrome"], ...chromiumLaunch },
    },
    // Gecko real (Firefox). Exige `npx playwright install firefox`.
    {
      name: "firefox",
      testIgnore: SCREENSHOT_SPEC,
      use: { ...devices["Desktop Firefox"] },
    },
    // WebKit ≈ motor do Safari (macOS e iOS). Exige `npx playwright install webkit`.
    {
      name: "webkit",
      testIgnore: SCREENSHOT_SPEC,
      use: { ...devices["Desktop Safari"] },
    },

    // ── Mobile/tablet: QA real de dispositivo (spec dedicado) ──────────────
    // Chrome Android (touch, 393×851, DPR alto).
    {
      name: "mobile-chrome",
      testMatch: DEVICE_SPEC,
      use: { ...devices["Pixel 5"], ...chromiumLaunch },
    },
    // Safari iOS (WebKit, touch). Exige webkit instalado.
    {
      name: "mobile-safari",
      testMatch: DEVICE_SPEC,
      use: { ...devices["iPhone 13"] },
    },
    // Tablet Chrome — retrato e paisagem (motor Chromium, com toque).
    {
      name: "tablet-portrait",
      testMatch: DEVICE_SPEC,
      use: {
        ...chromiumLaunch,
        browserName: "chromium",
        viewport: { width: 834, height: 1112 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet-landscape",
      testMatch: DEVICE_SPEC,
      use: {
        ...chromiumLaunch,
        browserName: "chromium",
        viewport: { width: 1112, height: 834 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    // Acessibilidade: usuário com "reduzir movimento" ligado no SO.
    {
      name: "reduced-motion",
      testMatch: DEVICE_SPEC,
      use: {
        ...devices["Pixel 5"],
        ...chromiumLaunch,
        contextOptions: { reducedMotion: "reduce" },
      },
    },

    // Evidências para docs/REAL_DEVICE_QA.md. Roda por demanda:
    // `npx playwright test --project=screenshots`. O próprio spec cria contextos
    // por viewport (mobile/tablet/desktop), então não entra no set padrão.
    {
      name: "screenshots",
      testMatch: SCREENSHOT_SPEC,
      use: { ...devices["Desktop Chrome"], ...chromiumLaunch },
    },
  ],
});
