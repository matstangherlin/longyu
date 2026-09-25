import { expect, test, type Page } from "@playwright/test";
import {
  chooseCourseIfAsked,
  dismissBlockingOverlays,
  seedCourseDirection,
  seedInterfaceLocale,
  seedLessonPlayerReady,
  seedOnboardedSession,
  seedTelemetryDeclined,
  waitForLazyPage,
} from "./helpers";

/**
 * RC2.2.17 — onboarding único, Teste guiado V2 com áudio honesto, teste de
 * nível opt-in, camada guiada e Ajustes. Fresh PT beginner → Guided Try V2 →
 * meta diária → cadastro em 2 etapas; EN com exemplo "e.g. Alex"; experiente
 * com placement-offer-test.
 */

/** speechSynthesis controlado: "ok" dispara onstart/onend; "fail" dispara onerror. */
async function installFakeSpeech(page: Page, mode: "ok" | "fail") {
  await page.addInitScript((behavior: string) => {
    class FakeUtterance {
      text = "";
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: unknown = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      writable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: () => [],
        cancel() {},
        pause() {},
        resume() {},
        speak(u: FakeUtterance) {
          if (behavior === "fail") {
            window.setTimeout(() => u.onerror?.({ error: "synthesis-failed" }), 20);
            return;
          }
          window.setTimeout(() => u.onstart?.(), 10);
          window.setTimeout(() => u.onend?.(), 60);
        },
      },
    });
    (window as Window & { SpeechSynthesisUtterance?: typeof FakeUtterance }).SpeechSynthesisUtterance = FakeUtterance;
  }, mode);
}

async function walkGuidedTryAfterListen(page: Page) {
  const flow = page.getByTestId("guided-try");
  const action = page.locator("[data-guided-action]");
  await action.click();
  await expect(flow).toHaveAttribute("data-guided-step", "explain");
  await action.click();
  await expect(flow).toHaveAttribute("data-guided-step", "tone");
  await page.locator('[data-guided-option="tone-3"]').click();
  await action.click();
  await expect(flow).toHaveAttribute("data-guided-step", "meaning");
  await page.locator('[data-guided-option="hello"]').click();
  await action.click();
  await expect(flow).toHaveAttribute("data-guided-step", "build");
  await page.locator('[data-guided-piece="女"]').click();
  await page.locator('[data-guided-piece="子"]').click();
  await action.click();
  await expect(flow).toHaveAttribute("data-guided-step", "conversation");
  await page.locator('[data-guided-option="reply-nihao"]').click();
  await action.click();
  await expect(page.getByTestId("guided-try-done")).toBeVisible();
}

