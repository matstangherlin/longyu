import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import {
  dismissBlockingOverlays,
  seedInstructionLocale,
  seedInterfaceLocale,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilSelector } from "./lesson-player-mobile-helpers";

function masteryThrough(lessonId: string) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const completed = ALL_LESSONS.slice(0, Math.max(0, index)).map((lesson) => lesson.id);
  const now = Date.now();
  const byId: Record<string, { level: number; passCount: number; lastPass: number; recoveryPending: boolean; updatedAt: number }> = {};
  for (const id of completed) {
    const lesson = ALL_LESSONS.find((item) => item.id === id);
    if (!lesson || lesson.isReview || lesson.reviewMasteryMode) continue;
    byId[id] = { level: 4, passCount: 4, lastPass: 4, recoveryPending: false, updatedAt: now };
  }
  return byId;
}

async function openPlayer(page: Page, lessonId: string) {
  await seedUnlockedLessonSession(page, lessonId, { lessonMasteryById: masteryThrough(lessonId) });
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const streak = page.getByText(/dia seguido|day streak|Ofensiva|Streak/i).first();
  if (await streak.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^(Continuar|Continue)$/i }).last().click().catch(() => undefined);
    await page.waitForTimeout(200);
    await dismissBlockingOverlays(page);
  }
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
}

async function continueScene(page: Page) {
  const scene = page.locator("[data-conversation-scene]");
  const btn = scene.getByRole("button", { name: /Continuar|Continue|Responder|Reply|Answer/i }).first();
  if (await btn.isVisible().catch(() => false) && !(await btn.isDisabled().catch(() => true))) {
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(200);
    return true;
  }
  return false;
}

test.describe("V4.9.8B.1 production scaffold + hanzi fill", () => {
  test("hotel conversation starts with pieces and speaking stays", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p7-imersao-hotel");
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 50, 90_000);
    expect(scene).toBeTruthy();
    for (let i = 0; i < 6; i += 1) {
      if (await page.locator("[data-conversation-produce]").isVisible().catch(() => false)) break;
      if (!(await continueScene(page))) break;
    }
    await expect(page.locator("[data-conversation-produce]")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-conversation-scaffold-kind]")).toHaveAttribute("data-conversation-scaffold-kind", "first");
    await expect(page.locator("[data-conversation-build-bank]")).toBeVisible();
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible();
    await page.locator('[data-conversation-build-piece="我有"]').click();
    await page.locator('[data-conversation-build-piece="预订"]').click();
    await page.getByRole("button", { name: /^(Verificar|Check)$/ }).click();
    await expect(page.getByRole("button", { name: /Continuar|Continue/i }).first()).toBeVisible();
  });

  test("airport passport starts independent and help reveals vocab then pieces", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p7-imersao-aeroporto");
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 50, 90_000);
    expect(scene).toBeTruthy();
    for (let i = 0; i < 6; i += 1) {
      if (await page.locator("[data-conversation-produce]").isVisible().catch(() => false)) break;
      if (!(await continueScene(page))) break;
    }
    const produce = page.locator("[data-conversation-produce]");
    await expect(produce).toBeVisible({ timeout: 20_000 });
    await expect(produce).toHaveAttribute("data-conversation-scaffold-kind", "transfer");
    await expect(page.locator("[data-conversation-build-bank]")).toHaveCount(0);
    await expect(page.locator("[data-conversation-help-request]")).toBeVisible();
    await page.locator("[data-conversation-help-request]").click();
    await expect(page.locator("[data-conversation-help-frame]")).toBeVisible();
    await expect(page.locator("[data-conversation-build-bank]")).toHaveCount(0);
    await page.locator("[data-conversation-help-request]").click();
    await expect(page.locator("[data-conversation-help-vocab]")).toBeVisible();
    await page.locator("[data-conversation-help-request]").click();
    await expect(page.locator("[data-conversation-build-bank]")).toBeVisible();
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible();
    await page.locator('[data-conversation-build-piece="这是"]').click();
    await page.locator('[data-conversation-build-piece="我的"]').click();
    await page.locator('[data-conversation-build-piece="护照"]').click();
    await page.getByRole("button", { name: /^(Verificar|Check)$/ }).click();
    await expect(page.getByRole("button", { name: /Continuar|Continue/i }).first()).toBeVisible();
  });

  test("390 viewport keeps produce actions tappable", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlayer(page, "p7-imersao-hotel");
    await advanceUntilSelector(page, "[data-conversation-scene]", 50, 90_000);
    for (let i = 0; i < 6; i += 1) {
      if (await page.locator("[data-conversation-produce]").isVisible().catch(() => false)) break;
      if (!(await continueScene(page))) break;
    }
    const piece = page.locator("[data-conversation-build-piece]").first();
    await expect(piece).toBeVisible();
    const box = await piece.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowX).toBeLessThanOrEqual(8);
  });

  test("audio hanzi fill then sentence build recover 护照 without leaking the target", async ({ page }) => {
    test.setTimeout(150_000);
    const now = Date.now();
    await seedUnlockedLessonSession(page, "p6-survival-mandarin", {
      lessonMasteryById: {
        ...masteryThrough("p6-survival-mandarin"),
        "p6-survival-mandarin": { level: 2, passCount: 2, lastPass: 2, recoveryPending: false, updatedAt: now },
      },
    });
    await page.goto("/licao/p6-survival-mandarin/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const streak = page.getByText(/dia seguido|day streak|Ofensiva|Streak/i).first();
    if (await streak.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /^(Continuar|Continue)$/i }).last().click().catch(() => undefined);
      await page.waitForTimeout(200);
      await dismissBlockingOverlays(page);
    }
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(400);
    const reached = await advanceUntilSelector(page, "[data-fill-blank-audio]", 90, 140_000);
    expect(reached).toBeTruthy();
    await expect(page.locator("[data-current-step-kind]")).toHaveAttribute("data-current-step-kind", "fill_blank");
    const stem = page.locator("[data-lesson-player-frame]").getByText("这是我的", { exact: false });
    await expect(stem.first()).toBeVisible();
    const prompt = page.locator("[data-lesson-player-frame] h2, [data-lesson-player-frame] p").filter({ hasText: /Ouça e complete|Listen and complete|passaporte|passport/i });
    await expect(prompt.first()).toBeVisible();
    const promptText = (await prompt.allTextContents()).join(" ");
    expect(promptText).not.toContain("护照");
    await page.getByRole("button", { name: /^(Opção|Option) \d+: 护照$/ }).click();
    await page.getByRole("button", { name: /^(Verificar|Check)$/ }).click();
    await expect(page.getByRole("button", { name: /Continuar|Continue|Certo/i }).first()).toBeVisible();
  });

  test("EN locale exposes Type / Build with pieces / I need help on airport transfer", async ({ page }) => {
    test.setTimeout(120_000);
    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en", { force: true });
    await openPlayer(page, "p7-imersao-aeroporto");
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 50, 90_000);
    expect(scene).toBeTruthy();
    for (let i = 0; i < 6; i += 1) {
      if (await page.locator("[data-conversation-produce]").isVisible().catch(() => false)) break;
      if (!(await continueScene(page))) break;
    }
    await expect(page.locator("[data-conversation-produce]")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /^Type$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /I need help/i })).toBeVisible();
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Speak|Falar/i }))).toBeVisible();
    await expect(page.locator("[data-conversation-build-bank]")).toHaveCount(0);
  });
});
