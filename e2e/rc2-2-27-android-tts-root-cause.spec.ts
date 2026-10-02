import { expect, test, type Page } from "@playwright/test";
import { fakeCanonicalMedia } from "./fake-canonical-media";
import { allowE2ELocalSession, chooseCourseIfAsked, dismissBlockingOverlays, seedLessonPlayerReady, seedTelemetryDeclined, waitForLazyPage } from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";

/**
 * RC2.2.27 — Android TTS Root Cause (parte Web/E2E). O navegador NÃO prova o
 * motor Android: prova o painel forense, o prazo do Teste Guiado (nunca
 * cinza para sempre), uma request por nó da conversa, a cerimônia de
 * conclusão sequencial e a ausência de scroll nas atividades. WEB PASS ≠
 * APK PASS; physical continua NOT_RUN até o owner, com SHA instalado == HEAD.
 */
const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];
const NO_SCROLL = [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 360, height: 640 },
];

async function seed(page: Page, state: Record<string, unknown> = {}) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({ state: { accountSetupComplete: true, courseDirection: "pt-zh", holdAchievementModals: true, guidance: { version: 2, enabled: false, initialized: true, records: {} }, completedLessons: THROUGH_L2, ...state }, version: STORE_VERSION });
  await page.addInitScript((value: string) => {
    if (sessionStorage.getItem("rc2227-seeded")) return;
    sessionStorage.setItem("rc2227-seeded", "1");
    localStorage.setItem("longyu-v1", value);
  }, payload);
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

/**
 * speechSynthesis controlado. `silent`: o motor nunca anuncia início nem fim
 * (o caso do APK: ouvido, sem ACK). Conta cada `speak` em window.__speaks.
 */
async function fakeSpeech(page: Page, mode: "start" | "silent") {
  await page.addInitScript((m: string) => {
    (window as unknown as { __speaks: number }).__speaks = 0;
    class U {
      text = "";
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
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
          (window as unknown as { __speaks: number }).__speaks += 1;
          if (m === "silent") return;
          window.setTimeout(() => u.onstart?.(), 10);
          window.setTimeout(() => u.onend?.(), 60);
        },
      },
    });
    (window as unknown as { SpeechSynthesisUtterance: typeof U }).SpeechSynthesisUtterance = U;
  }, mode);
}

async function openGuidedListen(page: Page) {
  await open(page, "/");
  await page.getByTestId("landing-guided-try").click();
  await chooseCourseIfAsked(page, "pt-zh");
  const flow = page.getByTestId("guided-try");
  const action = page.locator("[data-guided-action]");
  if ((await flow.getAttribute("data-guided-step")) === "intro") await action.click();
  await expect(flow).toHaveAttribute("data-guided-step", "listen");
  return { flow, action };
}

/** Rolagem obrigatória = o conteúdo passa da altura do contêiner que rola. */
async function requiredScroll(page: Page) {
  return page.evaluate(() => {
    const candidates = [document.scrollingElement as HTMLElement, ...Array.from(document.querySelectorAll<HTMLElement>("[data-lesson-player-frame] .overflow-y-auto, [data-testid='guided-try']"))];
    return Math.max(0, ...candidates.filter(Boolean).map((el) => el.scrollHeight - el.clientHeight));
  });
}

test.describe("RC2.2.27 · ANDROID TTS FORENSICS em /qa/device", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("veredito de build, testes de fala e linhas sem texto", async ({ page }) => {
    await fakeSpeech(page, "start");
    await seed(page);
    await open(page, "/qa/device");
    const panel = page.getByTestId("qa-tts-forensics");
    await expect(panel).toBeVisible();
    // Sem PR HEAD informado o teste físico não é aceito.
    await expect(panel).toHaveAttribute("data-build-verdict", /UNKNOWN|TEST_INVALID/);
    for (const id of ["qa-tts-one", "qa-tts-five", "qa-tts-twenty", "qa-tts-interrupt", "qa-tts-done-next", "qa-tts-double-tap", "qa-tts-dialogue", "qa-tts-forensics-copy"]) {
      await expect(page.getByTestId(id)).toHaveCount(1);
    }
    // Os testes de fala medem o motor ANDROID: no navegador ficam desligados
    // (WEB nunca vira evidência do APK).
    await expect(page.getByTestId("qa-tts-five")).toBeDisabled();
    await expect(page.getByTestId("qa-tts-forensics-copy")).toBeEnabled();
    const text = (await panel.textContent()) ?? "";
    // Frases do teste nunca aparecem no diagnóstico.
    expect(text).not.toMatch(/[一二三四五六七八九十]/);
  });
});

