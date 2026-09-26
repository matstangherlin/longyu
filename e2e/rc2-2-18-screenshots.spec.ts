import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";
import { ACHIEVEMENTS } from "../src/data/achievements";

/**
 * RC2.2.18 · DL/DN — matriz visual da descoberta progressiva (390×844 e
 * 360×740). Só roda com SHOT_PACK=1 (gera docs/reports/rc2-2-18-screenshots).
 */
const SHOT = process.env.SHOT_PACK === "1";
const OUT = "docs/reports/rc2-2-18-screenshots";
const STORE_VERSION = 21;
const FIRST = ["p1-o-que-e-mandarim"];
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];
const achievements = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, 1]));
const seen = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, { status: "SEEN", at: 1 }]));

async function seed(page: Page, state: Record<string, unknown>, guidance: Record<string, unknown>) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.addInitScript((payload: string) => {
    localStorage.setItem("longyu:e2e-guidance", "on");
    if (sessionStorage.getItem("rc2218-shot")) return;
    sessionStorage.setItem("rc2218-shot", "1");
    localStorage.setItem("longyu-v1", payload);
  }, JSON.stringify({ state: { accountSetupComplete: true, courseDirection: "pt-zh", holdAchievementModals: true, guidance, ...state }, version: STORE_VERSION }));
}

async function shot(page: Page, name: string, vp: { width: number; height: number }) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}-${vp.width}x${vp.height}.jpg`, type: "jpeg", quality: 70 });
}

const STAGES: Array<{ id: string; state: Record<string, unknown>; guidance: Record<string, unknown>; waitFor?: string }> = [
  { id: "01-fresh-account", state: { completedLessons: [] }, guidance: { enabled: true, initialized: false, records: {} }, waitFor: "welcome_journey_v1" },
  { id: "02-after-first-lesson", state: { completedLessons: FIRST, achievementsUnlocked: achievements }, guidance: { enabled: true, initialized: true, records: seen("welcome_journey_v1") }, waitFor: "new_features_v1" },
  {
    id: "03-hanzi-milestone",
    state: { completedLessons: FIRST, achievementsUnlocked: achievements, learnedChars: ["你", "好", "我"] },
    guidance: { enabled: true, initialized: true, records: seen("welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1") },
    waitFor: "hanzi_unlocked_v1",
  },
  {
    id: "04-culture-unlock",
    state: { completedLessons: THROUGH_L2, achievementsUnlocked: achievements },
    guidance: { enabled: true, initialized: true, records: seen("welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1", "league_unlocked_v1") },
    waitFor: "culture_unlocked_v1",
  },
  {
    id: "05-mature-account",
    state: {
      completedLessons: THROUGH_L2,
      achievementsUnlocked: achievements,
      points: 60,
      learnedChars: ["你", "好", "我", "是", "中", "国", "人", "大", "小"],
      medals: [],
    },
    guidance: { enabled: false, initialized: true, records: {} },
  },
];

test.describe("RC2.2.18 · matriz visual", () => {
  test.skip(!SHOT, "SHOT_PACK=1 para gerar a matriz visual");
  for (const vp of [
    { width: 390, height: 844 },
    { width: 360, height: 740 },
  ]) {
    for (const stage of STAGES) {
      test(`${stage.id} ${vp.width}x${vp.height}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await seed(page, stage.state, stage.guidance);
        await page.goto("/jornada");
        await waitForLazyPage(page);
        await dismissBlockingOverlays(page);
        if (stage.waitFor) await expect(page.locator(`[data-guidance-id="${stage.waitFor}"]`)).toBeVisible({ timeout: 8_000 });
        await shot(page, `${stage.id}-journey`, vp);
        const more = page.locator("[data-app-bottom-nav]").getByRole("button", { name: "Mais" });
        const guidanceAction = page.locator("[data-guidance-surface] [data-guidance-action]").first();
        if (await guidanceAction.isVisible().catch(() => false)) await guidanceAction.click({ timeout: 3_000 }).catch(() => undefined);
        await more.click();
        await shot(page, `${stage.id}-more`, vp);
      });
    }
  }

  test("locked culture deep link 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, { completedLessons: [] }, { enabled: true, initialized: true, records: seen("welcome_journey_v1") });
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await expect(page.locator("[data-feature-unavailable]")).toBeVisible();
    await shot(page, "06-locked-culture", { width: 390, height: 844 });
  });

  test("culture first use coachmark 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, { completedLessons: THROUGH_L2, achievementsUnlocked: achievements }, {
      enabled: true,
      initialized: true,
      records: seen("welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1", "league_unlocked_v1", "culture_unlocked_v1"),
    });
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await expect(page.locator('[data-guidance-id="culture_first_use_v1"]')).toBeVisible({ timeout: 8_000 });
    await shot(page, "07-culture-first-use", { width: 390, height: 844 });
  });

  test("settings guided tips 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, { completedLessons: FIRST }, { enabled: true, initialized: true, records: seen("welcome_journey_v1", "practice_unlocked_v1", "missions_unlocked_v1") });
    await page.goto("/config/aprendizagem");
    await waitForLazyPage(page);
    await page.getByTestId("guidance-settings").scrollIntoViewIfNeeded();
    await shot(page, "08-settings-guided-tips", { width: 390, height: 844 });
  });
});
