import { expect, test } from "@playwright/test";
import {
  CURRICULUM_FREEZE,
  RC1_EXPECTED_LESSON_COUNT,
  RC1_EXPECTED_TEACHING_TOPIC_COUNT,
  RC_BASE_FINGERPRINT,
} from "../src/lib/curriculumFreeze";
import { ALL_LESSONS } from "../src/data/journey";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  seedOnboardedSession,
  waitForLazyPage,
} from "./helpers";

const crashTitle = /Algo saiu do prumo|Something went off track|Unexpected Application Error/i;

test.describe("RC1 launch surfaces", () => {
  test("freeze contract still matches the shipped Journey", () => {
    expect(CURRICULUM_FREEZE).toBe("RC1");
    expect(RC_BASE_FINGERPRINT).toBe("38e70062857d");
    expect(ALL_LESSONS).toHaveLength(RC1_EXPECTED_LESSON_COUNT);
    expect(
      ALL_LESSONS.filter((lesson) => !lesson.isReview && !lesson.reviewMasteryMode)
    ).toHaveLength(RC1_EXPECTED_TEACHING_TOPIC_COUNT);
  });

  test("jornada, conta and pro render without a page crash", async ({ page }) => {
    await seedOnboardedSession(page, ["l1", "l2", "l3"]);

    for (const route of ["/jornada", "/conta", "/pro"] as const) {
      await page.goto(route);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.getByRole("heading", { name: crashTitle })).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
    }

    await expect(page.getByRole("heading", { name: /Planos|Plans/i }).first()).toBeVisible();
  });

  test("first Journey lesson opens with a first step and a CTA", async ({ page }) => {
    await seedFreshJourneySession(page);
    await seedLessonPlayerReady(page, "l1");
    await page.goto("/licao/l1/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const frame = page.locator("[data-lesson-player-frame]");
    await expect(frame).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: crashTitle })).toHaveCount(0);

    const kind = page.locator("[data-current-step-kind]");
    await expect(kind).toHaveAttribute("data-current-step-kind", /^[a-z][a-z0-9_]*$/);

    const cta = page.locator(
      "[data-lesson-sticky-actions] button:visible, [data-lesson-action-region] button:visible"
    ).first();
    await expect(cta).toBeVisible();
  });
});
