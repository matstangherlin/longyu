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

function isCulturePlayerUrl(page: Page) {
  return /\/licao\/culture-[^/]+\/player/.test(page.url());
}

/**
 * Skip-through the canonical LessonPlayer until culture victory.
 * Stays on the culture route: Entendi on intro, Pular on graded steps.
 */
export async function playCultureLessonToVictory(page: Page) {
  await expect(page.getByTestId("culture-item")).toBeVisible({ timeout: 20_000 });
  const victory = page.getByTestId("culture-victory");
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (!isCulturePlayerUrl(page)) {
      throw new Error(`left culture player: ${page.url()}`);
    }
    await dismissBlockingOverlays(page);
    if (await victory.isVisible().catch(() => false)) {
      await dismissBlockingOverlays(page);
      await expect(victory).toBeVisible();
      return;
    }

    const entendi = page.getByRole("button", { name: /^(Entendi|Got it)$/ }).first();
    if (await entendi.isVisible().catch(() => false) && !(await entendi.isDisabled().catch(() => true))) {
      await entendi.click().catch(() => undefined);
      await page.waitForTimeout(120);
      continue;
    }

    const pular = page.getByRole("button", { name: /^(Pular|Skip)/ }).first();
    if (await pular.isVisible().catch(() => false) && !(await pular.isDisabled().catch(() => true))) {
      await pular.click().catch(() => undefined);
      await page.waitForTimeout(120);
      continue;
    }

    const reviewOffer = page.locator("[data-review-offer]");
    const continueBtn = page.getByRole("button", { name: /^(Continuar|Continue)$/ }).first();
    if (
      (await continueBtn.isVisible().catch(() => false)) &&
      !(await continueBtn.isDisabled().catch(() => true)) &&
      (await reviewOffer.count()) === 0
    ) {
      await continueBtn.click().catch(() => undefined);
      await page.waitForTimeout(120);
      continue;
    }

    const option = page.getByRole("button", { name: /^(Opção|Option) \d+:/ }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click().catch(() => undefined);
      const check = page.getByRole("button", { name: /^(Verificar|Check)$/ }).first();
      if (await check.isVisible().catch(() => false) && !(await check.isDisabled().catch(() => true))) {
        await check.click().catch(() => undefined);
      }
      await page.waitForTimeout(150);
      continue;
    }

    const moved = await advanceUntilVisible(page, victory, 2);
    if (moved) continue;
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assembleSentenceBuild(page: Page) {
  const builder = page.locator("[data-sentence-build]").first();
  if (!(await builder.isVisible().catch(() => false))) return false;
  const raw = (await builder.getAttribute("data-target-parts")) ?? "";
  const parts = raw.split("\u001f").filter(Boolean);
  if (parts.length === 0) return false;
  for (const part of parts) {
    const buttons = page.getByRole("button", {
      name: new RegExp(`^(Peça|Piece) \\d+: ${escapeRegExp(part)}$`),
    });
    const count = await buttons.count();
    for (let i = 0; i < count; i += 1) {
      const btn = buttons.nth(i);
      if (await btn.isVisible().catch(() => false) && !(await btn.isDisabled().catch(() => true))) {
        await btn.click().catch(() => undefined);
        break;
      }
    }
  }
  return true;
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

    if (await assembleSentenceBuild(page)) {
      const check = page.getByRole("button", { name: /^(Verificar|Check)$/ }).first();
      if (await check.isVisible().catch(() => false) && !(await check.isDisabled().catch(() => true))) {
        await check.click().catch(() => undefined);
      }
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
