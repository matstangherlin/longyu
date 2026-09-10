import { expect, test } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedInstructionLocale,
  seedInterfaceLocale,
  seedOnboardedSession,
  seedMissionsSession,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";
import {
  expectCultureLessonPlayer,
  leaveCultureVictory,
  playCultureLessonToVictory,
  playCultureReviewToDone,
  readCulturePersist,
} from "./culture-lesson-helpers";

test.describe("V4.9.8A.1 Culture Hub → LessonPlayer", () => {
  test("hub shows next mission, plays the canonical lesson, and persists", async ({ page }) => {
    test.setTimeout(120_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
    await expect(page.getByTestId("culture-progress")).toContainText(/0 \/ 19/);
    await expect(page.getByTestId("culture-next-cta")).toBeVisible();
    await expect(page.getByTestId("culture-seals")).toBeVisible();
    await expect(page.getByTestId("culture-show-categories")).toBeVisible();

    await page.getByTestId("culture-show-categories").click();
    await page.getByTestId("culture-filter-home_visits").click();
    const cards = page.getByTestId("culture-card");
    await expect(cards.first()).toBeVisible();
    await expect(cards).toHaveCount(3);

    await page.locator('[data-testid="culture-card"][data-culture-id="visiting-home"]').locator("a").click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "visiting-home");
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    await expect(page.locator("[data-current-step-kind='intro']")).toBeVisible();

    await playCultureLessonToVictory(page);
    await expect(page.getByTestId("culture-stars")).toBeVisible();
    await expect(page.getByTestId("culture-xp")).toBeVisible();

    const persist = await readCulturePersist(page);
    expect(persist.cultureCompletedIds).toContain("visiting-home");
    expect(persist.completedLessons).toContain("culture-visiting-home");
    expect(persist.cultureMasteryById["visiting-home"]?.stars).toBeGreaterThanOrEqual(1);

    await leaveCultureVictory(page);
    if (!(await page.getByTestId("culture-hub").isVisible().catch(() => false))) {
      await page.goto("/cultura");
    }
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
    await expect(page.getByTestId("culture-progress")).toContainText(/1 \/ 19/);

    await page.getByTestId("culture-show-categories").click();
    const filterAll = page.getByTestId("culture-filter-all");
    if (await filterAll.isVisible().catch(() => false)) await filterAll.click();
    const savedCard = page.locator('[data-testid="culture-card"][data-culture-id="digital-pay"]');
    await savedCard.scrollIntoViewIfNeeded();
    await savedCard.getByTestId("culture-save").click();
    await expect(savedCard.getByTestId("culture-save")).toContainText(/Salvo|Saved/i);

    await page.goto("/cultura");
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-progress")).toContainText(/1 \/ 19/);
    await expect(page.locator('[data-culture-id="visiting-home"]').first()).toHaveAttribute("data-culture-status", "completed");
    await expect(page.locator('[data-culture-id="digital-pay"]').first()).toHaveAttribute("data-culture-status", "in_progress");
  });

  test("PT-BR and EN catalogs render without crashing", async ({ page }) => {
    await seedInterfaceLocale(page, "pt-BR");
    await seedInstructionLocale(page, "pt-BR");
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: "Cultura", exact: true })).toBeVisible();
    await expect(page.getByText(/Missões culturais para agir na China|Entenda a língua/)).toBeVisible();

    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en", { force: true });
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: "Culture", exact: true })).toBeVisible();
    await page.locator('[data-testid="culture-card"][data-culture-id="visiting-home"]').locator("a").click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "visiting-home");
    await expect(page.getByRole("heading", { name: "Arriving at someone's home" })).toBeVisible();
    await expect(page.getByText(/Hosts often guide entry|Guests usually wait/i)).toBeVisible();
  });

  test("invalid culture id does not crash the route", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura/this-item-does-not-exist");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-missing")).toBeVisible();
    await expect(page.getByRole("heading", { name: /não existe|does not exist/i })).toBeVisible();
    await page.getByRole("link", { name: /Voltar à Cultura|Back to Culture/i }).click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
  });

  test("opens a Culture Lesson from a language lesson and returns to that lesson", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l2");
    await page.goto("/licao/l2");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toBeVisible();
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "greetings-nihao");
    await expect(page).toHaveURL(/src=journey/);
    await page.getByTestId("culture-back").click();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/licao\/l2$/);
  });

  test("l26c restaurant touchpoint opens chopsticks-rest in LessonPlayer", async ({ page }) => {
    test.setTimeout(120_000);
    await seedUnlockedLessonSession(page, "l26c");
    await page.goto("/licao/l26c");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-touchpoint")).toHaveAttribute("data-culture-id", "chopsticks-rest");
    await page.getByTestId("culture-touchpoint-open").click();
    await waitForLazyPage(page);
    await expectCultureLessonPlayer(page, "chopsticks-rest");
    await playCultureLessonToVictory(page);
    await leaveCultureVictory(page);
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/licao\/l26c$/);
  });

  test("culture review session does not use lexical SRS chrome", async ({ page }) => {
    test.setTimeout(90_000);
    const due = Date.now() - 60_000;
    await seedMissionsSession(page, {
      isPremium: true,
      serverIsPro: true,
      folego: 20,
      cultureMemoryById: {
        "visiting-home-core": {
          targetId: "visiting-home-core",
          cultureItemId: "visiting-home",
          due,
          stage: 0,
          reps: 0,
          lapses: 0,
          updatedAt: Date.now(),
        },
      },
    });
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-review-card")).toBeVisible();
    await page.getByTestId("culture-review-cta").click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-review")).toBeVisible();
    await playCultureReviewToDone(page);
    await expect(page.getByTestId("culture-review-done")).toBeVisible();
    await expect(page.getByTestId("srs-card")).toHaveCount(0);
  });

  test("lesson player does not show a culture card mid-exercise", async ({ page }) => {
    await seedUnlockedLessonSession(page, "l2");
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
    await expect(page.getByTestId("culture-touchpoint")).toHaveCount(0);
    await expect(page.getByTestId("topic-victory-return")).toHaveCount(0);
    await expect(page.getByTestId("culture-bridge")).toHaveCount(0);
  });
});

