import { expect, test } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import { RC1_EXPECTED_LESSON_COUNT } from "../src/lib/curriculumFreeze";
import {
  dismissBlockingOverlays,
  seedLessonPlayerReady,
  waitForLazyPage,
} from "./helpers";

const crashTitle = /Algo saiu do prumo|Something went off track|Unexpected Application Error/i;
const SHARDS = 4;

async function crawlLesson(
  page: import("@playwright/test").Page,
  lessonId: string
) {
  await seedLessonPlayerReady(page, lessonId, { isPremium: true, folego: 20 });
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);

  const frame = page.locator("[data-lesson-player-frame]");
  await expect(frame, lessonId).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: crashTitle }), lessonId).toHaveCount(0);
  await expect(page.locator("body"), lessonId).not.toContainText("Unexpected Application Error");

  const kind = await page.locator("[data-current-step-kind]").getAttribute("data-current-step-kind");
  expect(kind, `${lessonId} first step`).toMatch(/^[a-z][a-z0-9_]*$/);

  const sticky = page.locator(
    "[data-lesson-sticky-actions] button:visible, [data-lesson-action-region] button:visible"
  );
  const named = page.getByRole("button", {
    name: /Continuar|Verificar|Entendi|Ouvir|Falar|Got it|Continue|Check|Listen|Speak/i,
  });
  const ctaVisible =
    (await sticky.first().isVisible().catch(() => false)) ||
    (await named.first().isVisible().catch(() => false));
  expect(ctaVisible, `${lessonId} CTA`).toBe(true);
}

test.describe("RC1 134-lesson crawler", () => {
  test("catalog is the frozen 134-lesson Journey", () => {
    expect(ALL_LESSONS).toHaveLength(RC1_EXPECTED_LESSON_COUNT);
  });

  for (let shard = 0; shard < SHARDS; shard += 1) {
    const slice = ALL_LESSONS.filter((_, index) => index % SHARDS === shard);
    test(`opens first step of shard ${shard + 1}/${SHARDS} (${slice.length} lessons)`, async ({
      page,
    }) => {
      test.setTimeout(900_000);
      expect(slice.length).toBeGreaterThan(0);

      const failed: { id: string; note: string }[] = [];
      for (const lesson of slice) {
        try {
          await crawlLesson(page, lesson.id);
        } catch (error) {
          failed.push({
            id: lesson.id,
            note: error instanceof Error ? error.message.split("\n")[0] ?? "failed" : String(error),
          });
        }
      }

      if (failed.length > 0) {
        console.log("RC1_CRAWLER_FAIL", JSON.stringify(failed));
      }
      expect(failed, `first-step failures: ${failed.map((row) => row.id).join(", ")}`).toHaveLength(0);
    });
  }
});
