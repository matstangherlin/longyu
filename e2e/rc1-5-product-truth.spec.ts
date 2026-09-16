import { expect, test, type Page } from "@playwright/test";
import {
  allowE2ELocalSession,
  dismissBlockingOverlays,
  seedLessonPlayerReady,
  seedMissionsSession,
  seedTelemetryDeclined,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";
import { todayKey } from "../src/lib/storage";

/**
 * RC1.5 — verdade do produto e verdade da telemetria (P15, P16).
 *
 * Os gates Node provam o contrato. Estas specs provam o que o aluno vê e o que
 * o app grava, contra o build de preview:
 *
 * - a /fala não vende conversação com IA para o grátis nem para o Pro (P15,
 *   P15.1);
 * - seis autoavaliações somam seis revisões e ZERO falas (P15.2);
 * - a missão de falar não anda com clique, e some onde não há microfone (P16).
 */

const STORE_KEY = "longyu-v1";

/**
 * Lição do runbook cujo plano gerado chega a uma tarefa de fala.
 *
 * O plano de sessão é gerado (RC1.4), então não basta a lição ter um passo
 * `listen` no dado cru — `l2` tem, e mesmo assim o plano dela nunca oferece o
 * "Falar". Esta foi escolhida por observação do player, não por leitura do
 * currículo.
 */
const SPEAKING_LESSON = "p1-primeiros-hanzi";

interface DailyTaskSnapshot {
  phrasesSpoken: number;
  phrasesReviewed: number;
}

/** Lê os contadores do dia direto do estado persistido. */
async function readDailyTasks(page: Page): Promise<DailyTaskSnapshot> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    const tasks = raw ? JSON.parse(raw)?.state?.dailyTasks ?? {} : {};
    return {
      phrasesSpoken: Number(tasks.phrasesSpoken ?? 0),
      phrasesReviewed: Number(tasks.phrasesReviewed ?? 0),
    };
  }, STORE_KEY);
}

/** Abre a /fala com Cargas suficientes para a sessão de treino não bater paywall. */
async function openFala(page: Page, { pro = false }: { pro?: boolean } = {}) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await seedMissionsSession(page, {
    isPremium: pro,
    dailyEnergy: {
      date: todayKey(),
      charges: 20,
      maxCharges: 20,
      usedCharges: 0,
      bonusChargesClaimed: {},
    },
  });
  await page.goto("/fala");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
}

test.describe("RC1.5 — /fala não vende o que não existe", () => {
  test("P15 — usuário grátis não encontra CTA nem paywall de IA", async ({ page }) => {
    await openFala(page, { pro: false });

    // O CTA que existia até a RC1.4.
    await expect(page.getByRole("button", { name: /Praticar com IA/i })).toHaveCount(0);
    await expect(page.getByText(/Fala com IA/i)).toHaveCount(0);
    await expect(page.getByText(/correção de pronúncia/i)).toHaveCount(0);
    await expect(page.getByText(/[Rr]oleplays?/)).toHaveCount(0);

    // Nenhum paywall de fala pode sequer existir na tela.
    await expect(page.locator('[data-testid="pro-paywall-speech"]')).toHaveCount(0);

    // O que a tela promete é o que ela faz.
    await expect(page.getByText(/O que este treino faz/i)).toBeVisible();
  });

  test("P15.1 — o assinante não recebe entitlement de recurso inexistente", async ({ page }) => {
    await openFala(page, { pro: true });

    await expect(page.getByRole("button", { name: /Em breve no Pro/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Praticar com IA/i })).toHaveCount(0);
    await expect(page.getByText(/Fala com IA/i)).toHaveCount(0);

    // O roadmap aparece — mas COMO roadmap: estado lido do registro, sem botão,
    // sem badge Pro, sem nada que se pareça com entitlement utilizável.
    const roadmap = page.locator('[data-testid="feature-roadmap-ai_roleplay"]');
    await expect(roadmap).toHaveAttribute("data-feature-status", "coming_soon");
    await expect(roadmap.getByRole("button")).toHaveCount(0);
    await expect(roadmap.getByText(/Em desenvolvimento/i)).toBeVisible();
    await expect(roadmap.getByText(/Pro/)).toHaveCount(0);
  });

  test("P15.2 — seis autoavaliações somam 6 revisões e 0 falas", async ({ page }) => {
    await openFala(page, { pro: false });

    const before = await readDailyTasks(page);

    for (let i = 0; i < 6; i += 1) {
      await page.getByRole("button", { name: "Mostrar significado" }).click();
      await page.getByRole("button", { name: "Já sabia" }).click();
      // O próximo card precisa estar montado antes do clique seguinte.
      await expect(page.getByRole("button", { name: "Mostrar significado" })).toBeVisible();
    }

    await expect
      .poll(async () => (await readDailyTasks(page)).phrasesReviewed, { timeout: 10_000 })
      .toBe(before.phrasesReviewed + 6);

    const after = await readDailyTasks(page);
    expect(
      after.phrasesSpoken,
      'clicar "Já sabia" seis vezes não pode registrar nenhuma fala'
    ).toBe(before.phrasesSpoken);
  });
});

