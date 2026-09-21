import { expect, test, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedAtCultureGate,
  seedInstructionLocale,
  seedLessonPlayerReady,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";
import { TONE_TRANSFER_TASKS } from "../src/data/toneTransfer";
import { CULTURE_PROGRESSION_GATES } from "../src/data/cultureProgressionGates";

/**
 * RC2.2.7 — o tom deixou o exercício de tom e entrou na comunicação.
 *
 * O que se prova aqui é CONTRATO, nunca qualidade de reconhecedor: o navegador
 * do CI não tem microfone, então o reconhecimento é falsificado. A tarefa
 * existe, aceita voz, sobrevive sem voz, e o lembrete tonal nunca afirma que o
 * tom do aluno saiu certo — porque `analyzePronunciation` compara sílabas e não
 * mede contorno nenhum.
 */

const L3_TASK = TONE_TRANSFER_TASKS.find((task) => task.id === "tt-l3-estou-bem")!;

async function installFakeRecognition(page: Page, transcript: string) {
  await page.addInitScript((text: string) => {
    class FakeRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [Object.assign([{ transcript: text, confidence: 0.9 }], { isFinal: true })],
          });
          this.onend?.();
        }, 60);
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
  }, transcript);
}

async function removeRecognition(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, writable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, writable: true });
  });
}

async function denyMicPermission(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          throw new Error("NotAllowedError");
        },
      },
      writable: true,
    });
  });
}

/**
 * Abre l3 e caminha até ESTA tarefa de transferência tonal.
 *
 * O filtro pela situação é proposital: o planner adaptativo também gera
 * `free_production` em runtime, e pegar "a primeira" faria o teste medir um
 * passo gerado em vez do passo autoral. A situação é a identidade da tarefa.
 */
async function openToneTransferStep(page: Page, locale: "pt-BR" | "en" = "pt-BR") {
  await seedLessonPlayerReady(page, L3_TASK.lessonId);
  await page.goto(`/licao/${L3_TASK.lessonId}/player`);
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);

  const situationHead = (locale === "en" ? L3_TASK.situationEn : L3_TASK.situationPt).slice(0, 40);
  const production = page
    .locator('[data-production-step="free_production"]')
    .filter({ hasText: situationHead })
    .first();
  const reached = await advanceUntilVisible(page, production, 30);
  expect(reached, "a tarefa de transferência tonal não foi alcançada em l3").toBe(true);
  return production;
}

test.describe("RC2.2.7 — transferência tonal na lição", () => {
  test("T1 — a tarefa existe, pede produção e a situação não entrega a frase", async ({ page }) => {
    test.setTimeout(150_000);
    await installFakeRecognition(page, L3_TASK.targetHanzi);
    const production = await openToneTransferStep(page);

    await expect(production).toBeVisible();
    const situation = production.locator("[data-production-situation]");
    await expect(situation).toBeVisible();

    // Situação com hànzì transformaria produção em cópia.
    const situationText = (await situation.textContent()) ?? "";
    expect(situationText).not.toMatch(/[㐀-鿿]/u);

    // TRANSFER não mostra a resposta: nada de alternativas prontas.
    await expect(production.locator("[data-production-learned]")).toHaveCount(0);
  });

  test("T2 — a tarefa aceita voz: microfone ao lado do campo", async ({ page }) => {
    test.setTimeout(150_000);
    await installFakeRecognition(page, L3_TASK.targetHanzi);
    const production = await openToneTransferStep(page);

    await expect(production.getByTestId("free-answer-mic")).toBeVisible();
    await expect(production.locator("textarea, input[type='text']").first()).toBeEditable();
  });

  test("T3 — sem reconhecimento no navegador, a tarefa continua digitável", async ({ page }) => {
    test.setTimeout(150_000);
    await removeRecognition(page);
    const production = await openToneTransferStep(page);

    // Sem microfone a tarefa não pode simplesmente sumir — ela vira texto.
    await expect(production.getByTestId("free-answer-mic")).toHaveCount(0);
    await expect(production.locator("textarea, input[type='text']").first()).toBeEditable();
  });

  test("T4 — microfone negado não trava a tarefa", async ({ page }) => {
    test.setTimeout(150_000);
    await installFakeRecognition(page, L3_TASK.targetHanzi);
    await denyMicPermission(page);
    const production = await openToneTransferStep(page);

    const mic = production.getByTestId("free-answer-mic");
    await expect(mic).toBeVisible();
    await mic.click();

    // Permissão negada avisa e devolve o teclado; nunca deixa a tela morta.
    await expect(production.locator("textarea, input[type='text']").first()).toBeEditable();
  });

  test("T5 — o lembrete tonal vem DEPOIS da tentativa e não julga o tom", async ({ page }) => {
    test.setTimeout(150_000);
    await installFakeRecognition(page, L3_TASK.targetHanzi);
    const production = await openToneTransferStep(page);

    // Antes de responder, o lembrete não pode estar na tela: seria a resposta.
    const reminderHead = L3_TASK.toneReminderPt.slice(0, 30);
    await expect(page.getByText(reminderHead, { exact: false })).toHaveCount(0);

    const field = production.locator("textarea, input[type='text']").first();
    await field.fill(L3_TASK.targetHanzi);
    await field.press("Enter");

    await expect(page.getByText(reminderHead, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });

    // E em lugar nenhum da tela o app diz ter medido o tom do aluno.
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toMatch(/seu tom/u);
    expect(body).not.toMatch(/tom (correto|certo|errado)/u);
  });

  test("T6 — EN: a mesma tarefa aparece em inglês, sem português sobrando", async ({ page }) => {
    test.setTimeout(150_000);
    await seedInstructionLocale(page, "en");
    await installFakeRecognition(page, L3_TASK.targetHanzi);
    const production = await openToneTransferStep(page, "en");

    const situation = production.locator("[data-production-situation]");
    await expect(situation).toContainText(L3_TASK.situationEn.slice(0, 40));
    await expect(situation).not.toContainText(L3_TASK.situationPt.slice(0, 40));
  });
});

