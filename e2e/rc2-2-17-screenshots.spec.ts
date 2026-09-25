import { expect, test, type Page } from "@playwright/test";
import {
  chooseCourseIfAsked,
  dismissBlockingOverlays,
  seedCourseDirection,
  seedLessonPlayerReady,
  seedOnboardedSession,
  seedTelemetryDeclined,
  waitForLazyPage,
} from "./helpers";

/**
 * RC2.2.17 · VISUAL MATRIX — 390×844, 412×915, 432×960. Só roda com
 * SHOT_PACK=1 (gera docs/reports/rc2-2-17-screenshots/*.jpg).
 */
const SHOT = process.env.SHOT_PACK === "1";
const OUT = "docs/reports/rc2-2-17-screenshots";
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 432, height: 960 },
];

async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    class U {
      text = "";
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: () => [],
        cancel() {},
        pause() {},
        resume() {},
        speak(u: U) {
          window.setTimeout(() => u.onstart?.(), 10);
          window.setTimeout(() => u.onend?.(), 60);
        },
      },
    });
    (window as unknown as { SpeechSynthesisUtterance: typeof U }).SpeechSynthesisUtterance = U;
  });
}

async function shot(page: Page, name: string, vp: { width: number; height: number }) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}-${vp.width}x${vp.height}.jpg`, type: "jpeg", quality: 70 });
}

async function openToneStep(page: Page, lessonId: string, vp: { width: number; height: number }, name: string) {
  await seedLessonPlayerReady(page, lessonId);
  await page.goto(`/licao/${lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await page.waitForFunction(() => Boolean((window as Window & { __longyuLessonQa?: unknown }).__longyuLessonQa));
  const index = await page.evaluate(() => {
    const qa = (window as Window & { __longyuLessonQa?: { steps: () => Array<{ index: number; kind: string }> } }).__longyuLessonQa;
    return qa?.steps().find((step) => step.kind === "tone")?.index ?? -1;
  });
  if (index < 0) return;
  await page.evaluate((i) => (window as Window & { __longyuLessonQa?: { jumpTo: (n: number) => void } }).__longyuLessonQa?.jumpTo(i), index);
  const first = page.locator("[data-tone-first-exposure]");
  if (await first.isVisible().catch(() => false)) await first.click();
  await expect(page.locator('[data-tone-guided="true"]').first()).toBeVisible();
  await page.waitForTimeout(1200);
  await shot(page, name, vp);
}

test.describe("RC2.2.17 · matriz visual", () => {
  test.skip(!SHOT, "SHOT_PACK=1 para gerar a matriz visual");
  for (const vp of VIEWPORTS) {
    test(`onboarding e Teste guiado ${vp.width}x${vp.height}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(vp);
      await fakeSpeech(page);
      await seedTelemetryDeclined(page);
      await page.goto("/");
      await waitForLazyPage(page);
      await page.getByTestId("landing-guided-try").click();
      await chooseCourseIfAsked(page, "pt-zh");
      const action = page.locator("[data-guided-action]");
      await action.click();
      await page.locator("[data-guided-listen]").click();
      await expect(page.getByTestId("guided-try")).toHaveAttribute("data-guided-audio", "AUDIO_HEARD");
      await shot(page, "01-guided-try-listen", vp);
      await action.click();
      await action.click();
      await page.locator('[data-guided-option="tone-3"]').click();
      await page.getByTestId("guided-tone-play").click();
      await shot(page, "02-guided-try-tone", vp);
      await action.click();
      await page.locator('[data-guided-option="hello"]').click();
      await action.click();
      await page.locator('[data-guided-piece="女"]').click();
      await page.locator('[data-guided-piece="子"]').click();
      await action.click();
      await shot(page, "03-guided-try-conversation", vp);
      await page.locator('[data-guided-option="reply-nihao"]').click();
      await action.click();
      await page.locator("[data-guided-create-account]").click();
      await expect(page.getByTestId("daily-goal-step")).toBeVisible();
      await page.locator('[data-daily-goal="10"]').click();
      await shot(page, "04-daily-goal", vp);
      await page.getByTestId("daily-goal-continue").click();
      await shot(page, "05-signup-phase-1", vp);
      await page.getByTestId("signup-name").fill("Mariana");
      await page.getByTestId("signup-email").fill("mariana@example.com");
      await page.getByTestId("signup-username").fill("mariana_zh");
      await page.getByTestId("signup-identity-continue").click();
      await shot(page, "06-signup-phase-2", vp);
    });

    test(`lição, conversa, tons e ajustes ${vp.width}x${vp.height}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize(vp);
      await fakeSpeech(page);
      await seedLessonPlayerReady(page, "l2");
      await page.goto("/licao/l2/player");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await shot(page, "07-lesson-1-guided", vp);
      await page.waitForFunction(() => Boolean((window as Window & { __longyuLessonQa?: unknown }).__longyuLessonQa));
      const scene = await page.evaluate(() => {
        const qa = (window as Window & { __longyuLessonQa?: { steps: () => Array<{ index: number; kind: string }> } }).__longyuLessonQa;
        return qa?.steps().find((step) => step.kind === "conversation_scene")?.index ?? -1;
      });
      if (scene >= 0) {
        await page.evaluate((i) => (window as Window & { __longyuLessonQa?: { jumpTo: (n: number) => void } }).__longyuLessonQa?.jumpTo(i), scene);
        await expect(page.locator("[data-conversation-scene]").first()).toBeVisible();
        await shot(page, "08-conversation", vp);
      }
      const tones: Array<[string, string]> = [
        ["p2-ma-primeiro-tom", "09-tone-1"],
        ["p2-ma-segundo-tom", "10-tone-2"],
        ["p2-ma-terceiro-tom", "11-tone-3"],
        ["p2-ma-quarto-tom", "12-tone-4"],
      ];
      for (const [lessonId, name] of tones) await openToneStep(page, lessonId, vp, name);
      await seedOnboardedSession(page);
      await page.goto("/config/conta");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);
      await page.getByTestId("settings-danger-zone").scrollIntoViewIfNeeded();
      await shot(page, "13-settings-account", vp);
      await page.goto("/config/aparencia");
      await waitForLazyPage(page);
      await shot(page, "14-settings-appearance", vp);
    });
  }

  test("modo degradado (390x844)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[0]);
    await seedTelemetryDeclined(page);
    await seedCourseDirection(page, "pt-zh");
    await page.addInitScript(() => {
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
    });
    await page.goto("/teste-guiado");
    await waitForLazyPage(page);
    await page.locator("[data-guided-action]").click();
    await page.locator("[data-guided-listen]").click();
    await expect(page.getByTestId("guided-audio-failed")).toBeVisible();
    await shot(page, "15-guided-try-degraded-audio", VIEWPORTS[0]);
  });
});
