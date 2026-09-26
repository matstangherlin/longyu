import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  chooseCourseIfAsked,
  dismissBlockingOverlays,
  seedCourseDirection,
  seedInstructionLocale,
  seedUnlockedLessonSession,
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

/** /qa/tone: "Conheça a curva" de cada tom (mesma trilha do V4.9.1). */
async function toneNoticeShots(browser: Browser, vp: { width: number; height: number }, masteryLevel = 0) {
  // Estado limpo: /qa/tone mostra a 1ª passada (1º e 3º tom); com domínio 1,
  // a 2ª passada apresenta o 2º e o 4º (mesma trilha do V4.9.1).
  const context = await browser.newContext({ viewport: vp });
  const page = await context.newPage();
  await seedInstructionLocale(page, "pt-BR");
  if (masteryLevel > 0) {
    await seedUnlockedLessonSession(page, "p1-o-que-e-tom", { learnedChunks: ["nihao"], learnedChars: ["ni", "hao"] });
    await page.addInitScript((level: number) => {
      const raw = localStorage.getItem("longyu-v1");
      if (!raw) return;
      const payload = JSON.parse(raw);
      payload.state.lessonMasteryById = {
        ...(payload.state.lessonMasteryById ?? {}),
        "p1-o-que-e-tom": { level, passCount: level, lastPass: level, recoveryPending: false, updatedAt: Date.now() },
      };
      localStorage.setItem("longyu-v1", JSON.stringify(payload));
    }, masteryLevel);
  }
  await page.goto("/qa/tone");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  const intro = page.getByRole("button", { name: /^Entendi$/ });
  if (await intro.isVisible({ timeout: 5_000 }).catch(() => false)) await intro.click();
  const shotTones = new Set<string>();
  const deadline = Date.now() + 25_000;
  while (shotTones.size < 2 && Date.now() < deadline) {
    const notice = page.locator("[data-tone-guided-notice]").first();
    const tone = (await notice.isVisible().catch(() => false)) ? await notice.getAttribute("data-tone-guided-notice") : null;
    if (tone && !shotTones.has(tone)) {
      const first = notice.locator("[data-tone-first-exposure]");
      if (await first.isVisible().catch(() => false)) await first.click();
      await expect(notice.locator('[data-tone-guided="true"]')).toBeVisible();
      await page.waitForTimeout(1200);
      await shot(page, `${String(8 + Number(tone)).padStart(2, "0")}-tone-${tone}`, vp);
      shotTones.add(tone);
    }
    const buttons = [
      page.getByRole("button", { name: /Não posso falar agora/i }),
      page.getByRole("button", { name: /^Percebi a curva$/ }),
      page.getByRole("button", { name: /^Continuar$/ }),
      page.getByRole("button", { name: /^Entendi$/ }),
      page.getByRole("button", { name: /^Pular/ }),
    ];
    for (const button of buttons) {
      if ((await button.isVisible().catch(() => false)) && !(await button.isDisabled().catch(() => true))) {
        await button.click();
        break;
      }
    }
    await page.waitForTimeout(200);
  }
  await context.close();
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

    test(`lição, conversa, tons e ajustes ${vp.width}x${vp.height}`, async ({ page, browser }) => {
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
      await toneNoticeShots(browser, vp, 0);
      await toneNoticeShots(browser, vp, 1);
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
