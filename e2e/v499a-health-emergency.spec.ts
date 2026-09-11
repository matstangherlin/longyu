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

/**
 * Firefox (e o Chromium do CI sem mic) não expõem SpeechRecognition.
 * Falar some de propósito quando a API não existe — instalar o fake
 * reconhecedor, como em v498b1-production-scaffold.
 */
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

/** Seed the current lesson at `level` so the next pass is level+1 (1–4). */
function masteryAt(lessonId: string, level: number) {
  const now = Date.now();
  const lastPass = Math.max(1, Math.min(4, level || 1));
  return {
    ...masteryThrough(lessonId),
    [lessonId]: { level, passCount: level, lastPass, recoveryPending: false, updatedAt: now },
  };
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

async function openPlayer(page: Page, lessonId: string, masteryLevel?: number) {
  await installFakeRecognition(page);
  await seedUnlockedLessonSession(page, lessonId, {
    lessonMasteryById: masteryLevel == null ? masteryThrough(lessonId) : masteryAt(lessonId, masteryLevel),
    achievementsUnlocked: {
      "jornada-primeira-licao": Date.now(),
      "fala-primeira-frase": Date.now(),
      "som-primeiro-audio": Date.now(),
    },
  });
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
  await dismissLessonChrome(page);
}

async function continueScene(page: Page) {
  const scene = page.locator("[data-conversation-scene]");
  const btn = scene.getByRole("button", { name: /Continuar|Continue|Responder|Reply|Answer|Concluir|Finish/i }).first();
  if (await btn.isVisible().catch(() => false) && !(await btn.isDisabled().catch(() => true))) {
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

async function reachProduce(page: Page) {
  for (let i = 0; i < 8; i += 1) {
    if (await page.locator("[data-conversation-produce]").isVisible().catch(() => false)) return true;
    await page.waitForTimeout(200);
    if (!(await continueScene(page))) break;
  }
  return page.locator("[data-conversation-produce]").isVisible().catch(() => false);
}

test.describe("V4.9.9A health + emergency", () => {
  test("health discovery keeps listen, fill and sentence build", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p6-saude");
    const listen = await advanceUntilSelector(page, '[data-current-step-kind="listen"]', 8, 40_000, { allowSkip: true });
    expect(listen).toBeTruthy();
    const fill = await advanceUntilSelector(page, '[data-current-step-kind="fill_blank"]', 10, 50_000, { allowSkip: true });
    expect(fill).toBeTruthy();
    await expect(page.getByText("舒服").first()).toBeVisible();
    const build = await advanceUntilSelector(page, "[data-sentence-build]", 8, 40_000, { allowSkip: true });
    expect(build).toBeTruthy();
  });

  test("friend conversation auto-reveals and starts with pieces", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p6-saude", 3);
    const scene = await advanceUntilSelector(page, "[data-conversation-scene]", 12, 60_000, { allowSkip: true });
    expect(scene).toBeTruthy();
    await expect(page.locator("[data-conversation-auto-reveal]").first()).toBeVisible({ timeout: 20_000 });
    expect(await reachProduce(page)).toBeTruthy();
    await expect(page.locator("[data-conversation-produce]")).toBeVisible();
    await expect(page.locator("[data-conversation-scaffold-kind]")).toHaveAttribute("data-conversation-scaffold-kind", "first");
    await expect(page.locator("[data-conversation-build-bank]")).toBeVisible();
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible();
    await page.locator('[data-conversation-build-piece="我"]').click();
    await page.locator('[data-conversation-build-piece="不"]').click();
    await page.locator('[data-conversation-build-piece="舒服"]').click();
    await page.getByRole("button", { name: /^(Verificar|Check)$/ }).click();
    await expect(page.getByRole("button", { name: /Continuar|Continue/i }).first()).toBeVisible();
  });

  test("health mission has open production and clinic scene", async ({ page }) => {
    test.setTimeout(120_000);
    await openPlayer(page, "p7-imersao-saude");
    let sawProduction = false;
    let sawSpeak = false;
    const deadline = Date.now() + 80_000;
    for (let step = 0; step < 40 && Date.now() < deadline; step += 1) {
      await dismissLessonChrome(page);
      const kind = await currentStepKind(page);
      if (kind === "free_production") {
        sawProduction = true;
        if (await page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i })).first().isVisible().catch(() => false)) {
          sawSpeak = true;
        }
      }
      if (await page.locator("[data-conversation-scene]").isVisible().catch(() => false)) break;
      const reached = await advanceUntilSelector(page, "[data-conversation-scene]", 1, 4_000, { allowSkip: true });
      if (reached) break;
    }
    expect(sawProduction).toBeTruthy();
    expect(sawSpeak).toBeTruthy();
    await expect(page.locator("[data-conversation-scene]")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-conversation-setting="clinic"]')).toBeVisible();
    await expect(page.getByText(/Clínica|Clinic/i).first()).toBeVisible();
  });

  test("390 viewport keeps Falar on health production", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlayer(page, "p6-saude", 2);
    await dismissLessonChrome(page);
    const reached = await advanceUntilSelector(page, '[data-current-step-kind="free_production"]', 6, 30_000, { allowSkip: true });
    expect(reached).toBeTruthy();
    await dismissLessonChrome(page);
    await expect(page.getByTestId("free-answer-mic").or(page.getByRole("button", { name: /Falar|Speak/i }))).toBeVisible();
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowX).toBeLessThanOrEqual(8);
  });

  test("EN health lesson keeps the same player shell", async ({ page }) => {
    test.setTimeout(90_000);
    await seedInterfaceLocale(page, "en");
    await seedInstructionLocale(page, "en", { force: true });
    await openPlayer(page, "p6-saude", 2);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
    await dismissLessonChrome(page);
    const reached = await advanceUntilSelector(page, '[data-current-step-kind="free_production"]', 6, 30_000, { allowSkip: true });
    expect(reached).toBeTruthy();
    await expect(page.getByRole("button", { name: /Speak|Falar/i }).or(page.getByTestId("free-answer-mic"))).toBeVisible();
  });
});
