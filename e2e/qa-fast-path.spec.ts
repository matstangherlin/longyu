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

  test("query string não cria outro modo de ativação", async ({ page }) => {
    await page.goto("/qa?seed=1&qa=m1&marker=1");
    await waitForLazyPage(page);
    await expect(page.getByRole("heading", { name: /QA Fast Path/i })).toBeVisible();
    await expect(page).toHaveURL(/\/qa/);
  });

  test("deep link /qa/player?foo sobrevive ao refresh no preview", async ({ page }) => {
    await page.goto("/qa/player?foo=1");
    await waitForLazyPage(page);
    await expect(page.locator("[data-qa-fast-path=hub]")).toBeVisible();
    await page.reload();
    await waitForLazyPage(page);
    await expect(page.locator("[data-qa-fast-path=hub]")).toBeVisible();
  });

  test("marker sozinho no preview não impede o hub; Sair limpa TEST STATE", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("longyu:qa-fast-path", "1");
      localStorage.setItem("longyu-v1", JSON.stringify({
        state: { accountSetupComplete: true, isPremium: true, serverIsPro: true, points: 999 },
        version: 20,
      }));
    });
    await page.goto("/qa");
    await waitForLazyPage(page);
    await expect(page.locator("[data-qa-fast-path=hub]")).toBeVisible();
    await page.getByRole("button", { name: /Sair do QA/i }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
    const leftover = await page.evaluate(() => ({
      marker: localStorage.getItem("longyu:qa-fast-path"),
      backup: localStorage.getItem("longyu:qa-real-state-backup"),
      e2e: localStorage.getItem("longyu:e2e-session-audience"),
    }));
    expect(leftover.marker).toBeNull();
    expect(leftover.backup).toBeNull();
    expect(leftover.e2e).toBeNull();
  });

  test("cenário m1 abre o player da primeira pass", async ({ page }) => {
    await page.goto("/qa/m1");
    await page.waitForURL(/\/licao\/p1-o-que-e-mandarim\/player/, { timeout: 20_000 });
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Preparando atividades")).toHaveCount(0);
    await expect(page.locator("[data-qa-test-state-banner]")).toBeVisible();
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
    await expect(page.locator("[data-review-page]")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Preparando atividades")).toHaveCount(0);
  });

  test("sair do QA restaura persist real e não deixa Pro falso", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("longyu-v1", JSON.stringify({
        state: {
          accountSetupComplete: true,
          isPremium: false,
          serverIsPro: false,
          points: 7,
          completedLessons: [],
        },
        version: 20,
      }));
    });
    await page.goto("/qa/pro");
    await page.waitForURL(/\/pro/, { timeout: 20_000 });
    await waitForLazyPage(page);
    const during = await page.evaluate(() => ({
      marker: localStorage.getItem("longyu:qa-fast-path"),
      backup: localStorage.getItem("longyu:qa-real-state-backup"),
      seed: localStorage.getItem("longyu-v1"),
    }));
    expect(during.marker).toBe("1");
    expect(during.backup).toBeTruthy();
    expect(during.seed ?? "").toMatch(/"isPremium":true/);
    await expect(page.locator("[data-qa-exit]")).toBeVisible();
    await page.locator("[data-qa-exit]").click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
    const after = await page.evaluate(() => {
      const raw = localStorage.getItem("longyu-v1");
      let parsed: { state?: { isPremium?: boolean; points?: number } } | null = null;
      try {
        parsed = raw ? JSON.parse(raw) as { state?: { isPremium?: boolean; points?: number } } : null;
      } catch {
        parsed = null;
      }
      return {
        marker: localStorage.getItem("longyu:qa-fast-path"),
        backup: localStorage.getItem("longyu:qa-real-state-backup"),
        isPremium: parsed?.state?.isPremium ?? null,
        points: parsed?.state?.points ?? null,
      };
    });
    expect(after.marker).toBeNull();
    expect(after.backup).toBeNull();
    expect(after.isPremium).toBe(false);
    expect(after.points).toBe(7);
  });
});
