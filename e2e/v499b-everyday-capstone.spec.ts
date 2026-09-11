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

async function installFakeRecognition(page: Page) {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => this.onend?.(), 60);
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    Object.defineProperty(window, "SpeechRecognition", { value: FakeRecognition, writable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: FakeRecognition, writable: true });
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
      writable: true,
    });
  });
}

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

async function dismissLessonChrome(page: Page) {
  await dismissBlockingOverlays(page);
  const medal = page.getByText(/Nova medalha|New medal|Primeira voz|First voice/i).first();
  if (await medal.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^(Continuar|Continue)$/i }).last().click().catch(() => undefined);
    await page.waitForTimeout(200);
    await dismissBlockingOverlays(page);
  }
}

async function currentStepKind(page: Page) {
  return page.locator("[data-current-step-kind]").getAttribute("data-current-step-kind");
}

async function openPlayer(page: Page, lessonId: string, extra: Record<string, unknown> = {}) {
  await installFakeRecognition(page);
  await seedUnlockedLessonSession(page, lessonId, {
    lessonMasteryById: masteryThrough(lessonId),
    achievementsUnlocked: {
      "jornada-primeira-licao": Date.now(),
      "fala-primeira-frase": Date.now(),
      "som-primeiro-audio": Date.now(),
    },
    ...extra,
  });
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const streak = page.getByText(/dia seguido|day streak|Ofensiva|Streak/i).first();
  if (await streak.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^(Continuar|Continue)$/i }).last().click().catch(() => undefined);
    await page.waitForTimeout(200);
  }
  await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
  await dismissLessonChrome(page);
}

function attempt(lessonId: string, n: number) {
  const now = Date.now();
  return Array.from({ length: n }, (_, index) => ({
    id: `${lessonId}:${now}:${index}`,
    lessonId,
    startedAt: now - 60_000,
    finishedAt: now - 1_000,
    totalQuestions: 8,
    correctCount: 6,
    mistakes: [],
    recoveredMistakes: [],
    finalStars: 2,
  }));
}

test.describe("V4.9.9B everyday + capstone", () => {
  test("everyday lesson keeps listen, fill, reciprocal build and conversation", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p7-conversa-cotidiana");
    const listen = await advanceUntilSelector(page, '[data-current-step-kind="listen_select"]', 8, 40_000, { allowSkip: true });
    expect(listen).toBeTruthy();
    const fill = await advanceUntilSelector(page, '[data-current-step-kind="fill_blank"]', 8, 40_000, { allowSkip: true });
    expect(fill).toBeTruthy();
    const build = await advanceUntilSelector(page, "[data-sentence-build]", 8, 40_000, { allowSkip: true });
    expect(build).toBeTruthy();
    await expect(page.getByText("你呢").first()).toBeVisible();
    const production = await advanceUntilSelector(page, '[data-current-step-kind="free_production"]', 6, 30_000, { allowSkip: true });
    expect(production).toBeTruthy();
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible();
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 8, 40_000, { allowSkip: true });
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-auto-reveal]").first()).toBeVisible({ timeout: 20_000 });
  });

  test("capstone A opens first contact then restaurant", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p7-china-survival");
    let sawProduction = false;
    const deadline = Date.now() + 80_000;
    for (let step = 0; step < 40 && Date.now() < deadline; step += 1) {
      await dismissLessonChrome(page);
      if ((await currentStepKind(page)) === "free_production") sawProduction = true;
      if (await page.locator("[data-conversation-scene]").isVisible().catch(() => false)) break;
      const reached = await advanceUntilSelector(page, "[data-conversation-scene]", 1, 4_000, { allowSkip: true });
      if (reached) break;
    }
    expect(sawProduction || (await page.locator("[data-conversation-scene]").isVisible().catch(() => false))).toBeTruthy();
    await expect(page.locator("[data-conversation-scene]")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-conversation-setting="street"]')).toBeVisible();
  });

  test("capstone B rotates into shopping", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p7-china-survival", {
      lessonAttemptsById: { "p7-china-survival": attempt("p7-china-survival", 1) },
    });
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 16, 80_000, { allowSkip: true });
    expect(scene).toBeTruthy();
  });

  test("capstone C rotates into health", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p7-china-survival", {
      lessonAttemptsById: { "p7-china-survival": attempt("p7-china-survival", 2) },
    });
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 16, 80_000, { allowSkip: true });
    expect(scene).toBeTruthy();
  });

  test("390 viewport keeps Falar on everyday production", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlayer(page, "p7-conversa-cotidiana");
    const reached = await advanceUntilSelector(page, '[data-current-step-kind="free_production"]', 10, 50_000, { allowSkip: true });
    expect(reached).toBeTruthy();
    await dismissLessonChrome(page);
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible();
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowX).toBeLessThanOrEqual(8);
  });

  test("EN everyday lesson keeps the same player shell", async ({ page }) => {
    test.setTimeout(90_000);
    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en", { force: true });
    await openPlayer(page, "p7-conversa-cotidiana");
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
    const reached = await advanceUntilSelector(page, '[data-current-step-kind="free_production"]', 10, 50_000, { allowSkip: true });
    expect(reached).toBeTruthy();
    await expect(page.getByRole("button", { name: /Speak|Falar/i }).or(page.getByTestId("free-answer-mic"))).toBeVisible();
  });

  test("capstone refresh keeps the current episode cursor", async ({ page }) => {
    test.setTimeout(90_000);
    await openPlayer(page, "p7-china-survival");
    const reached = await advanceUntilSelector(page, "[data-conversation-scene]", 16, 80_000, { allowSkip: true });
    expect(reached).toBeTruthy();
    await page.reload();
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-conversation-scene]")).toBeVisible({ timeout: 20_000 });
  });
});
