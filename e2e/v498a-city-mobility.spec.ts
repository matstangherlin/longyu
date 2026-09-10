import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import {
  dismissBlockingOverlays,
  seedUnlockedLessonSession,
  seedMissionsSession,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilSelector } from "./lesson-player-mobile-helpers";
import { expectCultureLessonPlayer, playCultureLessonToVictory, readCulturePersist } from "./culture-lesson-helpers";

type PersistSlice = {
  srs: Record<string, unknown>;
  cultureCompletedIds: string[];
  cultureMasteryById: Record<string, { stars?: number; completed?: boolean }>;
  cultureMemoryById: Record<string, unknown>;
  cultureKnowledgeById: Record<string, { state?: string; source?: string }>;
};

async function readPersist(page: Page): Promise<PersistSlice> {
  const slice = await readCulturePersist(page);
  return {
    srs: slice.srs,
    cultureCompletedIds: slice.cultureCompletedIds,
    cultureMasteryById: slice.cultureMasteryById,
    cultureMemoryById: slice.cultureMemoryById,
    cultureKnowledgeById: slice.cultureKnowledgeById,
  };
}

function mobilityMastery(lessonId: string, level: number) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const completed = ALL_LESSONS.slice(0, Math.max(0, index)).map((lesson) => lesson.id);
  const now = Date.now();
  const byId: Record<string, { level: number; passCount: number; lastPass: number; recoveryPending: boolean; updatedAt: number }> = {};
  for (const id of completed) {
    const lesson = ALL_LESSONS.find((item) => item.id === id);
    if (!lesson || lesson.isReview || lesson.reviewMasteryMode) continue;
    byId[id] = { level: 4, passCount: 4, lastPass: 4, recoveryPending: false, updatedAt: now };
  }
  if (level > 0) {
    byId[lessonId] = {
      level,
      passCount: level,
      lastPass: Math.max(1, level),
      recoveryPending: false,
      updatedAt: now,
    };
  }
  return byId;
}

async function openMobilityPassPlayer(page: Page, lessonId: string, masteryLevel = 0) {
  await seedUnlockedLessonSession(page, lessonId, {
    lessonMasteryById: mobilityMastery(lessonId, masteryLevel),
  });
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
}

test.describe("V4.9.8A city mobility", () => {
  test("p6-cidade-lugares opens the metro-qr lesson", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p6-cidade-lugares");
    await page.goto("/licao/p6-cidade-lugares");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "metro-qr");
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "metro-qr");
  });

  test("p7 station lesson page keeps metro-qr without a second card gap", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p7-imersao-estacao");
    await page.goto("/licao/p7-imersao-estacao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Imersão: na estação/i })).toBeVisible();
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "metro-qr");
  });

  test("p6-cidade player does not inject a metro-qr bridge", async ({ page }) => {
    test.setTimeout(120_000);
    await openMobilityPassPlayer(page, "p6-cidade-lugares");
    const before = await readPersist(page);
    const reached = await advanceUntilSelector(page, '[data-testid="culture-bridge"]', 12, 25_000);
    expect(reached).toBeFalsy();
    await expect(page.getByTestId("culture-bridge")).toHaveCount(0);
    const after = await readPersist(page);
    expect(Object.keys(after.srs)).toEqual(Object.keys(before.srs));
    expect(after.cultureCompletedIds).not.toContain("metro-qr");
  });

  test("p6-direcoes player reaches a map", async ({ page }) => {
    test.setTimeout(120_000);
    // M2 skips the M1 tone wall. First authored map is 银行→公园 (scaffold 2);
    // later M2 maps use 南京路/酒店/地铁站. Assert any mobility endpoint.
    await openMobilityPassPlayer(page, "p6-direcoes", 1);
    const reached = await advanceUntilSelector(page, '[data-current-step-kind="map_direction"]', 80, 90_000);
    expect(reached).toBeTruthy();
    await expect(page.locator('[data-current-step-kind="map_direction"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/银行|酒店|南京路|公园|地铁站/).first()).toBeVisible({ timeout: 15_000 });
  });

  test("p7 station player reaches a mobility conversation", async ({ page }) => {
    test.setTimeout(120_000);
    await openMobilityPassPlayer(page, "p7-imersao-estacao", 3);
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 50, 90_000);
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-scene]")).toBeVisible();
  });

  test("p6-china-ruas player reaches the taxi conversation", async ({ page }) => {
    test.setTimeout(120_000);
    await openMobilityPassPlayer(page, "p6-china-ruas", 3);
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 20, 90_000);
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-scene]")).toBeVisible();
    await expect(page.getByText(/去哪里？|Pegar um táxi/i).first()).toBeVisible();
  });

  test("metro-qr lesson teaches before the task and awards stars without lexical SRS", async ({ page }) => {
    test.setTimeout(90_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/metro-qr");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "metro-qr");
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    const before = await readPersist(page);
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    const persist = await readPersist(page);
    expect(persist.cultureCompletedIds).toContain("metro-qr");
    expect(persist.cultureMasteryById["metro-qr"]?.stars).toBeGreaterThanOrEqual(1);
    expect(Object.keys(persist.srs)).toEqual(Object.keys(before.srs));
  });
});

test.describe("V4.9.8A city mobility 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("station lesson and metro-qr lesson fit the phone viewport", async ({ page }) => {
    test.setTimeout(90_000);
    await seedUnlockedLessonSession(page, "p7-imersao-estacao");
    await page.goto("/licao/p7-imersao-estacao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Imersão: na estação/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 392)).toBe(true);

    await page.goto("/cultura/metro-qr");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "metro-qr");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 392)).toBe(true);
  });
});
