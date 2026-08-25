import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedOnboardedSession,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, advanceUntilVisible } from "./lesson-player-helpers";
import { ALL_LESSONS } from "../src/data/journey";

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

async function noOverlap(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "viewport sem overflow horizontal").toBeLessThanOrEqual(2);
}

async function completeCurrentPass(page: Page, lessonId: string, targetLevel: number) {
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const victory = page.getByRole("button", { name: /Continuar Jornada|Receber recompensas|Continuar/i });
  const deadline = Date.now() + 90_000;
  for (let steps = 0; steps < 60 && Date.now() < deadline; steps += 1) {
    const level = await masteryLevel(page, lessonId);
    if (level >= targetLevel) return;
    await dismissBlockingOverlays(page);
    if (await victory.first().isVisible().catch(() => false)) {
      await victory.first().click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(250);
      continue;
    }
    const advanced = await advanceOneStep(page);
    if (!advanced) await advanceUntilVisible(page, victory, 2);
  }
  expect(await masteryLevel(page, lessonId), `pass deve chegar a mastery ${targetLevel}`).toBeGreaterThanOrEqual(
    targetLevel
  );
}

test.describe("V4.6 Topic Mastery Path", () => {
  test("anel 0/4 → 4/4 destrava o próximo tema (desktop)", async ({ page }) => {
    test.setTimeout(240_000);
    await seedFreshJourneySession(page, { isPremium: true, points: 40 });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const current = page.locator('[aria-current="step"]');
    await expect(current).toHaveAttribute("data-topic-progress", "0/4");
    await expect(page.getByText("0/4").first()).toBeVisible();

    await page.goto(`/licao/${FIRST.id}`);
    await waitForLazyPage(page);
    await expect(page.getByTestId("topic-pass-label")).toContainText("Lição 1 de 4");
    await expect(page.getByText(/Descoberta/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Começar/ })).toBeVisible();

    await completeCurrentPass(page, FIRST.id, 1);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "1/4");

    await page.goto(`/licao/${SECOND.id}`);
    await waitForLazyPage(page);
    await expect(page.getByText(/4 lições|4\/4|bloquead|liberar este tema/i).first()).toBeVisible();

    await completeCurrentPass(page, FIRST.id, 2);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "2/4");

    await completeCurrentPass(page, FIRST.id, 3);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "3/4");

    await completeCurrentPass(page, FIRST.id, 4);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const firstNode = page.locator(`[aria-label*="${FIRST.title}"]`).first();
    await expect(firstNode).toHaveAttribute("data-topic-progress", "4/4");
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "0/4");

    await page.goto(`/licao/${SECOND.id}`);
    await waitForLazyPage(page);
    await expect(page.getByTestId("topic-pass-label")).toContainText("Lição 1 de 4");
    await expect(page.getByRole("button", { name: /Começar/ })).toBeVisible();
  });

  test("anel 0/4 visível no mobile e o card cabe o título longo", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 320, height: 568 });
    await seedFreshJourneySession(page);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator('[aria-current="step"]')).toHaveAttribute("data-topic-progress", "0/4");
    await noOverlap(page);

    await page.goto(`/licao/${FIRST.id}`);
    await waitForLazyPage(page);
    await expect(page.getByRole("heading", { level: 1, name: FIRST.title })).toBeVisible();
    await expect(page.getByTestId("topic-pass-label")).toContainText("Lição 1 de 4 · Descoberta");
    await noOverlap(page);
  });
});

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

test.describe("V4.6 Topic Mastery viewports", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}x${viewport.height} sem overlap no detalhe`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedOnboardedSession(page, []);
      await page.goto(`/licao/${FIRST.id}`);
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByTestId("topic-pass-label")).toBeVisible();
      await noOverlap(page);
    });
  }
});