/**
 * Microfone de mentira, contrato de verdade (P15.3).
 *
 * O headless não tem microfone nem serviço de voz, então o que se dubla é a
 * PLATAFORMA — `SpeechRecognition` — e não o nosso contrato. Tudo do lado do
 * Longyu roda como em produção: `recognizeOnce`, a chave de tentativa, a
 * captura obrigatória e o store. O dublê emite `onresult` como o navegador
 * emitiria, inclusive o resultado repetido que o Chrome às vezes manda.
 */
async function stubSpeechRecognition(page: Page, transcript: string) {
  await page.addInitScript((heard) => {
    class FakeRecognition {
      lang = "zh-CN";
      interimResults = false;
      maxAlternatives = 1;
      continuous = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        setTimeout(() => {
          const event = {
            resultIndex: 0,
            results: [Object.assign([{ transcript: heard }], { isFinal: true })],
          };
          // Duas emissões para o MESMO "Falar": é o caso real que faria a
          // tentativa contar duas vezes se a chave não fosse idempotente.
          this.onresult?.(event);
          this.onresult?.(event);
          this.onend?.();
        }, 50);
      }

      stop() {
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }
    }
    const target = window as unknown as Record<string, unknown>;
    target.SpeechRecognition = FakeRecognition;
    target.webkitSpeechRecognition = FakeRecognition;
    // `ensureMicPermission` precisa conceder para o fluxo chegar ao reconhecedor.
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [] }) },
    });
  }, transcript);
}

test.describe("RC1.5 — tentativa real de fala", () => {
  test("P15.3 — uma tentativa com voz capturada soma exatamente 1", async ({ page }) => {
    await stubSpeechRecognition(page, "你好");
    await seedLessonPlayerReady(page, SPEAKING_LESSON, { masteryLevel: 0, folego: 20 });
    await page.goto(`/licao/${SPEAKING_LESSON}/player`);
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    // O plano de sessão é gerado (RC1.4), então a ordem crua da lição não vale:
    // avança pelas tarefas até a tarefa de escuta, que traz o "Falar".
    const speakButton = page.getByRole("button", { name: /^Falar$/ }).first();
    const reached = await advanceUntilVisible(page, speakButton, 30);
    expect(reached, "a lição precisa chegar a uma tarefa de fala").toBe(true);

    const before = await readDailyTasks(page);
    await speakButton.click();

    // Duas emissões do mesmo reconhecimento não podem virar duas falas.
    await expect
      .poll(async () => (await readDailyTasks(page)).phrasesSpoken, { timeout: 10_000 })
      .toBe(before.phrasesSpoken + 1);
    await page.waitForTimeout(500);
    expect((await readDailyTasks(page)).phrasesSpoken).toBe(before.phrasesSpoken + 1);

    // E fala não é revisão: o contador de revisão não se mexeu.
    expect((await readDailyTasks(page)).phrasesReviewed).toBe(before.phrasesReviewed);
  });
});

test.describe("RC1.5 — missão de fala exige fala", () => {
  test("P16 — autoavaliação não move a missão de falar", async ({ page }) => {
    // Garante a plataforma: sem isto a missão poderia simplesmente não existir
    // e a spec passaria sem ter verificado nada.
    await stubSpeechRecognition(page, "你好");
    await openFala(page, { pro: false });

    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("button", { name: "Mostrar significado" }).click();
      await page.getByRole("button", { name: "Já sabia" }).click();
      await expect(page.getByRole("button", { name: "Mostrar significado" })).toBeVisible();
    }

    await page.goto("/missoes");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    // Com reconhecimento de voz disponível, a missão EXISTE — e não pode ter
    // andado: nenhuma das três revisões foi fala.
    const speakMission = page.locator('[data-mission-id="daily-speak"]');
    await expect(speakMission).toHaveAttribute("data-mission-status", "incomplete");

    const tasks = await readDailyTasks(page);
    expect(tasks.phrasesSpoken, "nenhuma fala foi tentada").toBe(0);
    expect(tasks.phrasesReviewed, "três revisões aconteceram").toBeGreaterThanOrEqual(3);
  });

  test("P8.2 — sem reconhecimento de voz, a missão de falar não é oferecida", async ({ page }) => {
    await seedTelemetryDeclined(page);
    await allowE2ELocalSession(page);
    // Navegador sem SpeechRecognition: a missão seria impossível.
    await page.addInitScript(() => {
      delete (window as unknown as Record<string, unknown>).SpeechRecognition;
      delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    });
    await seedMissionsSession(page, {});

    await page.goto("/missoes");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.locator('[data-mission-id="daily-speak"]')).toHaveCount(0);
  });
});
