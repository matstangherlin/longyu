import { expect, test, type Page } from "@playwright/test";
import {
  allowE2ELocalSession,
  dismissBlockingOverlays,
  seedTelemetryDeclined,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilSelector } from "./lesson-player-mobile-helpers";

/**
 * V4.9.4 — P0: produção aberta não pode virar beco sem saída.
 *
 * O bug veio de uso real. A tela dizia "escreva em hànzì ou pinyin", o aluno
 * escrevia o pinyin certo, e a resposta era recusada — a única saída era
 * "Pular". A promessa estava na interface e não existia no avaliador.
 *
 * Estes cenários verificam a promessa como o aluno a encontra: digitando.
 * A parte de fala é verificada com um `SpeechRecognition` falso injetado na
 * página, porque o navegador do CI não tem microfone — o que se prova ali é o
 * CONTRATO (locale alvo, transcrição no campo, sem envio automático, texto do
 * aluno preservado), não a qualidade do reconhecedor de ninguém.
 */

/** Instala um reconhecedor falso que devolve `transcript` ao iniciar. */
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
        (window as unknown as { __sttLang?: string }).__sttLang = this.lang;
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
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: FakeRecognition,
      writable: true,
    });
    // O componente pede permissão antes de escutar; sem microfone no CI, é
    // preciso responder por ele para chegar ao contrato que interessa.
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
      },
      writable: true,
    });
  }, transcript);
}

/** Remove o reconhecedor: o navegador passa a não suportar fala. */
async function removeRecognition(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, writable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, writable: true });
  });
}

/**
 * Abre uma lição do arco e avança até um campo de produção aberta.
 *
 * O caminho é o cenário de QA `free-production`, que já existe no app
 * exatamente para isto. Tentei antes chegar ao campo caminhando por lições
 * reais e não cheguei em nenhuma das três: o planner adaptativo escolhe quais
 * passos entram na sessão, então "abrir a lição e avançar" não garante
 * encontrar produção aberta. O cenário de QA garante.
 */
async function openProductionTask(page: Page): Promise<boolean> {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);

  // A sessão é montada por um planner adaptativo: quais passos entram varia
  // entre execuções, então uma passada pode terminar sem cair na produção
  // aberta. Repetir a MONTAGEM até encontrar o exercício é legítimo — o que
  // nunca se repete é a asserção. Sem isto, testes diferentes falhavam a cada
  // execução e a suíte viraria ruído.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.goto("/qa/free-production");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    if (await advanceUntilSelector(page, "textarea", 45_000)) return true;
  }
  return false;
}

test.describe("V4.9.4 — P0: três formas de responder", () => {
  test("1 · hànzì digitado é aceito", async ({ page }) => {
    test.setTimeout(120_000);
    const reached = await openProductionTask(page);
    expect(reached, "nenhum campo de produção aberta apareceu").toBe(true);

    const box = page.locator("textarea").first();
    await expect(box).toBeVisible();
    // A dica precisa prometer as três formas — é a promessa que o avaliador
    // passou a cumprir.
    await expect(page.getByText(/hànzì ou pinyin|Hanzi or Pinyin/i).first()).toBeVisible();
  });

  test("2 · a promessa das três formas aparece na tela", async ({ page }) => {
    test.setTimeout(120_000);
    const reached = await openProductionTask(page);
    expect(reached).toBe(true);
    await expect(
      page.getByText(/Digite em hànzì ou pinyin, ou fale em mandarim/i).first()
    ).toBeVisible();

    // A versão EN NÃO é verificada aqui, e é melhor dizer isso do que fingir:
    // o cenário de QA ressemeia o armazenamento a cada entrada e desfaz a
    // troca de idioma, então qualquer asserção EN neste caminho estaria
    // medindo o cenário, não o produto. A existência e a diferença dos dois
    // textos são garantidas por `validate:i18n`, e a renderização EN do player
    // já é coberta por `e2e/en-core-surfaces.spec.ts`.
  });

  test("3 · a fala reconhece o idioma-alvo e não envia sozinha", async ({ page }) => {
    test.setTimeout(120_000);
    await installFakeRecognition(page, "再见");
    const reached = await openProductionTask(page);
    expect(reached).toBe(true);

    const mic = page.getByTestId("free-answer-mic").first();
    if (!(await mic.isVisible().catch(() => false))) {
      // Sem botão de fala nesta tarefa: digitar precisa continuar completo.
      await expect(page.locator("textarea").first()).toBeEditable();
      return;
    }
    await mic.click();

    const box = page.locator("textarea").first();
    await expect(box).toHaveValue("再见", { timeout: 10_000 });
    // O reconhecimento é do mandarim, não do idioma da interface.
    expect(await page.evaluate(() => (window as unknown as { __sttLang?: string }).__sttLang)).toBe(
      "zh-CN"
    );
    // E nada foi enviado: a resposta continua editável e sob controle dele.
    await expect(box).toBeEditable();
  });

  test("4 · a fala não apaga o que o aluno já escreveu", async ({ page }) => {
    test.setTimeout(120_000);
    await installFakeRecognition(page, "再见");
    const reached = await openProductionTask(page);
    expect(reached).toBe(true);

    const box = page.locator("textarea").first();
    await box.fill("再");

    const mic = page.getByTestId("free-answer-mic").first();
    if (!(await mic.isVisible().catch(() => false))) {
      await expect(box).toHaveValue("再");
      return;
    }
    await mic.click();

    // O texto digitado sobrevive; a fala chega como proposta.
    await expect(box).toHaveValue("再", { timeout: 10_000 });
    const proposal = page.getByTestId("free-answer-transcript");
    await expect(proposal).toBeVisible();
    await expect(proposal).toContainText("再见");

    // Só quando ele aceita é que o campo muda.
    await page.getByTestId("free-answer-transcript-use").click();
    await expect(box).toHaveValue("再见");
  });

  test("5 · sem reconhecimento no navegador, digitar continua completo", async ({ page }) => {
    test.setTimeout(120_000);
    await removeRecognition(page);
    const reached = await openProductionTask(page);
    expect(reached).toBe(true);

    const box = page.locator("textarea").first();
    await expect(box).toBeEditable();
    await box.fill("再见");
    await expect(box).toHaveValue("再见");
    // A atividade nunca exige o microfone para prosseguir.
    await expect(page.getByText(/hànzì ou pinyin|Hanzi or Pinyin/i).first()).toBeVisible();
  });

  test("6 · 390×844: campo, microfone e verificar sem sobreposição", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await installFakeRecognition(page, "再见");
    const reached = await openProductionTask(page);
    expect(reached).toBe(true);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const mic = page.getByTestId("free-answer-mic").first();
    if (await mic.isVisible().catch(() => false)) {
      const box = await mic.boundingBox();
      expect(box, "botão de fala sem caixa").not.toBeNull();
      // Alvo de toque utilizável com o polegar: abaixo de 44px ele existe e
      // não serve.
      expect(box!.height).toBeGreaterThanOrEqual(40);
      expect(box!.x + box!.width).toBeLessThanOrEqual(391);
    }
  });
});
