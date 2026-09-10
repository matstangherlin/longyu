import { expect, test, type Page } from "@playwright/test";
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

/** Resume at step 1 so the adaptive planner keeps the authored round (idx > 0). */
async function openAuthoredLessonPlayer(page: Page, lessonId: string) {
  await seedUnlockedLessonSession(page, lessonId, {
    lessonSessionStepById: { [lessonId]: { pass: 1, stepIndex: 1 } },
  });
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
}

test.describe("V4.9.7B shopping survival", () => {
  test("l27 lesson page opens the digital-pay lesson", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l27");
    await page.goto("/licao/l27");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "digital-pay");
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "digital-pay");
  });

  test("p6-compras lesson page opens the bargaining-context lesson", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p6-compras");
    await page.goto("/licao/p6-compras");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "bargaining-context");
  });

  test("p7-imersao-mercado has no culture card", async ({ page }) => {
    await seedUnlockedLessonSession(page, "p7-imersao-mercado");
    await page.goto("/licao/p7-imersao-mercado");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Imersão: no mercado/i })).toBeVisible();
    await expect(page.getByTestId("culture-touchpoint")).toHaveCount(0);
  });

  test("p6-compras player does not inject a bargaining bridge", async ({ page }) => {
    test.setTimeout(120_000);
    await openAuthoredLessonPlayer(page, "p6-compras");
    const reached = await advanceUntilSelector(page, '[data-testid="culture-bridge"]', 12, 25_000);
    expect(reached).toBeFalsy();
    await expect(page.getByTestId("culture-bridge")).toHaveCount(0);
    const after = await readPersist(page);
    expect(after.cultureCompletedIds).not.toContain("bargaining-context");

    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-progress")).toContainText(/0 \/ 19/);
    await expect(page.locator('[data-testid="culture-card"][data-culture-id="bargaining-context"]')).toHaveAttribute(
      "data-culture-status",
      "new"
    );
  });

  test("p7 mercado player reaches a shop conversation", async ({ page }) => {
    test.setTimeout(120_000);
    await openAuthoredLessonPlayer(page, "p7-imersao-mercado");
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 40, 90_000);
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-scene]")).toBeVisible();
  });

  test("digital-pay lesson completes with stars without lexical SRS", async ({ page }) => {
    test.setTimeout(90_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/digital-pay");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "digital-pay");
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    const before = await readPersist(page);
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    const persist = await readPersist(page);
    expect(persist.cultureCompletedIds).toContain("digital-pay");
    expect(persist.cultureMasteryById["digital-pay"]?.stars).toBeGreaterThanOrEqual(1);
    expect(persist.cultureMemoryById["digital-pay-core"]).toBeTruthy();
    expect(Object.keys(persist.srs)).toEqual(Object.keys(before.srs));
  });

  test("bargaining lesson teaches, uses standard tasks, and awards stars", async ({ page }) => {
    test.setTimeout(90_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/bargaining-context");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "bargaining-context");
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    const persist = await readPersist(page);
    expect(persist.cultureCompletedIds).toContain("bargaining-context");
    expect(persist.cultureMasteryById["bargaining-context"]?.stars).toBeGreaterThanOrEqual(1);
  });
});
