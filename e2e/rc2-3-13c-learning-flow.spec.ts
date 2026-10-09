/**
 * RC2.3.13C — Learning flow cognitive polish E2E (representative).
 */
import { expect, test } from "@playwright/test";
import { ACHIEVEMENTS } from "../src/data/achievements";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined } from "./helpers";

const STORE_VERSION = 16;

function allAchievementsUnlocked(): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, now]));
}

async function seed(page: import("@playwright/test").Page, state: Record<string, unknown> = {}) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    (payload: string) => localStorage.setItem("longyu-v1", payload),
    JSON.stringify({
      state: {
        accountSetupComplete: true,
        achievementsUnlocked: allAchievementsUnlocked(),
        ...state,
      },
      version: STORE_VERSION,
    })
  );
}

test.describe("RC2.3.13C learning flow", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Guided Try listen: disabled Continuar explains reason; audio is primary", async ({ page }) => {
    await seed(page);
    await page.goto("/teste-guiado");
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("guided-try")).toBeVisible({ timeout: 20_000 });
    // Intro → start
    const intro = page.getByTestId("intro-continue");
    if (await intro.isVisible().catch(() => false)) {
      await intro.click();
    }
    await expect(page.locator('[data-guided-step="listen"]')).toBeVisible({ timeout: 10_000 });
    const audio = page.locator("[data-guided-listen]");
    await expect(audio).toHaveAttribute("data-cta-hierarchy", "primary");
    const continueBtn = page.getByTestId("listen-continue");
    await expect(continueBtn).toBeDisabled();
    await expect(page.getByTestId("listen-continue-reason")).toBeVisible();
    await expect(continueBtn).toHaveAttribute("data-cta-hierarchy", "secondary");
  });

  test("Review hub exposes one primary Começar revisão", async ({ page }) => {
    const now = Date.now();
    await seed(page, {
      completedLessons: ["l1", "l2"],
      srs: {
        "chunk:nihao": {
          id: "chunk:nihao",
          type: "chunk",
          itemId: "nihao",
          ease: 2.5,
          intervalDays: 1,
          due: now - 1000,
          reps: 1,
          lapses: 0,
          createdAt: now - 86_400_000,
        },
      },
    });
    await page.goto("/revisao");
    await dismissBlockingOverlays(page);
    const start = page.getByTestId("review-start");
    await expect(start).toBeVisible({ timeout: 20_000 });
    await expect(start).toHaveAttribute("data-cta-hierarchy", "primary");
  });

  test("360 viewport: Guided Try dock remains reachable", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await seed(page);
    await page.goto("/teste-guiado");
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("guided-try")).toBeVisible({ timeout: 20_000 });
    const dock = page.locator("[data-guided-action-dock]");
    await expect(dock).toBeVisible();
    const box = await dock.boundingBox();
    expect(box).toBeTruthy();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(640 + 2);
  });
});
