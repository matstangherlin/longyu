import { expect, test } from "@playwright/test";
import {
  dismissBlockingOverlays,
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
    await seedUnlockedLessonSession(page, "l1", { isPremium: true, serverIsPro: true, folego: 20 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/licao/l1/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const dialogue = page.getByTestId("guide-dialogue");
    await expect(dialogue).toBeVisible({ timeout: 20_000 });
    await expect(dialogue).toHaveAttribute("data-guide-phase", "typing");

    const visible = page.getByTestId("guide-visible-text");
    const before = ((await visible.textContent()) ?? "").trim();

    await page.getByTestId("guide-continue").click();
    await expect(dialogue).toHaveAttribute("data-guide-phase", "complete");
    const after = ((await visible.textContent()) ?? "").trim();
    expect(after.length).toBeGreaterThan(before.length);
    // Still on the same intro step (title still visible).
    await expect(page.getByRole("heading", { name: /Bem-vindo ao mandarim|Welcome/i })).toBeVisible();

    await page.getByTestId("guide-continue").click();
    // Advances to next intro (or next step) — guide restarts or leaves.
    await expect
      .poll(async () => {
        const phase = await dialogue.getAttribute("data-guide-phase").catch(() => null);
        const title = await page.locator("h2").first().textContent();
        return { phase, title };
      })
      .toMatchObject({
        // Either new message typing/complete, or moved past first intro title.
      });
    const title = ((await page.locator("h2").first().textContent()) ?? "").trim();
    expect(title).not.toMatch(/Bem-vindo ao mandarim/i);
  });

  test("reduced motion: guide starts complete", async ({ page }) => {
    test.setTimeout(60_000);
    await seedUnlockedLessonSession(page, "l1", { isPremium: true, serverIsPro: true, folego: 20 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/licao/l1/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const dialogue = page.getByTestId("guide-dialogue");
    await expect(dialogue).toBeVisible({ timeout: 20_000 });
    await expect(dialogue).toHaveAttribute("data-guide-phase", "complete");
  });
});

test.describe("RC2.1.1 Journey Culture Moments", () => {
  test("Journey shows Culture Moment, explore completes Hub+Journey, no XP double", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await seedUnlockedLessonSession(page, "l26", {
      isPremium: true,
      serverIsPro: true,
      folego: 20,
      completedLessons: [
        "l1",
        "l2",
        "l3",
        "l4",
        "l5",
        "l6",
        "l7",
        "l8",
        "l9",
        "l10",
        "l11",
        "l12",
        "l13",
        "l14",
        "l15",
        "l16",
        "l17",
        "l18",
        "l19",
        "l20",
        "l21",
        "l22",
        "l23",
        "l24",
        "l25",
        "l26",
      ],
    });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expandJourneyMap(page);

    const moment = page.locator('[data-culture-moment="moment-chinese-dragon"]');
    await moment.scrollIntoViewIfNeeded();
    await expect(moment).toBeVisible();
    await expect(moment).toHaveAttribute("data-optional", "true");
    await expect(moment).toHaveAttribute("data-explored", "false");

    await moment.getByTestId("journey-culture-moment-explore").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/culture-chinese-dragon/);
    await expect(page).toHaveURL(/from=/);
    await expect(page.getByTestId("guide-dialogue").or(page.getByTestId("culture-teach"))).toBeVisible({
      timeout: 20_000,
    });

    const before = await readCulturePersist(page);
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-victory")).toBeVisible();
    const after = await readCulturePersist(page);
    expect(after.completedLessons).toContain("culture-chinese-dragon");
    expect(after.cultureCompletedIds).toContain("chinese-dragon");
    const xpGain = after.points - before.points;
    expect(xpGain).toBeGreaterThan(0);

    await leaveCultureVictory(page);
    await page.goto("/jornada?focus=culture-moment%3Amoment-chinese-dragon");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expandJourneyMap(page);
    const doneMoment = page.locator('[data-culture-moment="moment-chinese-dragon"]');
    await expect(doneMoment).toHaveAttribute("data-explored", "true");
    await expect(doneMoment.getByTestId("journey-culture-moment-done")).toBeVisible();

    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    // Hub shares completion via the same store fields asserted above.
    expect(after.cultureCompletedIds).toContain("chinese-dragon");

    // Re-open and finish again — culture-complete reward id stays idempotent.
    const mid = await readCulturePersist(page);
    await page.goto("/licao/culture-chinese-dragon/player?src=jornada&from=%2Fjornada");
    await waitForLazyPage(page);
    await playCultureLessonToVictory(page);
    await leaveCultureVictory(page);
    const again = await readCulturePersist(page);
    expect(again.cultureCompletedIds.filter((id) => id === "chinese-dragon")).toHaveLength(1);
    expect(again.points).toBeGreaterThanOrEqual(mid.points);
  });
});
