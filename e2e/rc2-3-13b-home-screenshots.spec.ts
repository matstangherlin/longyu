/**
 * RC2.3.13B — viewport screenshot capture (360 / 375 / 390).
 * Run: PLAYWRIGHT_PREVIEW_PORT=4177 npx playwright test e2e/rc2-3-13b-home-screenshots.spec.ts --project=chromium
 */
import { expect, test, type Page } from "@playwright/test";
import { ACHIEVEMENTS } from "../src/data/achievements";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined } from "./helpers";

const STORE_VERSION = 16;
const OUT = "/opt/cursor/artifacts";

function allAchievementsUnlocked(): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, now]));
}

async function seed(page: Page, state: Record<string, unknown>) {
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

async function shot(page: Page, name: string) {
  await page.goto("/jornada");
  await dismissBlockingOverlays(page);
  await expect(page.getByTestId("home-cognitive")).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: `${OUT}/${name}`, fullPage: false });
}

const VIEWPORTS = [
  { w: 360, h: 640 },
  { w: 375, h: 667 },
  { w: 390, h: 844 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`Home screenshots ${vp.w}x${vp.h}`, () => {
    test.use({ viewport: { width: vp.w, height: vp.h } });

    test(`new ${vp.w}`, async ({ page }) => {
      await seed(page, { completedLessons: [] });
      await shot(page, `rc2-3-13b-home-new-${vp.w}x${vp.h}.png`);
    });

    test(`returning ${vp.w}`, async ({ page }) => {
      await seed(page, { completedLessons: ["l1", "l2"] });
      await shot(page, `rc2-3-13b-home-returning-${vp.w}x${vp.h}.png`);
    });

    test(`review-due ${vp.w}`, async ({ page }) => {
      const now = Date.now();
      await seed(page, {
        completedLessons: ["l1", "l2", "l3"],
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
      await shot(page, `rc2-3-13b-home-review-due-${vp.w}x${vp.h}.png`);
    });
  });
}
