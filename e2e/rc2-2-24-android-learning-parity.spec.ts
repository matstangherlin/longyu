import { expect, test, type Page } from "@playwright/test";
import { fakeCanonicalMedia } from "./fake-canonical-media";
import { allowE2ELocalSession, chooseCourseIfAsked, dismissBlockingOverlays, matureDiscoveryState, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * RC2.2.24 — paridade Android (parte Web/E2E). Prova o CONTRATO no navegador:
 * CTA do Teste Guiado nunca morto, transição de conversa com DOM visível,
 * Tone Trainer em focus sem scroll, Tone Trace por ponteiro, volta à Jornada
 * pela âncora, handoff entre abas e conta única. WEB PASS ≠ APK PASS: o
 * aparelho do owner continua NOT_RUN.
 */
const STORE_VERSION = 21;
const THROUGH_L2 = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi", "p1-engine-2-lab", "l1", "l2"];

async function seed(page: Page, state: Record<string, unknown>) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  const payload = JSON.stringify({ state: { accountSetupComplete: true, courseDirection: "pt-zh", holdAchievementModals: true, guidance: { version: 2, enabled: false, initialized: true, records: {} }, ...state }, version: STORE_VERSION });
  await page.addInitScript((value: string) => {
    if (sessionStorage.getItem("rc2224-seeded")) return;
    sessionStorage.setItem("rc2224-seeded", "1");
    localStorage.setItem("longyu-v1", value);
  }, payload);
}

async function open(page: Page, route: string) {
  await page.goto(route);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

/** speechSynthesis controlado: `start` decide se o motor anuncia o início. */
async function fakeSpeech(page: Page, mode: "start" | "end-only") {
  await page.addInitScript((m: string) => {
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
          if (m === "start") window.setTimeout(() => u.onstart?.(), 10);
          window.setTimeout(() => u.onend?.(), 60);
        },
      },
    });
    (window as unknown as { SpeechSynthesisUtterance: typeof U }).SpeechSynthesisUtterance = U;
  }, mode);
}

async function inViewport(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  const viewport = page.viewportSize()!;
  expect(box, selector).not.toBeNull();
  expect(box!.y + box!.height, `${selector} dentro da dobra`).toBeLessThanOrEqual(viewport.height);
}

test.describe("RC2.2.24 · Teste Guiado: ouvir nunca deixa botão morto", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("motor confirma início → Continuar; Ouvir·Ouvir·Continuar avança UMA etapa", async ({ page }) => {
    // RC2.2.28+ — o "Ouça" toca o asset canônico; o player confirma o início.
    await fakeCanonicalMedia(page, "start");
    await fakeSpeech(page, "start");
    await seedTelemetryDeclined(page);
    await open(page, "/");
    await page.getByTestId("landing-guided-try").click();
    await chooseCourseIfAsked(page, "pt-zh");
    const flow = page.getByTestId("guided-try");
    const action = page.locator("[data-guided-action]");
    if ((await flow.getAttribute("data-guided-step")) === "intro") await action.click();
    await expect(flow).toHaveAttribute("data-guided-step", "listen");
    await expect(action).toBeDisabled();
    await page.locator("[data-guided-listen]").click();
    await page.locator("[data-guided-listen]").click();
    await expect(action).toBeEnabled();
    // CTA liberado por reprodução real (início confirmado), não por modo degradado.
    await expect(page.getByTestId("guided-listen-status")).toHaveAttribute("data-listen-state", /PLAYING|HEARD/);
    await action.click();
    await expect(flow).toHaveAttribute("data-guided-step", "explain");
  });

  test("sem início confirmado: falha explícita com saídas, nunca botão morto", async ({ page }) => {
    // Asset e fallback TTS terminam sem anunciar início.
    await fakeCanonicalMedia(page, "end-only");
    await fakeSpeech(page, "end-only");
    await seedTelemetryDeclined(page);
    await open(page, "/");
    await page.getByTestId("landing-guided-try").click();
    await chooseCourseIfAsked(page, "pt-zh");
    const flow = page.getByTestId("guided-try");
    const action = page.locator("[data-guided-action]");
    if ((await flow.getAttribute("data-guided-step")) === "intro") await action.click();
    await page.locator("[data-guided-listen]").click();
    await expect(page.getByTestId("guided-audio-failed")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("guided-audio-retry")).toBeVisible();
    await expect(action).toBeEnabled();
    await action.click();
    await expect(flow).toHaveAttribute("data-guided-step", "explain");
  });
});

