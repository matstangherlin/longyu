import { test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { dismissBlockingOverlays, seedCourseDirection, seedLessonPlayerReady, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.14B — screenshots de idioma e curso.
 *
 *   SHOT_PACK=1 npx playwright test e2e/rc2-2-14b-screenshots.spec.ts
 *
 * Grava em docs/reports/rc2-2-14b-screenshots/<tela>-<L>x<A>.jpg.
 */
const OUT = path.join("docs", "reports", "rc2-2-14b-screenshots");
const VIEWPORTS = [
  [360, 740],
  [390, 844],
] as const;

test.skip(!process.env.SHOT_PACK, "pacote de screenshots: rode com SHOT_PACK=1");

async function shot(page: Page, name: string, width: number, height: number) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}-${width}x${height}.jpg`), type: "jpeg", quality: 60 });
}

async function open(page: Page, route: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

for (const [width, height] of VIEWPORTS) {
  test.describe(`aparelho PT ${width}x${height}`, () => {
    test("landing sem seletor de idioma", async ({ page }) => {
      await seedTelemetryDeclined(page);
      await open(page, "/", width, height);
      await shot(page, "pt-landing", width, height);
    });
    test("seletor de curso (nada selecionado)", async ({ page }) => {
      await seedTelemetryDeclined(page);
      await open(page, "/curso?next=%2Fteste-guiado", width, height);
      await shot(page, "pt-course-picker", width, height);
      await page.locator('[data-course-choice="en-zh"]').click();
      await shot(page, "pt-course-picker-en-selected", width, height);
    });
    test("onboarding mostra o curso", async ({ page }) => {
      await seedTelemetryDeclined(page);
      await seedCourseDirection(page, "en-zh");
      await open(page, "/comecar", width, height);
      await shot(page, "pt-onboarding-course-chip", width, height);
    });
    test("configurações: idioma e curso", async ({ page }) => {
      await seedLessonPlayerReady(page, "p1-o-que-e-mandarim", { masteryLevel: 1, isPremium: true });
      await open(page, "/config/aprendizagem", width, height);
      await shot(page, "pt-settings-language-course", width, height);
      await page.getByTestId("settings-interface-locale-row").click();
      await page.getByTestId("interface-locale-sheet").waitFor();
      await shot(page, "pt-settings-interface-sheet", width, height);
      await page.keyboard.press("Escape");
      await page.getByTestId("interface-locale-sheet").waitFor({ state: "hidden" }).catch(() => undefined);
      await page.goto("/config/aprendizagem");
      await waitForLazyPage(page);
      await page.getByTestId("settings-course-row").click();
      await page.getByTestId("course-sheet").waitFor();
      await page.locator('[data-testid="course-sheet"] [data-course-choice="en-zh"]').click();
      await shot(page, "pt-settings-course-change-warning", width, height);
    });
  });

  test.describe(`aparelho EN ${width}x${height}`, () => {
    test.use({ locale: "en-US" });
    test("course picker (English device)", async ({ page }) => {
      await seedTelemetryDeclined(page);
      await open(page, "/curso?next=%2Fteste-guiado", width, height);
      await shot(page, "en-course-picker", width, height);
    });
    test("landing (English device)", async ({ page }) => {
      await seedTelemetryDeclined(page);
      await open(page, "/", width, height);
      await shot(page, "en-landing", width, height);
    });
  });
}
