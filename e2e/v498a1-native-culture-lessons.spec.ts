import { expect, test } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedInstructionLocale,
  seedInterfaceLocale,
  seedMissionsSession,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import {
  expectCultureLessonPlayer,
  expandJourneyMap,
  leaveCultureVictory,
  playCultureLessonToVictory,
  playCultureReviewToDone,
  readCulturePersist,
} from "./culture-lesson-helpers";

test.describe("V4.9.8A.1 Native Culture Lessons", () => {
  test("Journey CORE node opens the same LessonPlayer as the Hub", async ({ page }) => {
    test.setTimeout(120_000);
    await seedUnlockedLessonSession(page, "l3", { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expandJourneyMap(page);

    const node = page.locator('[data-journey-inline-node="culture:greetings-nihao"]');
    await node.scrollIntoViewIfNeeded();
    await expect(node).toBeVisible();
    await expect(node).toHaveAttribute("data-ready", "true");
    await expect(node).toContainText(/Cultura|Culture/);
    await node.click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "greetings-nihao");
    await expect(page).toHaveURL(/src=jornada/);
    await expect(page.getByTestId("culture-teach")).toBeVisible();

    await page.getByTestId("culture-sources-open").click();
    await expect(page.getByTestId("culture-sources")).toBeVisible();

    const before = await readCulturePersist(page);
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-victory")).toBeVisible();
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    await expect(page.getByTestId("culture-xp")).toBeVisible();

    const after = await readCulturePersist(page);
    expect(after.completedLessons).toContain("culture-greetings-nihao");
    expect(after.cultureCompletedIds).toContain("greetings-nihao");
    expect(Object.keys(after.srs)).toEqual(Object.keys(before.srs));

    await leaveCultureVictory(page);
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/jornada/);

    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-progress")).toContainText(/1 \/ 19/);
    await expect(page.locator('[data-culture-id="greetings-nihao"]').first()).toHaveAttribute(
      "data-culture-status",
      "completed"
    );

    await page.reload();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-progress")).toContainText(/1 \/ 19/);
  });

  test("Hub shortcut and language touchpoint open the same canonical player", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l3");
    await page.goto("/cultura/greetings-nihao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "greetings-nihao");
    await expect(page).toHaveURL(/src=cultura/);
    await page.getByTestId("culture-back").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/cultura$/);
  });

  test("wrong answer shows recovery, then victory still completes Hub + Journey", async ({ page }) => {
    test.setTimeout(120_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/visiting-home");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "visiting-home");

    const wrong = page.getByRole("button", {
      name: /Circular a casa|Sentar na cama|Walk the whole house|Sit on the bedroom/i,
    });
    for (let i = 0; i < 8; i += 1) {
      if (await wrong.first().isVisible().catch(() => false)) break;
      await page.getByRole("button", { name: /^(Entendi|Got it)$/ }).click().catch(() => undefined);
      await page.waitForTimeout(150);
    }
    await expect(wrong.first()).toBeVisible({ timeout: 10_000 });
    await wrong.first().click();
    await page.getByRole("button", { name: /^(Verificar|Check)$/ }).click();
    const mistake = page.getByRole("heading", { name: /Quer tentar de novo|Want to try again/i });
    await expect(mistake).toBeVisible({ timeout: 8_000 });
    await page.getByRole("dialog", { name: /Quer tentar de novo|Want to try again/i }).getByRole("button", { name: /^(Continuar|Continue)$/ }).click();
    await playCultureLessonToVictory(page);

    const persist = await readCulturePersist(page);
    expect(persist.completedLessons).toContain("culture-visiting-home");
    expect(persist.cultureCompletedIds).toContain("visiting-home");
  });

  test("replay does not grant duplicate lesson XP", async ({ page }) => {
    test.setTimeout(120_000);
    await seedMissionsSession(page, {
      isPremium: true,
      serverIsPro: true,
      folego: 20,
      completedLessons: ["l1", "culture-thanks-keqi"],
      cultureCompletedIds: ["thanks-keqi"],
      lessonStarsById: { "culture-thanks-keqi": 3 },
      points: 40,
    });
    await page.goto("/licao/culture-thanks-keqi/player?src=cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "thanks-keqi");
    const persistBefore = await readCulturePersist(page);
    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-xp")).toContainText("+0");
    const persistAfter = await readCulturePersist(page);
    expect(persistAfter.points).toBe(persistBefore.points);
  });

  test("EXPLORE node stays labelled Explore after the related language topic", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l9");
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expandJourneyMap(page);
    const explore = page.locator('[data-journey-inline-node="culture:gift-receiving"]');
    await explore.scrollIntoViewIfNeeded();
    await expect(explore).toBeVisible();
    await expect(explore).toContainText(/Explorar|Explore/);
  });

  test("PT and EN instruction overlays both render the native lesson", async ({ page }) => {
    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en", { force: true });
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/greetings-nihao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/🏮 CULTURE/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /hello|你好|nǐ hǎo/i }).first()).toBeVisible();
  });

  test("culture review uses StepRenderer and never lexical SRS", async ({ page }) => {
    test.setTimeout(90_000);
    const due = Date.now() - 60_000;
    await seedMissionsSession(page, {
      isPremium: true,
      serverIsPro: true,
      cultureMemoryById: {
        "thanks-keqi-core": {
          targetId: "thanks-keqi-core",
          cultureItemId: "thanks-keqi",
          due,
          stage: 1,
          reps: 1,
          lapses: 0,
          updatedAt: Date.now(),
        },
      },
    });
    await page.goto("/cultura/revisao");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-review")).toBeVisible();
    await playCultureReviewToDone(page);
    await expect(page.getByTestId("srs-card")).toHaveCount(0);
  });
});

test.describe("V4.9.8A.1 Native Culture Lessons 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Journey node and LessonPlayer fit the phone viewport", async ({ page }) => {
    test.setTimeout(90_000);
    await seedUnlockedLessonSession(page, "l3");
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const node = page.locator('[data-journey-inline-node="culture:greetings-nihao"]');
    await node.scrollIntoViewIfNeeded();
    await expect(node).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 392)).toBe(true);

    await node.click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "greetings-nihao");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 392)).toBe(true);
    const cta = page.locator("[data-lesson-action-region] button").first();
    await expect(cta).toBeVisible();
    expect((await cta.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(40);
  });
});
