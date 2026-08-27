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
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
    await context.setOffline(true);
    try {
      await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
      await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-lesson-id", FIRST.id);
    } finally {
      await context.setOffline(false);
    }
    await page.reload();
    await waitForLazyPage(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
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

  test("forward do navegador não muda mastery", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.goto(`/licao/${FIRST.id}/player`);
    await waitForLazyPage(page);
    await page.goBack();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(/\/jornada/);
    await page.goForward();
    await waitForLazyPage(page);
    await expect(page).toHaveURL(new RegExp(`/licao/${FIRST.id}/player`));
    expect(await masteryLevel(page, FIRST.id)).toBe(1);
  });

  test("duplo clique no nó atual não avança mastery", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const current = page.locator('[aria-current="step"]');
    await current.dblclick();
    await waitForLazyPage(page);
    expect(await masteryLevel(page, FIRST.id)).toBe(1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
  });

  test("reload após resposta na pass preserva 1/4", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto(`/licao/${FIRST.id}/player`);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const option = page.locator("[data-option-index]").first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForLazyPage(page);
    expect(await masteryLevel(page, FIRST.id)).toBe(1);
  });

  test("rehidratação mock (logout/login local) preserva 1/4", async ({ page }) => {
    await seedTopicMasterySession(page, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.evaluate(() => {
      localStorage.removeItem("longyu:e2e-session-audience");
    });
    await page.reload();
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");
    expect(await masteryLevel(page, FIRST.id)).toBe(1);
  });

  test("rewardHistory existente não duplica Qi da mesma lição", async ({ page }) => {
    await seedTopicMasterySession(page, 1, {
      points: 40,
      rewardHistory: [{ id: "lesson:p1-o-que-e-mandarim:qi", type: "qi", amount: 5, claimedAt: Date.now() }],
    });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    const before = await page.evaluate(() => {
      const raw = localStorage.getItem("longyu-v1");
      const parsed = raw ? JSON.parse(raw) as { state?: { points?: number; rewardHistory?: { id: string }[] } } : {};
      return {
        points: parsed.state?.points ?? 0,
        rewards: (parsed.state?.rewardHistory ?? []).filter((item) => item.id === "lesson:p1-o-que-e-mandarim:qi").length,
      };
    });
    await page.reload();
    await waitForLazyPage(page);
    const after = await page.evaluate(() => {
      const raw = localStorage.getItem("longyu-v1");
      const parsed = raw ? JSON.parse(raw) as { state?: { points?: number; rewardHistory?: { id: string }[] } } : {};
      return {
        points: parsed.state?.points ?? 0,
        rewards: (parsed.state?.rewardHistory ?? []).filter((item) => item.id === "lesson:p1-o-que-e-mandarim:qi").length,
      };
    });
    expect(after.rewards).toBe(1);
    expect(after.points).toBe(before.points);
  });
});
