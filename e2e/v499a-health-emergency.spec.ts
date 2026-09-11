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
  const btn = scene.getByRole("button", { name: /Continuar|Continue|Responder|Reply|Answer|Concluir|Finish/i }).first();
  if (await btn.isVisible().catch(() => false) && !(await btn.isDisabled().catch(() => true))) {
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(200);
    return true;
  }
  return false;
}

test.describe("V4.9.9A health + emergency", () => {
  test("health lesson keeps listen, fill, build and Falar", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p6-saude");
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
    const heard = await advanceUntilSelector(page, "text=我不舒服", 12, 40_000);
    expect(heard).toBeTruthy();
    const fill = await advanceUntilSelector(page, "[data-fill-blank], text=舒服", 16, 50_000);
    expect(fill).toBeTruthy();
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible({ timeout: 40_000 });
  });

  test("friend conversation auto-reveals and starts with pieces", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p6-saude");
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 60, 90_000);
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-auto-reveal]")).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < 6; i += 1) {
      if (await page.locator("[data-conversation-produce]").isVisible().catch(() => false)) break;
      if (!(await continueScene(page))) break;
    }
    await expect(page.locator("[data-conversation-produce]")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-conversation-scaffold-kind]")).toHaveAttribute("data-conversation-scaffold-kind", "first");
    await expect(page.locator("[data-conversation-build-bank]")).toBeVisible();
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible();
  });

  test("health mission has open production and clinic scene", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p7-imersao-saude");
    const produce = await advanceUntilSelector(page, "[data-free-production], [data-conversation-produce]", 20, 60_000);
    expect(produce).toBeTruthy();
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible();
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 40, 80_000);
    expect(scene).toBeTruthy();
    await expect(page.getByText(/Clínica|Clinic/i)).toBeVisible();
  });

  test("390 viewport keeps Falar on health production", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlayer(page, "p6-saude");
    const field = await advanceUntilSelector(page, "[data-testid=free-answer-mic], [data-free-production]", 24, 60_000);
    expect(field).toBeTruthy();
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible();
  });

  test("EN health lesson keeps the same player shell", async ({ page }) => {
    test.setTimeout(90_000);
    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en");
    await openPlayer(page, "p6-saude");
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
    await expect(page.getByRole("button", { name: /Speak|Falar/i }).or(page.getByTestId("free-answer-mic"))).toBeVisible({ timeout: 40_000 });
  });
});