test.describe("RC2.2.17 · onboarding único", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Fresh PT beginner: curso → Teste guiado V2 → meta diária (uma vez) → cadastro em 2 etapas, sem placement", async ({ page }) => {
    test.setTimeout(120_000);
    await installFakeSpeech(page, "ok");
    await seedTelemetryDeclined(page);
    await page.goto("/");
    await waitForLazyPage(page);
    await page.getByTestId("landing-guided-try").click();
    await chooseCourseIfAsked(page, "pt-zh");
    await expect(page).toHaveURL(/\/teste-guiado$/);
    const flow = page.getByTestId("guided-try");
    await expect(flow).toHaveAttribute("data-guided-step", "intro");
    await expect(page.getByTestId("guide-line")).toBeVisible();
    await page.locator("[data-guided-action]").click();

    // Ouça: Continuar só depois de o motor confirmar.
    await expect(flow).toHaveAttribute("data-guided-step", "listen");
    await expect(page.locator("[data-guided-action]")).toBeDisabled();
    await page.locator("[data-guided-listen]").click();
    await expect(flow).toHaveAttribute("data-guided-audio", "AUDIO_HEARD");
    await expect(page.getByTestId("guided-reveal")).toContainText("nǐ hǎo");
    await walkGuidedTryAfterListen(page);
    await page.screenshot({ path: "test-results/rc2-2-17/guided-try-done-390x844.png" });
    await page.locator("[data-guided-create-account]").click();

    await expect(page).toHaveURL(/\/comecar/);
    await expect(page.getByTestId("daily-goal-step")).toBeVisible();
    await expect(page.getByText("Quanto tempo você quer praticar por dia?")).toBeVisible();
    await page.locator('[data-daily-goal="10"]').click();
    await page.getByTestId("daily-goal-continue").click();

    const form = page.getByTestId("signup-form");
    await expect(form).toHaveAttribute("data-signup-phase", "identity");
    await expect(page.getByPlaceholder("Ex.: Mariana", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("ex.: mariana_zh", { exact: true })).toBeVisible();
    await expect(form.locator('input[type="password"]')).toHaveCount(0);
    await page.getByTestId("signup-name").fill("Ana Teste");
    await page.getByTestId("signup-email").fill("ana@example.com");
    await page.getByTestId("signup-username").fill("ana_zh");
    await page.getByTestId("signup-identity-continue").click();
    await expect(form).toHaveAttribute("data-signup-phase", "security");
    await expect(page.getByTestId("password-requirements")).toHaveAttribute("data-password-requirements", "compact");

    // Nunca passou pelo placement nem pela meta duas vezes.
    await expect(page.getByTestId("placement-quiz")).toHaveCount(0);
    await expect(page.getByTestId("daily-goal-step")).toHaveCount(0);
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu.onboardingDraft.v1") ?? "{}"));
    expect(draft).toMatchObject({ guidedTryCompleted: true, guidedTryAudio: "AUDIO_HEARD", dailyGoalMinutes: 10, path: "beginner" });
    const store = await page.evaluate(() => JSON.parse(localStorage.getItem("longyu-v1") ?? "{}")?.state ?? {});
    expect((store.completedLessons ?? []).length).toBe(0);
    expect(Number(store.xpTotal ?? 0)).toBe(0);
  });

  test("áudio que falha: mensagem honesta, tentar de novo e 'Continuar sem áudio' explícito (DEGRADED_AUDIO)", async ({ page }) => {
    await installFakeSpeech(page, "fail");
    await seedTelemetryDeclined(page);
    await seedCourseDirection(page, "pt-zh");
    await page.goto("/teste-guiado");
    await waitForLazyPage(page);
    await page.locator("[data-guided-action]").click();
    await page.locator("[data-guided-listen]").click();
    await expect(page.getByTestId("guided-audio-failed")).toBeVisible();
    await expect(page.getByText("Não conseguimos reproduzir o áudio.")).toBeVisible();
    await expect(page.getByTestId("guided-audio-retry")).toBeVisible();
    await expect(page.getByTestId("guided-reveal")).toContainText("你好");
    const action = page.locator("[data-guided-action]");
    await expect(action).toHaveText("Continuar sem áudio");
    await expect(page.getByTestId("guided-try")).toHaveAttribute("data-guided-audio", "NONE");
    await action.click();
    await expect(page.getByTestId("guided-try")).toHaveAttribute("data-guided-audio", "DEGRADED_AUDIO");
    await expect(page.getByTestId("guided-try")).toHaveAttribute("data-guided-step", "explain");
  });

  test("EN: English → Mandarin, cópia EN e exemplo de nome e.g. Alex", async ({ page }) => {
    await seedTelemetryDeclined(page);
    await seedInterfaceLocale(page, "en");
    await seedCourseDirection(page, "en-zh");
    await page.addInitScript(() => {
      localStorage.setItem(
        "longyu.onboardingDraft.v1",
        JSON.stringify({ guidedTryCompleted: true, guidedTryAudio: "AUDIO_HEARD", guidedTryCompletedAt: Date.now(), dailyGoalMinutes: null, path: "beginner" })
      );
    });
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await expect(page.getByText("How long do you want to practice each day?")).toBeVisible();
    await page.locator('[data-daily-goal="5"]').click();
    await page.getByTestId("daily-goal-continue").click();
    await expect(page.getByPlaceholder("e.g. Alex", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("e.g. alex_zh", { exact: true })).toBeVisible();
    await expect(page.getByText(/Ex\.:/)).toHaveCount(0);
  });

  test("experiente: Já estudo mandarim → meta → Fazer teste de nível (sem as 3 pílulas)", async ({ page }) => {
    await seedTelemetryDeclined(page);
    await seedCourseDirection(page, "pt-zh");
    await page.goto("/comecar");
    await waitForLazyPage(page);
    await page.getByTestId("onboarding-path-experienced").click();
    await page.locator('[data-daily-goal="15"]').click();
    await page.getByTestId("daily-goal-continue").click();
    await expect(page.getByTestId("placement-offer")).toBeVisible();
    await page.getByTestId("placement-offer-test").click();
    await page.getByTestId("onboarding-choice-studied").click();
    await page.getByTestId("level-continue").click();
    const quiz = page.getByTestId("placement-quiz");
    await expect(quiz).toBeVisible();
    await expect(page.getByTestId("placement-question-of")).toHaveText(/^Pergunta 1 de \d+$/);
    await expect(quiz.getByText(/SOM E PINYIN|FASE ATUAL|ÁUDIO E TOM/)).toHaveCount(0);
  });
});

test.describe("RC2.2.17 · camada guiada e Ajustes", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("l2 reconhece o 你好 do Teste guiado (ponte curta do Dragão, guia alto)", async ({ page }) => {
    await seedLessonPlayerReady(page, "l2");
    await page.addInitScript(() => {
      const raw = localStorage.getItem("longyu-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.state.guidedTryExposure = { kind: "GUIDED_TRY_EXPOSURE", at: Date.now(), audio: "AUDIO_HEARD" };
      localStorage.setItem("longyu-v1", JSON.stringify(parsed));
    });
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("lesson-prepare-line")).toContainText("Você já usou 你好 no início");
    await expect(page.locator("[data-lesson-step-frame]")).toHaveAttribute("data-guidance-level", "HIGH");
  });

  test("Conta mostra a Zona de perigo (com confirmação) e a Home de Ajustes mostra Aparência", async ({ page }) => {
    await seedOnboardedSession(page);
    await page.goto("/config/conta");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("settings-danger-zone")).toBeVisible();
    await page.getByTestId("settings-delete-account").click();
    await expect(page.getByTestId("settings-delete-confirm")).toBeVisible();
    await expect(page.getByTestId("settings-delete-final")).toBeDisabled();
    await page.goto("/config");
    await waitForLazyPage(page);
    await expect(page.locator('[data-settings-category="aparencia"]')).toBeVisible();
    await page.locator('[data-settings-category="aparencia"]').click();
    const modes = page.getByTestId("appearance-mode");
    await expect(modes.locator("[data-appearance-mode]")).toHaveCount(3);
    await modes.locator('[data-appearance-mode="dark"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
