import { expect, test } from "@playwright/test";
import { QA_SCENARIOS } from "../src/lib/qaFastPath";
import { dismissBlockingOverlays, waitForLazyPage } from "./helpers";

test.describe("V4.7.4 QA Fast Path", () => {
  test("hub lista os cenários críticos", async ({ page }) => {
    await page.goto("/qa");
    await waitForLazyPage(page);
    await expect(page.getByRole("heading", { name: /QA Fast Path/i })).toBeVisible();
    await expect(page.locator("[data-qa-fast-path=hub]")).toBeVisible();
    for (const id of ["m1", "m2", "m3", "m4", "review", "transfer", "energy-empty", "pro"]) {
      await expect(page.locator(`[data-qa-scenario="${id}"]`)).toBeVisible();
    }
    expect(QA_SCENARIOS.length).toBeGreaterThanOrEqual(16);
  });

  test("/qa/player é o mesmo hub", async ({ page }) => {
    await page.goto("/qa/player");
    await waitForLazyPage(page);
    await expect(page.getByRole("heading", { name: /QA Fast Path/i })).toBeVisible();
  });

  test("cenário m1 abre o player da primeira pass", async ({ page }) => {
    await page.goto("/qa/m1");
    await page.waitForURL(/\/licao\/p1-o-que-e-mandarim\/player/, { timeout: 20_000 });
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Preparando atividades")).toHaveCount(0);
  });

  test("jornada 1/4 via Fast Path", async ({ page }) => {
    await page.goto("/qa/topic-mastery-1");
    await page.waitForURL(/\/jornada/, { timeout: 20_000 });
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
  });

  test("review com fila grande não congela", async ({ page }) => {
    await page.goto("/qa/review");
    await page.waitForURL(/\/revisao/, { timeout: 20_000 });
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Preparando atividades")).toHaveCount(0);
  });
});
