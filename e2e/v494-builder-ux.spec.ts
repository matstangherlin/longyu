import { test, expect, type Page } from "@playwright/test";
import {
  allowE2ELocalSession,
  dismissBlockingOverlays,
  seedTelemetryDeclined,
  waitForLazyPage,
} from "./helpers";

/**
 * V4.9.4 UX hardening — o Hanzi Builder visto por quem nunca leu o código.
 *
 * Os três atritos que originaram esta remessa vieram de uso real: dava para
 * colocar uma peça e não dava para descobrir como tirá-la, e o áudio do hànzì
 * só aparecia depois de acertar — justamente quem não lembrava do som ficava
 * sem ele.
 *
 * A fixture `/qa/hanzi-builder` monta o componente REAL. O builder padrão é
 * 森 (木 + 木 + 木): três peças de glifo idêntico com ids distintos, que é o
 * caso em que "remover uma" pode virar "remover todas" sem ninguém perceber.
 */

const PLACED = '[data-builder-piece="placed"]';
const AVAILABLE = '[data-builder-piece="available"]';

async function openBuilder(page: Page, builderId?: string) {
  await seedTelemetryDeclined(page);
  await allowE2ELocalSession(page);
  await page.goto(builderId ? `/qa/hanzi-builder?builder=${builderId}` : "/qa/hanzi-builder");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);
  await expect(page.locator("[data-qa-builder-fixture]")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(AVAILABLE).first()).toBeVisible({ timeout: 15_000 });
}

/** Coloca as `count` primeiras peças disponíveis, uma a uma. */
async function placePieces(page: Page, count: number) {
  for (let i = 0; i < count; i += 1) {
    await page.locator(AVAILABLE).first().click();
    await expect(page.locator(PLACED)).toHaveCount(i + 1);
  }
}

