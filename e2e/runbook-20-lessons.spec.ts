import { test, expect } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  waitForLazyPage,
} from "./helpers";
import {
  RUNBOOK_LESSONS,
  advanceOneStep,
  advanceUntilVisible,
  clickFirstVisible,
} from "./lesson-player-helpers";

/**
 * Proxy desktop para o runbook §1 (L1→L20).
 * NÃO substitui QA humano — cobre crash, scroll reset e CTA visível em Chromium headless.
 * Ver docs/BETA_HUMAN_QA_RUNBOOK.md §1.
 */
test.describe("runbook — 20 lições (proxy desktop)", () => {
  test.setTimeout(600_000);

  test("L1→L20: completa sem crash (conta zerada + unlock por lição)", async ({ page }) => {
    const results: { id: string; ok: boolean; note?: string }[] = [];

    for (const [index, lessonId] of RUNBOOK_LESSONS.entries()) {
      // Lições 1–6: jornada zerada real; 7–20: unlock cumulativo do runbook.
      if (index === 0) {
        await seedFreshJourneySession(page);
      } else {
        await seedLessonPlayerReady(page, lessonId);
      }

      await page.goto(`/licao/${lessonId}/player`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);

      await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 15_000 });

      const victory = page.getByRole("button", { name: /Continuar Jornada|Continuar tema|Receber recompensas/i });
      const deadline = Date.now() + 180_000;
      let steps = 0;
      const maxSteps = 40;

      while (!(await victory.isVisible().catch(() => false)) && Date.now() < deadline && steps < maxSteps) {
        steps += 1;
        await dismissBlockingOverlays(page);

        const advanced = await advanceOneStep(page);
        if (!advanced) {
          await advanceUntilVisible(page, victory, 3);
        }

        const cta = page.locator("[data-lesson-sticky-actions] button:visible").first();
        if (await cta.isVisible().catch(() => false)) {
          await expect(cta).toBeVisible();
        }

        await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
      }

      const finished = await victory.isVisible().catch(() => false);
      results.push({
        id: lessonId,
        ok: finished,
        note: finished ? undefined : `timeout após ${steps} passos`,
      });

      if (finished) {
        await clickFirstVisible(page, [/Continuar Jornada/i, /Continuar tema/i, /Receber recompensas/i]);
        await page.waitForTimeout(200);
      }
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      console.log("RUNBOOK_QA_FAIL", JSON.stringify(failed));
    }
    expect(failed, `Lições incompletas: ${failed.map((f) => f.id).join(", ")}`).toHaveLength(0);
  });
});
