/**
 * RC2.3.13D — responsive / keyboard-like viewport E2E (emulated CODE/EMULATED, not PHYSICAL).
 */
import { expect, test } from "@playwright/test";
import { ACHIEVEMENTS } from "../src/data/achievements";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined } from "./helpers";

const STORE_VERSION = 16;

function allAchievementsUnlocked(): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, now]));
}

async function seed(page: import("@playwright/test").Page) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript(
    (payload: string) => localStorage.setItem("longyu-v1", payload),
    JSON.stringify({
      state: {
        accountSetupComplete: true,
        achievementsUnlocked: allAchievementsUnlocked(),
      },
      version: STORE_VERSION,
    }),
  );
}

const VIEWPORTS = [
  { width: 360, height: 640, id: "360" },
  { width: 375, height: 667, id: "375" },
  { width: 390, height: 844, id: "390" },
] as const;

test.describe("RC2.3.13D mobile physical UX (emulated)", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.id}: Guided Try listen CTA + reason stay in frame`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await seed(page);
      await page.goto("/teste-guiado");
      await dismissBlockingOverlays(page);
      await expect(page.getByTestId("guided-try")).toBeVisible({ timeout: 20_000 });
      const intro = page.getByTestId("intro-continue");
      if (await intro.isVisible().catch(() => false)) await intro.click();
      await expect(page.locator('[data-guided-step="listen"]')).toBeVisible({ timeout: 10_000 });
      const audio = page.locator("[data-guided-listen]");
      const reason = page.getByTestId("listen-continue-reason");
      await expect(audio).toBeVisible();
      await expect(reason).toBeVisible();
      const audioBox = await audio.boundingBox();
      const reasonBox = await reason.boundingBox();
      expect((audioBox?.y ?? 0) + (audioBox?.height ?? 0)).toBeLessThanOrEqual(vp.height + 2);
      expect((reasonBox?.y ?? 0) + (reasonBox?.height ?? 0)).toBeLessThanOrEqual(vp.height + 2);
      expect(audioBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    });
  }

  test("keyboard-like short viewport: Guided Try dock still reachable", async ({ page }) => {
    // Approximate IME reducing usable height on a 390 phone.
    await page.setViewportSize({ width: 390, height: 420 });
    await seed(page);
    await page.goto("/teste-guiado");
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("guided-try")).toBeVisible({ timeout: 20_000 });
    const dock = page.locator("[data-guided-action-dock]");
    await expect(dock).toBeVisible();
    const box = await dock.boundingBox();
    expect(box).toBeTruthy();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(420 + 2);
  });
});