test.describe("V4.9.8A.1 Culture teaching loop", () => {
  test("teaches before the first task", async ({ page }) => {
    test.setTimeout(90_000);
    await seedMissionsSession(page, { isPremium: true, serverIsPro: true, folego: 20 });
    await page.goto("/cultura/host-insistence");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expectCultureLessonPlayer(page, "host-insistence");
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    await expect(page.locator("[data-current-step-kind='intro']")).toBeVisible();
    await page.getByRole("button", { name: /^Entendi$|^Got it$/ }).click();
    await expect(page.getByTestId("culture-teach")).toBeVisible();
    await playCultureLessonToVictory(page);
  });

  test("skips teach screens when the Journey already practiced the concept", async ({ page }) => {
    await seedMissionsSession(page, {
      isPremium: true,
      serverIsPro: true,
      folego: 20,
      cultureKnowledgeById: {
        "host-insistence-core": {
          conceptId: "host-insistence-core",
          cultureItemId: "host-insistence",
          state: "practiced",
          source: "journey",
          updatedAt: Date.now(),
        },
      },
    });
    await page.goto("/cultura/host-insistence");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-seen-on-journey")).toBeVisible();
    await expect(page.getByTestId("culture-teach")).toHaveCount(0);
    await expect(page.locator("[data-current-step-kind='intro']")).toHaveCount(0);
  });

  test("language lesson does not inject a culture bridge; Hub still marks Journey-practiced concepts", async ({ page }) => {
    test.setTimeout(90_000);
    await seedUnlockedLessonSession(page, "l2", {
      lessonSessionStepById: { l2: { pass: 1, stepIndex: 6 } },
    });
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
    await advanceUntilVisible(page, page.getByTestId("culture-bridge"), 8);
    await expect(page.getByTestId("culture-bridge")).toHaveCount(0);

    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
  });

  test("Culture Hub marks a concept seen on the Journey", async ({ page }) => {
    await seedMissionsSession(page, {
      cultureKnowledgeById: {
        "shared-dishes-core": {
          conceptId: "shared-dishes-core",
          cultureItemId: "shared-dishes",
          state: "practiced",
          source: "journey",
          updatedAt: Date.now(),
        },
      },
    });
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-node-journey-shared-dishes")).toBeVisible();
    await expect(page.getByTestId("culture-node-shared-dishes")).toHaveAttribute("data-knowledge", "practiced");
  });
});

test.describe("V4.9.8A.1 Culture Hub mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hub and LessonPlayer CTA are tappable at 390×844", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/cultura");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("culture-hub")).toBeVisible();
    const card = page.getByTestId("culture-card").first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    expect((box?.height ?? 0)).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
    await card.locator("a").click();
    await waitForLazyPage(page);
    await expect(page.getByTestId("culture-item")).toBeVisible();
    const cta = page.locator("[data-lesson-action-region] button").first();
    await expect(cta).toBeVisible();
    const ctaBox = await cta.boundingBox();
    expect((ctaBox?.height ?? 0)).toBeGreaterThanOrEqual(40);
  });
});