test.describe("V4.9.4 — montar e desmontar sem conhecimento oculto", () => {
  test("1 · selecionar uma peça a coloca na montagem", async ({ page }) => {
    await openBuilder(page);
    await placePieces(page, 1);
    await expect(page.locator(PLACED)).toHaveCount(1);
  });

  test("2 · selecionar várias peças", async ({ page }) => {
    await openBuilder(page);
    await placePieces(page, 3);
    await expect(page.locator(PLACED)).toHaveCount(3);
  });

  test("3 · toda peça colocada mostra que pode ser removida", async ({ page }) => {
    await openBuilder(page);
    await placePieces(page, 2);

    // A pista visual — o × — precisa existir em CADA peça colocada. Este é o
    // atrito original: a remoção já funcionava, mas nada na tela dizia isso.
    const placed = page.locator(PLACED);
    for (let i = 0; i < 2; i += 1) {
      await expect(placed.nth(i).locator("[data-builder-remove]")).toBeVisible();
    }
    // E o rótulo acessível precisa dizer o mesmo para quem não vê o ×.
    await expect(placed.first()).toHaveAttribute("aria-label", /devolver|return/i);
  });

  test("4 · remover a peça do meio tira só ela", async ({ page }) => {
    await openBuilder(page);
    await placePieces(page, 3);
    await page.locator(PLACED).nth(1).click();
    await expect(page.locator(PLACED)).toHaveCount(2);
  });

  test("5 · peça removida volta a ficar disponível e pode ser recolocada", async ({ page }) => {
    await openBuilder(page);
    const availableBefore = await page.locator(AVAILABLE).count();
    await placePieces(page, 1);
    await expect(page.locator(AVAILABLE)).toHaveCount(availableBefore - 1);

    await page.locator(PLACED).first().click();
    await expect(page.locator(PLACED)).toHaveCount(0);
    await expect(page.locator(AVAILABLE)).toHaveCount(availableBefore);

    // Recolocar precisa funcionar: remover não pode "gastar" a peça.
    await placePieces(page, 1);
    await expect(page.locator(PLACED)).toHaveCount(1);
  });

  test("6 · remover uma ocorrência de peça repetida não remove as outras", async ({ page }) => {
    // 森 = 木 + 木 + 木. As três peças são o MESMO glifo com ids diferentes.
    await openBuilder(page, "hb-sen-components");
    await placePieces(page, 3);

    const placed = page.locator(PLACED);
    const glyphs = await placed.allInnerTexts();
    expect(glyphs.filter((text) => text.includes("木")).length, "as três peças deveriam ser 木").toBe(3);

    await placed.nth(2).click();
    // Se a remoção fosse por glifo em vez de por identidade, este número seria 0.
    await expect(placed).toHaveCount(2);
    const left = await placed.allInnerTexts();
    expect(left.filter((text) => text.includes("木")).length).toBe(2);
  });

  test("7 · Desfazer tira a última peça colocada", async ({ page }) => {
    await openBuilder(page);
    await placePieces(page, 3);
    await page.getByTestId("builder-undo").click();
    await expect(page.locator(PLACED)).toHaveCount(2);
    await page.getByTestId("builder-undo").click();
    await expect(page.locator(PLACED)).toHaveCount(1);
  });

  test("8 · Limpar devolve o exercício ao estado inicial, sem punir", async ({ page }) => {
    await openBuilder(page);
    const availableBefore = await page.locator(AVAILABLE).count();
    await placePieces(page, 3);

    await page.getByTestId("builder-clear").click();
    await expect(page.locator(PLACED)).toHaveCount(0);
    await expect(page.locator(AVAILABLE)).toHaveCount(availableBefore);
    // Limpar não é erro: nada de feedback de erro, nada de vida perdida.
    await expect(page.locator("[data-qa-builder-wrong]")).toHaveAttribute("data-qa-builder-wrong", "0");
  });

  test("9 · dá para reconstruir depois de limpar, e a resposta certa é aceita", async ({ page }) => {
    await openBuilder(page);
    await placePieces(page, 3);
    await page.getByTestId("builder-clear").click();
    await expect(page.locator(PLACED)).toHaveCount(0);

    // 森 sem distratores: colocar todas as peças da bandeja é a resposta certa.
    const total = await page.locator(AVAILABLE).count();
    await placePieces(page, total);
    await page.getByRole("button", { name: /Verificar|Check/i }).click();
    // Acertar revela o caractere na carta; concluir é o passo seguinte, no
    // "Continuar" — é ele que devolve o resultado a quem hospeda o exercício.
    await expect(page.getByText("森", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Continuar|Continue/i }).first().click();
    await expect(page.locator("[data-qa-builder-status]")).toHaveAttribute(
      "data-qa-builder-status",
      "correct",
      { timeout: 10_000 }
    );
  });

  test("10 · resposta errada continua sendo tratada como erro", async ({ page }) => {
    // 好 = 女 + 子, e a ordem importa: a validação de componentes compara a
    // sequência de glifos. Montar 子 antes de 女 é um erro de verdade, sem
    // depender de distratores — que só aparecem para quem já praticou o
    // caractere, e portanto não existem num estado novo como o da fixture.
    await openBuilder(page, "hb-hao-components");
    const bank = page.locator(AVAILABLE);
    await bank.filter({ hasText: "子" }).first().click();
    await expect(page.locator(PLACED)).toHaveCount(1);
    await bank.filter({ hasText: "女" }).first().click();
    await expect(page.locator(PLACED)).toHaveCount(2);

    await page.getByRole("button", { name: /Verificar|Check/i }).click();
    await expect(page.locator("[data-qa-builder-wrong]")).toHaveAttribute(
      "data-qa-builder-wrong",
      "1",
      { timeout: 10_000 }
    );
  });

  test("11 · 390×844: alvos de toque utilizáveis com o polegar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBuilder(page);
    await placePieces(page, 2);

    for (const testId of ["builder-undo", "builder-clear"]) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box, `${testId} sem caixa`).not.toBeNull();
      expect(box!.height, `${testId} pequeno demais para o polegar`).toBeGreaterThanOrEqual(40);
    }
    const piece = await page.locator(PLACED).first().boundingBox();
    expect(piece!.height).toBeGreaterThanOrEqual(40);

    // Nada pode vazar para fora da tela.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("12 · teclado: dá para colocar e remover sem mouse", async ({ page }) => {
    await openBuilder(page);
    const first = page.locator(AVAILABLE).first();
    await first.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(PLACED)).toHaveCount(1);

    await page.locator(PLACED).first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(PLACED)).toHaveCount(0);
  });

  test("13 · a orientação de primeira vez explica como tirar uma peça", async ({ page }) => {
    await openBuilder(page);
    const orientation = page.getByTestId("builder-orientation");
    await expect(orientation).toBeVisible();
    await expect(orientation).toContainText(/remov|remove/i);
    // Some depois que o aluno começa: é orientação, não tutorial permanente.
    await placePieces(page, 1);
    await expect(orientation).toBeHidden();
  });
});

