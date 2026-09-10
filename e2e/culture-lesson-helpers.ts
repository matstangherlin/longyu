import { expect, type Page } from "@playwright/test";
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

/**
 * Skip-through the canonical LessonPlayer until culture victory.
 * Prefers Entendi / Verificar / Continuar; uses Pular on graded steps.
 */
export async function playCultureLessonToVictory(page: Page) {
  await expect(page.getByTestId("culture-item")).toBeVisible({ timeout: 20_000 });
  const victory = page.getByTestId("culture-victory");
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await victory.isVisible().catch(() => false)) return;
    const moved = await advanceUntilVisible(page, victory, 2);
    if (moved) return;
  }
  await expect(victory).toBeVisible({ timeout: 5_000 });
}

export async function playCultureReviewToDone(page: Page) {
  const done = page.getByTestId("culture-review-done");
  for (let i = 0; i < 20; i += 1) {
    if (await done.isVisible().catch(() => false)) return;
    await advanceUntilVisible(page, done, 6);
  }
  await expect(done).toBeVisible({ timeout: 10_000 });
}