test.describe("RC2.2.7 — o que veio antes continua de pé", () => {
  test("T7 — RC2.2.6: o marco cultural continua trancando o tópico guardado", async ({ page }) => {
    test.setTimeout(150_000);
    const gate = CULTURE_PROGRESSION_GATES.find((entry) => entry.id === "gate-social-etiquette")!;
    await seedAtCultureGate(page, gate.beforeTopicId);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const expandAll = page.getByRole("button", { name: /Expandir tudo|Expand all/i });
    if (await expandAll.count()) await expandAll.first().click().catch(() => {});

    const marker = page.locator(`[data-journey-culture-gate="${gate.id}"]`);
    await expect(marker).toBeVisible();
    await expect(marker).toHaveAttribute("data-culture-gate-status", "locked");
    await expect(marker.getByTestId("culture-gate-cta")).toBeVisible();
  });

  test("T8 — RC2.2.6: a voz do dragão continua parando quando o texto completa", async ({ page }) => {
    test.setTimeout(150_000);
    await page.addInitScript(() => {
      const scope = window as unknown as Record<string, unknown> & { __blips?: number };
      const Ctor = (scope.AudioContext ?? scope.webkitAudioContext) as
        | { prototype: Record<string, unknown> }
        | undefined;
      if (!Ctor) return;
      scope.__blips = 0;
      const proto = Ctor.prototype;
      const original = proto.createOscillator as (this: unknown) => unknown;
      proto.createOscillator = function patched(this: unknown) {
        scope.__blips = (scope.__blips ?? 0) + 1;
        return original.call(this);
      };
    });

    const gate = CULTURE_PROGRESSION_GATES.find((entry) => entry.id === "gate-social-etiquette")!;
    await seedAtCultureGate(page, gate.beforeTopicId);
    await page.goto("/jornada");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const expandAll = page.getByRole("button", { name: /Expandir tudo|Expand all/i });
    if (await expandAll.count()) await expandAll.first().click().catch(() => {});

    const marker = page.locator(`[data-journey-culture-gate="${gate.id}"]`);
    const dialogue = marker.locator("[data-testid='journey-guide-dialogue']");
    await expect(dialogue).toBeVisible();

    // Mesmo contrato do RC2.2.6, e pela mesma razão: ler a fase e clicar têm de
    // acontecer no mesmo tick, senão o clique deixa de antecipar e avança.
    await dialogue.evaluate(async (el) => {
      const deadline = Date.now() + 5_000;
      while (el.getAttribute("data-guide-phase") === "idle" && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
      if (el.getAttribute("data-guide-phase") !== "typing") return;
      el.querySelector<HTMLElement>("[data-testid='guide-speech-box']")?.click();
    });
    await expect(dialogue).toHaveAttribute("data-guide-phase", /complete|done/);

    const afterComplete = await page.evaluate(
      () => (window as unknown as { __blips?: number }).__blips ?? 0
    );
    await page.waitForTimeout(600);
    const later = await page.evaluate(() => (window as unknown as { __blips?: number }).__blips ?? 0);
    expect(later, "nenhuma voz nova depois do texto completo").toBe(afterComplete);
  });
});