test.describe("RC2.2.24 · conversa: DOM do nó novo aparece, áudio só acompanha", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const autoPlayAudio of [true, false]) {
    test(`/qa/conversation-scene avança com autoPlayAudio=${autoPlayAudio}`, async ({ page }) => {
      await fakeSpeech(page, "start");
      await seed(page, { completedLessons: THROUGH_L2, autoPlayAudio });
      await open(page, "/qa/conversation-scene");
      const scene = page.locator("[data-conversation-scene]").first();
      await expect(scene).toBeVisible({ timeout: 20_000 });
      const advance = page.getByTestId("conversation-advance").first();
      for (let i = 0; i < 4; i += 1) {
        if (!(await advance.isVisible().catch(() => false))) break;
        const before = await page.locator("[data-conversation-current-node]").first().getAttribute("data-conversation-current-node");
        const label = (await advance.textContent()) ?? "";
        if (/Responder|Reply/.test(label)) break;
        await advance.click();
        await expect(page.getByTestId("conversation-dom-stall")).toHaveCount(0);
        const after = await page.locator("[data-conversation-current-node]").first().getAttribute("data-conversation-current-node").catch(() => null);
        if (after) expect(after).not.toBe(before);
      }
      const trace = await page.evaluate(() => (window as Window & { __longyuConversationTrace?: { event: string }[] }).__longyuConversationTrace ?? []);
      const events = trace.map((entry) => entry.event);
      if (events.includes("conversation_target_resolved")) {
        expect(events).toContain("conversation_state_committed");
        expect(events).toContain("conversation_dom_next_visible");
        expect(events).not.toContain("conversation_dom_stall");
      }
    });
  }
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  test.describe(`RC2.2.24 · Tone Trainer em ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test("hub → Começar → focus: sem TopBar/TabBar/stats; opções e CTA na dobra", async ({ page }) => {
      await fakeSpeech(page, "start");
      await seed(page, { completedLessons: [...THROUGH_L2, "l2-rev"], ...matureDiscoveryState(), toneTrainer: { "ma-14": { packId: "ma-14", attempts: 1, bestScore: 1, bestTotal: 4, completed: false, lastAttemptAt: 1, totalRounds: 4, totalCorrect: 1, errorsByTone: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } } });
      await open(page, "/som");
      await expect(page.getByTestId("tone-trainer-start")).toBeVisible();
      await page.getByTestId("tone-trainer-start").click();
      if (await page.locator("[data-tone-microlesson]").count()) await page.getByTestId("tone-microlesson-skip").click();
      await expect(page.locator("[data-tone-trainer-focus]")).toBeVisible();
      await expect(page.locator("[data-app-bottom-nav]")).toHaveCount(0);
      await expect(page.locator("[data-tone-trainer-focus]")).not.toContainText(/Melhor|Fraco|Atalhos|Packs progressivos/);
      await inViewport(page, "[data-testid='tone-round-options']");
      await inViewport(page, "[data-testid='tone-round-next']");
      await page.locator("[data-testid='tone-round-options'] button").first().click();
      await expect(page.getByTestId("tone-round-feedback")).toBeVisible();
      await inViewport(page, "[data-testid='tone-round-next']");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
}

test.describe("RC2.2.24 · Tone Trace por ponteiro", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const pointerType of ["mouse", "touch"] as const) {
    test(`traço completo com ${pointerType} reduz a ajuda e nunca fala de pitch`, async ({ page }) => {
      await fakeSpeech(page, "start");
      await seed(page, { completedLessons: [...THROUGH_L2, "l2-rev"], ...matureDiscoveryState(), toneTrainer: {} });
      await open(page, "/som");
      await page.getByTestId("tone-trainer-start").click();
      const micro = page.locator("[data-tone-microlesson]");
      await expect(micro).toBeVisible();
      for (let i = 0; i < 3 && (await micro.getAttribute("data-tone-stage")) !== "TRACE"; i += 1) await page.getByTestId("tone-microlesson-continue").click();
      await expect(micro).toHaveAttribute("data-tone-stage", "TRACE");
      const surface = page.getByTestId("tone-trace-surface");
      const box = (await surface.boundingBox())!;
      const trace = page.locator("[data-tone-trace]");
      const point = (fraction: number) => ({ clientX: box.x + box.width * fraction, clientY: box.y + box.height / 2, pointerId: 7, pointerType, isPrimary: true, bubbles: true });
      await surface.dispatchEvent("pointerdown", point(0.1));
      for (const fraction of [0.3, 0.5, 0.7, 0.92]) await surface.dispatchEvent("pointermove", point(fraction));
      await surface.dispatchEvent("pointerup", point(0.92));
      await expect(trace).toHaveAttribute("data-trace-completions", "1");
      await expect(trace).toHaveAttribute("data-trace-level", "PARTIAL_LINE");
      await expect(page.getByTestId("tone-trace-message")).not.toContainText(/correto|pitch/i);
      // Rastrear nunca é obrigatório: Continuar livre.
      await expect(page.getByTestId("tone-microlesson-continue")).toBeEnabled();
    });
  }
});

test.describe("RC2.2.24 · volta à Jornada e handoff", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("âncora de Cultura: banner no destino e volta ao nó (não ao topo)", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2, ...matureDiscoveryState() });
    await page.addInitScript(() => {
      sessionStorage.setItem("longyu:journey-return-anchor", JSON.stringify({ phaseId: null, unitId: null, lessonId: "l2", nodeId: null, activitySource: "CULTURE", returnReason: "REQUIRED_ACTIVITY", completedAtLeave: 8, createdAt: Date.now() }));
    });
    await open(page, "/cultura");
    await expect(page.getByTestId("journey-handoff-banner")).toBeVisible();
    await page.getByTestId("journey-handoff-back").click();
    await waitForLazyPage(page);
    const target = page.locator("[data-journey-return-target]");
    await expect(target).toHaveCount(1, { timeout: 10_000 });
    await expect(target).toBeInViewport();
  });
});

test.describe("RC2.2.24 · uma conta", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Dados e backup sem perfis locais nem 'Usar perfil'", async ({ page }) => {
    await seed(page, { completedLessons: THROUGH_L2 });
    await open(page, "/dados-locais");
    await expect(page.getByText("Dados e backup").first()).toBeVisible();
    await expect(page.getByText(/Perfis neste dispositivo|Usar perfil|Aluno local/)).toHaveCount(0);
  });
});
