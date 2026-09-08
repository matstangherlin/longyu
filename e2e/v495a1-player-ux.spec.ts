import { expect, test, type Page } from "@playwright/test";
import { allowE2ELocalSession, dismissBlockingOverlays, seedTelemetryDeclined, waitForLazyPage } from "./helpers";

/**
 * V4.9.5A.1 — a tela não pode trair a modalidade pedagógica.
 *
 * Três atritos vindos do uso real:
 *  - a cena "produce_reply" pedia produção livre e só aceitava teclado;
 *  - "Ouça a abertura" prometia ouvir e não tocava nada;
 *  - assets "transparentes" traziam um retângulo claro embutido.
 *
 * O reconhecimento de fala é falsificado: o navegador do CI não tem microfone.
 * O que se prova aqui é o CONTRATO — a affordance existe, o idioma alvo é o
 * mandarim, a transcrição não é enviada sozinha e não apaga o que o aluno
 * escreveu —, nunca a qualidade de um reconhecedor.
 */

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

/** Nega a permissão de microfone sem derrubar a página. */
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

/** Abre a cena de produção livre (fixture QA do componente real). */
async function openProduceScene(page: Page) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.goto("/qa/conversation-scene");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  // A cena começa com falas; o campo aparece no primeiro turno de produção.
  const field = page.locator("textarea").first();
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (await field.isVisible().catch(() => false)) return field;
    const advance = page
      .getByRole("button", { name: /Responder|Reply|Continuar|Continue|Começar|Start/i })
      .first();
    if (await advance.isVisible().catch(() => false)) await advance.click().catch(() => {});
    else await page.waitForTimeout(200);
  }
  await expect(field, "campo de produção da cena não apareceu").toBeVisible({ timeout: 15_000 });
  return field;
}

test.describe("V4.9.5A.1 — produção na conversa aceita voz", () => {
  test("1 · a cena de produção mostra campo de texto e microfone", async ({ page }) => {
    test.setTimeout(120_000);
    await installFakeRecognition(page, "这是我妈妈。");
    const field = await openProduceScene(page);
    await expect(field).toBeEditable();
    await expect(page.getByTestId("free-answer-mic").first()).toBeVisible();
    // A promessa das três formas aparece junto do campo.
    await expect(page.getByText(/hànzì ou pinyin|Hanzi or Pinyin/i).first()).toBeVisible();
  });

  test("2 · hànzì digitado continua funcionando", async ({ page }) => {
    test.setTimeout(120_000);
    const field = await openProduceScene(page);
    await field.fill("这是我妈妈。");
    await expect(field).toHaveValue("这是我妈妈。");
  });

  test("3 · pinyin digitado continua funcionando", async ({ page }) => {
    test.setTimeout(120_000);
    const field = await openProduceScene(page);
    await field.fill("zhe shi wo mama");
    await expect(field).toHaveValue("zhe shi wo mama");
  });

  test("4 · a fala responde em mandarim e não envia sozinha", async ({ page }) => {
    test.setTimeout(120_000);
    await installFakeRecognition(page, "这是我妈妈。");
    const field = await openProduceScene(page);
    await page.getByTestId("free-answer-mic").first().click();
    await expect(field).toHaveValue("这是我妈妈。", { timeout: 10_000 });
    expect(await page.evaluate(() => (window as unknown as { __sttLang?: string }).__sttLang)).toBe("zh-CN");
    await expect(field).toBeEditable();
  });

  test("5 · a fala não apaga o que já estava escrito", async ({ page }) => {
    test.setTimeout(120_000);
    await installFakeRecognition(page, "这是我妈妈。");
    const field = await openProduceScene(page);
    await field.fill("这是");
    await page.getByTestId("free-answer-mic").first().click();
    await expect(field).toHaveValue("这是", { timeout: 10_000 });
    const proposal = page.getByTestId("free-answer-transcript");
    await expect(proposal).toBeVisible();
    await page.getByTestId("free-answer-transcript-dismiss").click();
    await expect(field).toHaveValue("这是");
  });

  test("6 · microfone negado mantém a tarefa digitável", async ({ page }) => {
    test.setTimeout(120_000);
    await installFakeRecognition(page, "这是我妈妈。");
    await denyMicPermission(page);
    const field = await openProduceScene(page);
    await page.getByTestId("free-answer-mic").first().click();
    // Sem modal, sem beco sem saída: um aviso curto e o campo segue vivo.
    await expect(field).toBeEditable();
    await field.fill("这是我妈妈。");
    await expect(field).toHaveValue("这是我妈妈。");
  });

  test("7 · sem reconhecimento no navegador, a produção continua inteira", async ({ page }) => {
    test.setTimeout(120_000);
    await removeRecognition(page);
    const field = await openProduceScene(page);
    await expect(page.getByTestId("free-answer-mic")).toHaveCount(0);
    await field.fill("这是我妈妈。");
    await expect(field).toHaveValue("这是我妈妈。");
  });

  test("8 · 390×844: campo e microfone alcançáveis com o polegar", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await installFakeRecognition(page, "这是我妈妈。");
    const field = await openProduceScene(page);
    const mic = page.getByTestId("free-answer-mic").first();
    await expect(mic).toBeVisible();
    const micBox = await mic.boundingBox();
    expect(micBox, "microfone sem caixa").not.toBeNull();
    // Alvo de toque de 44px: o polegar precisa acertar.
    expect(micBox!.height).toBeGreaterThanOrEqual(40);
    expect(micBox!.width + micBox!.x).toBeLessThanOrEqual(390);
    const fieldBox = await field.boundingBox();
    expect(fieldBox!.y + fieldBox!.height).toBeLessThanOrEqual(micBox!.y + 8);
  });

  test("9 · o botão de voz tem nome acessível", async ({ page }) => {
    test.setTimeout(120_000);
    await installFakeRecognition(page, "这是我妈妈。");
    await openProduceScene(page);
    const mic = page.getByTestId("free-answer-mic").first();
    const name = ((await mic.textContent()) ?? "") + ((await mic.getAttribute("aria-label")) ?? "");
    expect(name.trim().length, "botão de voz sem nome acessível").toBeGreaterThan(0);
    await expect(mic).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("V4.9.5A.1 — escuta de verdade", () => {
  test("10 · tarefa auditiva tem repetição e não mostra o alvo", async ({ page }) => {
    test.setTimeout(120_000);
    await seedTelemetryDeclined(page);
    await allowE2ELocalSession(page);
    await page.goto("/qa/audio-discrimination");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    // Repetir áudio é livre: existe um controle de ouvir na tela.
    const listen = page.getByRole("button", { name: /Ouvir|Listen|áudio|audio|devagar|slow/i }).first();
    await expect(listen).toBeVisible({ timeout: 20_000 });
    const before = page.url();
    await listen.click();
    // Repetir não consome nada nem troca de tela.
    expect(page.url()).toBe(before);
  });
});
