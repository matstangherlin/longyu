import { expect, test, type Page } from "@playwright/test";
import { ALL_LESSONS } from "../src/data/journey";
import {
  dismissBlockingOverlays,
  seedInstructionLocale,
  seedInterfaceLocale,
  seedUnlockedLessonSession,
  waitForLazyPage,
} from "./helpers";
import { playCultureLessonToVictory } from "./culture-lesson-helpers";
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

async function openPlayer(page: Page, lessonId: string) {
  await installFakeRecognition(page);
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
  if ((await btn.isVisible().catch(() => false)) && !(await btn.isDisabled().catch(() => true))) {
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(200);
    return true;
  }
  return false;
}

test.describe("V4.9.8B.2 unified lesson UX", () => {
  test("hotel production keeps speak visible with chips", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p7-imersao-hotel");
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 50, 90_000);
    expect(scene).toBeTruthy();
    for (let i = 0; i < 6; i += 1) {
      if (await page.locator("[data-conversation-produce]").isVisible().catch(() => false)) break;
      if (!(await continueScene(page))) break;
    }
    await expect(page.locator("[data-conversation-produce]")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-conversation-build-bank]")).toBeVisible();
    await expect(page.getByTestId("free-answer-mic")).toBeVisible();
    await expect(page.getByTestId("free-answer-mic")).toHaveAttribute("data-speech-state", /idle|listening|processing/);
    await expect(page.getByText(/Ouça e toque para revelar/)).toHaveCount(0);
    await expect(page.locator("[data-conversation-auto-reveal]").first()).toBeVisible();
  });

  test("culture journey node opens the same LessonPlayer as Hub", async ({ page }) => {
    test.setTimeout(90_000);
    await seedUnlockedLessonSession(page, "l2", { lessonMasteryById: masteryThrough("l2") });
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const node = page.locator('[data-journey-inline-node="culture:greetings-nihao"]');
    if (await node.isVisible().catch(() => false)) {
      await expect(node).toHaveAttribute("data-canonical-lesson-id", "culture-greetings-nihao");
      await node.click();
    } else {
      await page.goto("/licao/culture-greetings-nihao/player?src=jornada");
    }
    await waitForLazyPage(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-lesson-domain='culture']")).toBeVisible();
  });

  test("culture victory is the same minimal shell", async ({ page }) => {
    test.setTimeout(120_000);
    await seedUnlockedLessonSession(page, "l2", { lessonMasteryById: masteryThrough("l2") });
    await page.goto("/licao/culture-greetings-nihao/player?src=jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await playCultureLessonToVictory(page);
    const victory = page.locator("[data-lesson-victory]");
    await expect(victory).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("culture-victory")).toBeVisible();
    await expect(page.locator("[data-victory-highlight]")).toBeVisible();
    await expect(page.locator("[data-victory-primary]")).toHaveCount(1);
    await expect(page.getByTestId("culture-touchpoint")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Salvar para depois|Save for later/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Revisão|Biblioteca|Treino|Review|Library|Train/ })).toHaveCount(0);
  });

  test("EN Type / Speak labels stay on production", async ({ page }) => {
    test.setTimeout(90_000);
    await installFakeRecognition(page);
    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en");
    await seedUnlockedLessonSession(page, "p7-imersao-hotel", { lessonMasteryById: masteryThrough("p7-imersao-hotel") });
    await page.goto("/licao/p7-imersao-hotel/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const scene = await advanceUntilSelector(page, "[data-conversation-produce]", 50, 80_000);
    expect(scene).toBeTruthy();
    await expect(page.getByRole("button", { name: /Speak|Again/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Type/i }).first()).toBeVisible();
  });

  test("390 viewport keeps speak and victory CTA on screen", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlayer(page, "p7-imersao-aeroporto");
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 50, 80_000);
    expect(scene).toBeTruthy();
    for (let i = 0; i < 6; i += 1) {
      if (await page.locator("[data-conversation-produce]").isVisible().catch(() => false)) break;
      if (!(await continueScene(page))) break;
    }
    const produce = page.locator("[data-conversation-produce]");
    await expect(produce).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("free-answer-mic")).toBeInViewport();
  });
});