test.describe("V4.9.4 — o som vem antes da resposta", () => {
  test("14 · o botão de áudio existe ANTES de montar ou verificar", async ({ page }) => {
    await openBuilder(page);
    const audio = page.locator("[data-builder-audio] button");
    await expect(audio).toBeVisible();
    await expect(page.locator("[data-qa-builder-status]")).toHaveAttribute(
      "data-qa-builder-status",
      "open"
    );
  });

  test("15 · ouvir manda o hànzì-alvo para a fala, e repetir é livre", async ({ page }) => {
    await page.addInitScript(() => {
      const spoken: string[] = [];
      (window as unknown as { __spoken: string[] }).__spoken = spoken;
      class FakeUtterance {
        text: string;
        lang = "";
        rate = 1;
        pitch = 1;
        volume = 1;
        onend: (() => void) | null = null;
        onerror: ((event: unknown) => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      }
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        value: FakeUtterance,
        writable: true,
      });
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          speaking: false,
          pending: false,
          paused: false,
          cancel() {},
          resume() {},
          getVoices: () => [{ lang: "zh-CN", name: "fake", default: true }],
          speak(u: FakeUtterance) {
            spoken.push(u.text);
            setTimeout(() => u.onend?.(), 10);
          },
          addEventListener() {},
          removeEventListener() {},
        },
        writable: true,
      });
    });
    await openBuilder(page);

    const audio = page.locator("[data-builder-audio] button");
    await audio.click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length))
      .toBeGreaterThan(0);
    const first = await page.evaluate(
      () => (window as unknown as { __spoken: string[] }).__spoken[0]
    );
    // O que é falado é o caractere-alvo, não o rótulo da interface.
    expect(first).toContain("森");

    // P0.4 — repetir quantas vezes quiser, sem penalidade.
    await audio.click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length))
      .toBeGreaterThan(1);
    await expect(page.locator("[data-qa-builder-wrong]")).toHaveAttribute("data-qa-builder-wrong", "0");
  });

  test("16 · a pista é auditiva: o caractere-alvo não aparece escrito antes do acerto", async ({
    page,
  }) => {
    await openBuilder(page);

    // O que esta remessa acrescentou é o áudio, e é ele que está sob medição
    // aqui: nem o texto ao lado do botão nem o rótulo acessível podem conter o
    // caractere, senão a pista sonora vira gabarito escrito.
    await expect(page.locator("[data-builder-audio]")).not.toContainText("森");
    const label = await page.locator("[data-builder-audio] button").getAttribute("aria-label");
    expect(label ?? "", "o rótulo do botão de áudio não pode entregar a resposta").not.toContain("森");

    // E a carta de montagem só revela o caractere depois do acerto.
    await expect(page.locator("svg[role='img'], .hanzi").first()).not.toContainText("森");

    // Nota honesta: a legenda das peças ("base de 林 e 森") cita o caractere, e
    // isso é conteúdo anterior a esta remessa — não é o áudio vazando. Fica
    // registrado aqui em vez de virar uma asserção ampla que passaria a medir
    // a autoria dos componentes em vez do que mudou.
  });

  test("17 · o áudio continua disponível depois do feedback", async ({ page }) => {
    await openBuilder(page);
    const total = await page.locator(AVAILABLE).count();
    await placePieces(page, total);
    await page.getByRole("button", { name: /Verificar|Check/i }).click();
    await expect(page.getByText("森", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    // Acertar não pode tirar o áudio: rever a pronúncia é parte de aprender.
    await expect(
      page.locator("button[aria-label*='Ouvir'], button[aria-label*='Listen']").first()
    ).toBeVisible();
  });

  test("18 · sem síntese de fala no navegador, o botão avisa em vez de calar", async ({ page }) => {
    await page.addInitScript(() => {
      // Sem `speechSynthesis` o app trata TTS como indisponível.
      Object.defineProperty(window, "speechSynthesis", { value: undefined, writable: true });
    });
    await openBuilder(page);

    const audio = page.locator("[data-builder-audio] button");
    await expect(audio).toBeVisible();
    await expect(page.getByTestId("speak-status")).toBeVisible();
    // E o exercício segue jogável: áudio nunca é exigência para prosseguir.
    await placePieces(page, 1);
    await expect(page.locator(PLACED)).toHaveCount(1);
  });
});
