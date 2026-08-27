import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import {
  dismissBlockingOverlays,
  seedTopicMasterySession,
  waitForLazyPage,
} from "./helpers";

const FIRST = ALL_LESSONS[0];
const SECOND = ALL_LESSONS[1];

async function masteryLevel(page: Page, lessonId: string): Promise<number> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw) as {
        state?: { lessonMasteryById?: Record<string, { level?: number }> };
      };
      return parsed.state?.lessonMasteryById?.[id]?.level ?? 0;
    } catch {
      return 0;
    }
  }, lessonId);
}

test.describe("V4.7.4 Topic Mastery hardening", () => {
  test("1/4 permanece no mesmo nó; próximo tema bloqueado", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const current = page.locator('[aria-current="step"]');
    await expect(current).toHaveAttribute("data-lesson-id", FIRST.id);
    await expect(current).toHaveAttribute("data-topic-progress", "1/4");

    await page.goto(`/licao/${SECOND.id}`);
    await waitForLazyPage(page);
    await expect(page.getByText(/4 lições|4\/4|bloquead|liberar este tema/i).first()).toBeVisible();
  });

  test("reload no meio da pass não muda 1/4", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto(`/licao/${FIRST.id}/player`);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    expect(await masteryLevel(page, FIRST.id)).toBe(1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
  });

  test("back do navegador volta à Jornada em 1/4", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.goto(`/licao/${FIRST.id}/player`);
    await waitForLazyPage(page);
    await page.goBack();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/jornada/);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
  });

  test("dupla conclusão de M1 não vira 2/4", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await page.evaluate((lessonId) => {
      const raw = localStorage.getItem("longyu-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        state?: { lessonMasteryById?: Record<string, { level?: number; passCount?: number; lastPass?: number }> };
        version?: number;
      };
      const current = parsed.state?.lessonMasteryById?.[lessonId];
      if (!current) return;
      parsed.state!.lessonMasteryById![lessonId] = {
        ...current,
        level: Math.max(current.level ?? 1, 1),
        passCount: (current.passCount ?? 1) + 1,
        lastPass: 1,
      };
      localStorage.setItem("longyu-v1", JSON.stringify(parsed));
    }, FIRST.id);
    await page.reload();
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
    expect(await masteryLevel(page, FIRST.id)).toBe(1);
  });

  test("rede offline temporária preserva 1/4", async ({ page, context }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await context.setOffline(true);
    try {
      await page.reload({ waitUntil: "domcontentloaded" }).catch(async () => {
        await page.goto("/jornada", { waitUntil: "domcontentloaded" });
      });
      await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
    } finally {
      await context.setOffline(false);
    }
  });

  test("3/4 ainda bloqueia o próximo; 4/4 destrava", async ({ page }) => {
    await seedTopicMasterySession(page, 3);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "3/4");
    await page.goto(`/licao/${SECOND.id}`);
    await waitForLazyPage(page);
    await expect(page.getByText(/4 lições|4\/4|bloquead|liberar este tema/i).first()).toBeVisible();

    await seedTopicMasterySession(page, 4);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const firstNode = page.locator(`[data-lesson-id="${FIRST.id}"]`).first();
    await expect(firstNode).toHaveAttribute("data-topic-progress", "4/4");
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "0/4");
  });
});
