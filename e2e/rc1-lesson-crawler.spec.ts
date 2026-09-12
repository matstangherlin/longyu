import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import { TONE_TRAINER_PACKS } from "../src/data/toneTrainer";
import { RC1_EXPECTED_LESSON_COUNT } from "../src/lib/curriculumFreeze";
import { dismissBlockingOverlays, waitForLazyPage } from "./helpers";

const crashTitle = /Algo saiu do prumo|Something went off track|Unexpected Application Error/i;
const SHARDS = 4;

function completedToneTrainer() {
  const now = Date.now();
  return Object.fromEntries(
    TONE_TRAINER_PACKS.map((pack) => [
      pack.id,
      {
        packId: pack.id,
        attempts: 1,
        bestScore: 12,
        bestTotal: 12,
        completed: true,
        lastAttemptAt: now,
        totalRounds: 12,
        totalCorrect: 12,
        errorsByTone: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    ])
  );
}

async function seedCrawler(page: Page, firstLessonId: string) {
  const ids = ALL_LESSONS.map((lesson) => lesson.id);
  await page.addInitScript(
    ({
      ids: lessonIds,
      firstId,
      toneTrainer,
    }: {
      ids: string[];
      firstId: string;
      toneTrainer: Record<string, unknown>;
    }) => {
      if (!sessionStorage.getItem("rc1-crawl-lesson")) {
        sessionStorage.setItem("rc1-crawl-lesson", firstId);
      }
      const target = sessionStorage.getItem("rc1-crawl-lesson") ?? firstId;
      const index = lessonIds.indexOf(target);
      const completedLessons = index > 0 ? lessonIds.slice(0, index) : [];
      const now = Date.now();
      const lessonMasteryById: Record<
        string,
        { level: number; passCount: number; lastPass: number; recoveryPending: boolean; updatedAt: number }
      > = {};
      for (const id of completedLessons) {
        lessonMasteryById[id] = {
          level: 4,
          passCount: 4,
          lastPass: 4,
          recoveryPending: false,
          updatedAt: now,
        };
      }
      localStorage.setItem("longyu:e2e-allow-local", "1");
      if (localStorage.getItem("longyu:telemetry-consent") === null) {
        localStorage.setItem("longyu:telemetry-consent", "0");
      }
      localStorage.setItem(
        "longyu-v1",
        JSON.stringify({
          state: {
            accountSetupComplete: true,
            completedLessons,
            lessonStarsById: Object.fromEntries(completedLessons.map((id) => [id, 3])),
            lessonMasteryById,
            isPremium: true,
            serverIsPro: true,
            points: 40,
            folego: 20,
            holdAchievementModals: true,
            toneTrainer,
            achievementsUnlocked: { "jornada-primeira-licao": now },
          },
          version: 21,
        })
      );
    },
    { ids, firstId: firstLessonId, toneTrainer: completedToneTrainer() }
  );
}

async function crawlLesson(page: Page, lessonId: string) {
  await page.evaluate((id) => sessionStorage.setItem("rc1-crawl-lesson", id), lessonId);
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
    test(`opens first step of shard ${shard + 1}/${SHARDS} (${slice.length} lessons)`, async ({ page }) => {
      test.setTimeout(900_000);
      expect(slice.length).toBeGreaterThan(0);
      await seedCrawler(page, slice[0].id);

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