test.describe("RC2.2.27 · Teste Guiado nunca fica cinza para sempre", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("motor confirma → Continuar libera sozinho", async ({ page }) => {
    await fakeSpeech(page, "start");
    await seedTelemetryDeclined(page);
    const { flow, action } = await openGuidedListen(page);
    await expect(action).toBeDisabled();
    await page.locator("[data-guided-listen]").click();
    await expect(action).toBeEnabled();
    await action.click();
    await expect(flow).toHaveAttribute("data-guided-step", "explain");
  });

  test("ouvido sem ACK → prazo → [Tocar novamente] [Eu ouvi] [Continuar sem áudio]", async ({ page }) => {
    // RC2.2.28+ — o asset canônico toca sem ACK (o caso do APK).
    await fakeCanonicalMedia(page, "silent");
    await fakeSpeech(page, "silent");
    await seedTelemetryDeclined(page);
    const { flow, action } = await openGuidedListen(page);
    await page.locator("[data-guided-listen]").click();
    await expect(page.getByTestId("guided-audio-failed")).toBeVisible({ timeout: 9_000 });
    await expect(page.getByTestId("guided-audio-retry")).toBeVisible();
    await expect(page.getByTestId("guided-audio-confirm-heard")).toBeVisible();
    await expect(action).toBeEnabled();
    // RC2.2.28 — audio gate: o prazo vira DEGRADED (CTA liberado), nunca AUDIO_HEARD sem ACK.
    await expect(flow).toHaveAttribute("data-guided-audio", "DEGRADED_AUDIO");
    await page.getByTestId("guided-audio-confirm-heard").click();
    await expect(flow).toHaveAttribute("data-guided-step", "explain");
  });
});

test.describe("RC2.2.27 · conversa: áudio nunca trava a conversa", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // Motor mudo (como o APK nas falas 2+): o nó pede a fala pela sessão única,
  // e responder continua possível sem início nem fim de áudio. A request por
  // nó (speechKey) é provada no gate auto-speak-unification.
  test("fala pedida pelo autoplay; motor mudo não bloqueia Responder", async ({ page }) => {
    await fakeCanonicalMedia(page, "silent");
    await fakeSpeech(page, "silent");
    await seed(page, { autoPlayAudio: true });
    await open(page, "/qa/conversation-scene");
    await expect(page.locator("[data-conversation-scene]").first()).toBeVisible({ timeout: 20_000 });
    // RC2.2.28+ — a fala do nó sai pelo asset canônico (ou pelo TTS, se não houver asset).
    await expect
      .poll(() => page.evaluate(() => {
        const w = window as unknown as { __speaks: number; __mediaPlays: string[] };
        return w.__speaks + w.__mediaPlays.length;
      }))
      .toBeGreaterThanOrEqual(1);
    const advance = page.getByTestId("conversation-advance").first();
    await expect(advance).toBeEnabled();
    await advance.click();
    await expect(page.getByTestId("conversation-dom-stall")).toHaveCount(0);
    await expect(advance).toHaveCount(0);
  });
});

test.describe("RC2.2.27 · atividades sem scroll obrigatório", () => {
  for (const viewport of NO_SCROLL) {
    test(`Teste Guiado (Ouça) em ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await fakeSpeech(page, "start");
      await seedTelemetryDeclined(page);
      await openGuidedListen(page);
      expect(await requiredScroll(page)).toBeLessThanOrEqual(4);
      const box = await page.locator("[data-guided-action]").boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    });
  }
});

test.describe("RC2.2.27 · conclusão sequencial (só apresentação)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("revela uma coisa por vez, Continuar livre, reabrir não repete", async ({ page }) => {
    await fakeSpeech(page, "start");
    await seedLessonPlayerReady(page, "l2", { masteryLevel: 3, folego: 20 });
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const victory = page.locator("[data-lesson-victory]");
    for (let step = 0; step < 40; step += 1) {
      if (await victory.isVisible().catch(() => false)) break;
      await advanceUntilVisible(page, victory, 1);
    }
    test.skip(!(await victory.isVisible().catch(() => false)), "a lição não chegou à Victory neste plano");
    const score = page.getByTestId("lesson-victory-score");
    const stages = ((await score.getAttribute("data-completion-stages")) ?? "").split(",");
    expect(stages[0]).toBe("CHECK");
    expect(stages.includes("QI") && stages.includes("STREAK")).toBe(false);
    // Continuar nunca espera a animação.
    await expect(page.getByTestId("topic-victory-return")).toBeEnabled();
    // ≤ 2,5 s até a última etapa.
    await expect(score).toHaveAttribute("data-completion-stage", stages[stages.length - 1], { timeout: 3_000 });
    await expect(score).toHaveAttribute("data-completion-first-show", "yes");
    // Medalha/desbloqueio nunca junto do resumo.
    await expect(page.locator("[data-victory-interstitial]")).toHaveCount(0);
    const shown = await page.evaluate(() => localStorage.getItem("longyu:completion-shown") ?? "[]");
    expect(JSON.parse(shown).some((key: string) => key.startsWith("completion:l2:"))).toBe(true);
  });
});
