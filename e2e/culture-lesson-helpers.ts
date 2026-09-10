import { expect, type Page } from "@playwright/test";
import { dismissBlockingOverlays } from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";

export type CulturePersistSlice = {
  srs: Record<string, unknown>;
  points: number;
  completedLessons: string[];
  cultureCompletedIds: string[];
  cultureMasteryById: Record<string, { stars?: number; completed?: boolean }>;
  cultureMemoryById: Record<string, unknown>;
  cultureKnowledgeById: Record<string, { state?: string; source?: string }>;
  cultureSavedIds: string[];
  cultureStartedIds: string[];
};

export async function readCulturePersist(page: Page): Promise<CulturePersistSlice> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("longyu-v1");
    const parsed = raw
      ? (JSON.parse(raw) as { state?: CulturePersistSlice } & CulturePersistSlice)
      : ({ state: {} } as { state?: CulturePersistSlice } & CulturePersistSlice);
    const state = parsed.state ?? parsed;
    return {
      srs: state.srs ?? {},
      points: state.points ?? 0,
      completedLessons: state.completedLessons ?? [],
      cultureCompletedIds: state.cultureCompletedIds ?? [],
      cultureMasteryById: state.cultureMasteryById ?? {},
      cultureMemoryById: state.cultureMemoryById ?? {},
      cultureKnowledgeById: state.cultureKnowledgeById ?? {},
      cultureSavedIds: state.cultureSavedIds ?? [],
      cultureStartedIds: state.cultureStartedIds ?? [],
    };
  });
}

export async function expectCultureLessonPlayer(page: Page, itemId: string) {
  await expect(page).toHaveURL(new RegExp(`/licao/culture-${itemId}/player`));
  const frame = page.getByTestId("culture-item");
  await expect(frame).toBeVisible({ timeout: 20_000 });
  await expect(frame).toHaveAttribute("data-culture-id", itemId);
  await expect(frame).toHaveAttribute("data-lesson-domain", "culture");
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
}

export async function expandJourneyMap(page: Page) {
  const expand = page.getByRole("button", { name: /^(Ver tudo|See all)$/i });
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await page.waitForTimeout(200);
  }
}

/**
 * Skip-through the canonical LessonPlayer until culture victory.
 * Prefers Entendi / Verificar / Continuar; uses Pular on graded steps.
 */
export async function playCultureLessonToVictory(page: Page) {
  await expect(page.getByTestId("culture-item")).toBeVisible({ timeout: 20_000 });
  const victory = page.getByTestId("culture-victory");
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await dismissBlockingOverlays(page);
    if (await victory.isVisible().catch(() => false)) {
      await dismissBlockingOverlays(page);
      await expect(victory).toBeVisible();
      return;
    }
    const moved = await advanceUntilVisible(page, victory, 4);
    if (moved) {
      await dismissBlockingOverlays(page);
      await expect(victory).toBeVisible({ timeout: 8_000 });
      return;
    }
  }
  await expect(victory).toBeVisible({ timeout: 5_000 });
}

/**
 * Victory CTA may first claim Qi, then show a streak card. Keep clicking until
 * the culture player route is gone.
 */
export async function leaveCultureVictory(page: Page) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    await dismissBlockingOverlays(page);
    if (!/\/licao\/culture-[^/]+\/player/.test(page.url())) return;

    const back = page.getByTestId("culture-back-journey");
    if (await back.isVisible().catch(() => false)) {
      try {
        await back.click({ timeout: 3_000 });
      } catch {
        await dismissBlockingOverlays(page);
        await back.click({ force: true, timeout: 2_000 }).catch(() => undefined);
      }
      await page.waitForTimeout(220);
      continue;
    }

    const continueBtn = page
      .getByRole("button", {
        name: /Receber recompensas|Claim rewards|Continuar Jornada|Continue Journey|Voltar à Jornada|Back to the Journey|Continuar na jornada/i,
      })
      .first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click({ timeout: 3_000 }).catch(() => undefined);
      await page.waitForTimeout(220);
      continue;
    }
    break;
  }
}

export async function playCultureReviewToDone(page: Page) {
  const done = page.getByTestId("culture-review-done");
  for (let i = 0; i < 40; i += 1) {
    await dismissBlockingOverlays(page);
    if (await done.isVisible().catch(() => false)) return;

    const continueBtn = page.getByRole("button", { name: /^(Continuar|Continue)$/ }).first();
    if (await continueBtn.isVisible().catch(() => false) && !(await continueBtn.isDisabled().catch(() => true))) {
      await continueBtn.click().catch(() => undefined);
      await page.waitForTimeout(180);
      continue;
    }

    const tryAgain = page.getByRole("button", { name: /^(Tentar de novo|Try again)$/ }).first();
    if (await tryAgain.isVisible().catch(() => false)) {
      await tryAgain.click().catch(() => undefined);
      await page.waitForTimeout(150);
    }

    const options = page.getByRole("button", { name: /^(Opção|Option) \d+:/ });
    const optionCount = await options.count();
    if (optionCount > 0) {
      const pick = options.nth(i % optionCount);
      if (await pick.isVisible().catch(() => false) && !(await pick.isDisabled().catch(() => true))) {
        await pick.click().catch(() => undefined);
      }
      const check = page.getByRole("button", { name: /^(Verificar|Check)$/ }).first();
      if (await check.isVisible().catch(() => false) && !(await check.isDisabled().catch(() => true))) {
        await check.click().catch(() => undefined);
      }
      await page.waitForTimeout(180);
      continue;
    }

    const seq = page.locator('[data-testid^="culture-seq-"]');
    if ((await seq.count()) > 0) {
      while ((await seq.count()) > 0) {
        const next = seq.first();
        if (!(await next.isVisible().catch(() => false))) break;
        await next.click().catch(() => undefined);
        await page.waitForTimeout(80);
      }
      const complete = page.getByTestId("culture-complete");
      if (await complete.isVisible().catch(() => false)) await complete.click().catch(() => undefined);
      await page.waitForTimeout(180);
      continue;
    }

    const complete = page.getByTestId("culture-complete");
    if (await complete.isVisible().catch(() => false) && !(await complete.isDisabled().catch(() => true))) {
      await complete.click().catch(() => undefined);
      await page.waitForTimeout(180);
      continue;
    }

    await advanceUntilVisible(page, done, 2);
  }
  await expect(done).toBeVisible({ timeout: 10_000 });
}
