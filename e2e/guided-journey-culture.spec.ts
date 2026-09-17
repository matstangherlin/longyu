import { expect, test } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import {
  expandJourneyMap,
  leaveCultureVictory,
  playCultureLessonToVictory,
  readCulturePersist,
} from "./culture-lesson-helpers";

test.describe("RC2.1.1 GuideDialogue", () => {
  test("teach intro: Continuar during typing completes text; second click advances", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedFreshJourneySession(page, { isPremium: true });
    await seedLessonPlayerReady(page, "l1", { isPremium: true, folego: 20 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/licao/l1/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
    const dialogue = page.getByTestId("guide-dialogue");
    await expect(dialogue).toBeVisible({ timeout: 20_000 });
    await expect(dialogue).toHaveAttribute("data-guide-phase", "typing");
    // Entrance may already be ready on fast machines; contract is entering|ready then ready.
    await expect(dialogue).toHaveAttribute("data-guide-motion", /entering|ready/);
    await expect(page.getByTestId("guide-mascot-slot")).toBeVisible();
    await expect(page.getByTestId("guide-speech-box")).toBeVisible();
    await expect.poll(async () => dialogue.getAttribute("data-guide-motion")).toBe("ready");

    const visible = page.getByTestId("guide-visible-text");
    const before = ((await visible.textContent()) ?? "").trim();

    // Continue must work even if entrance just finished / overlapped.
    await page.getByTestId("guide-continue").click();
    await expect(dialogue).toHaveAttribute("data-guide-phase", "complete");
    const after = ((await visible.textContent()) ?? "").trim();
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    expect(after.length).toBeGreaterThan(10);

    const stepBefore = await page.locator("[data-current-step-index]").getAttribute("data-current-step-index");
    await page.waitForTimeout(120);
    await page.getByTestId("guide-continue").click();
    await expect
      .poll(async () => page.locator("[data-current-step-index]").getAttribute("data-current-step-index"))
      .not.toBe(stepBefore);
    // Next message / step must not re-run dialogue entrance from scratch on a still-mounted set.
  });

  test("reduced motion: guide starts complete and motion ready", async ({ page }) => {
    test.setTimeout(60_000);
    await seedFreshJourneySession(page, { isPremium: true });
    await seedLessonPlayerReady(page, "l1", { isPremium: true, folego: 20 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/licao/l1/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
    const dialogue = page.getByTestId("guide-dialogue");
    await expect(dialogue).toBeVisible({ timeout: 20_000 });
    await expect(dialogue).toHaveAttribute("data-guide-phase", "complete");
    await expect(dialogue).toHaveAttribute("data-guide-motion", "ready");
  });

  test("Continue during entrance still completes typing", async ({ page }) => {
    test.setTimeout(60_000);
    await seedFreshJourneySession(page, { isPremium: true });
    await seedLessonPlayerReady(page, "l1", { isPremium: true, folego: 20 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/licao/l1/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const dialogue = page.getByTestId("guide-dialogue");
    await expect(dialogue).toBeVisible({ timeout: 20_000 });
    // Click immediately — do not wait for ready.
    await page.getByTestId("guide-continue").click();
    await expect(dialogue).toHaveAttribute("data-guide-phase", "complete");
    await expect.poll(async () => dialogue.getAttribute("data-guide-motion")).toBe("ready");
  });
});

test.describe("RC2.1.1 Journey Culture Moments", () => {
  test("Journey shows Culture Moment, explore completes Hub+Journey, no XP double", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    // Early anchor: History Timeline after first Mandarin topic — visible without deep scroll.
    await seedUnlockedLessonSession(page, "p1-o-que-e-pinyin", {
      isPremium: true,
      serverIsPro: true,
      folego: 20,
    });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expandJourneyMap(page);

    const moment = page.locator('[data-culture-moment="moment-china-history-timeline"]');
    await moment.scrollIntoViewIfNeeded();
    await expect(moment).toBeVisible({ timeout: 20_000 });
    await expect(moment).toHaveAttribute("data-optional", "true");
    await expect(moment).toHaveAttribute("data-explored", "false");

    await moment.getByTestId("journey-culture-moment-explore").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/culture-china-history-timeline/);
    await expect(page).toHaveURL(/from=/);
    await expect(page.getByTestId("culture-teach")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("guide-dialogue")).toBeVisible();

    const before = await readCulturePersist(page);
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-victory")).toBeVisible();
    const after = await readCulturePersist(page);
    expect(after.completedLessons).toContain("culture-china-history-timeline");
    expect(after.cultureCompletedIds).toContain("china-history-timeline");
    expect(after.points).toBeGreaterThanOrEqual(before.points);

    await leaveCultureVictory(page);
    await page.goto("/jornada?focus=culture-moment%3Amoment-china-history-timeline");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expandJourneyMap(page);
    const doneMoment = page.locator('[data-culture-moment="moment-china-history-timeline"]');
    await expect(doneMoment).toHaveAttribute("data-explored", "true", { timeout: 15_000 });
    await expect(doneMoment.getByTestId("journey-culture-moment-done")).toBeVisible();

    expect(after.cultureCompletedIds).toContain("china-history-timeline");

    const mid = await readCulturePersist(page);
    await page.goto("/licao/culture-china-history-timeline/player?src=jornada&from=%2Fjornada");
    await waitForLazyPage(page);
    await playCultureLessonToVictory(page);
    await leaveCultureVictory(page);
    const again = await readCulturePersist(page);
    expect(again.cultureCompletedIds.filter((id) => id === "china-history-timeline")).toHaveLength(1);
    expect(again.points).toBeGreaterThanOrEqual(mid.points);
  });
});
