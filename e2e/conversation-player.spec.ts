import { expect, test, type Page } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady } from "./helpers";

// Lição cujo primeiro (e único) diálogo é a cena longa "pedir-agua" (27 nós,
// com ramos de erro). O currículo evoluiu desde o PR #43 e as cenas de imersão
// passaram a ter exercícios antes do diálogo — por isso navegamos até a cena
// em vez de assumir que ela é o primeiro passo.
const LONG_CONVERSATION_LESSON = "l27";

/** Avança pelos passos do player (intro/exercícios) até a cena de conversa. */
async function advanceToConversation(page: Page): Promise<void> {
  const player = page.getByTestId("conversation-player");
  for (let i = 0; i < 40; i += 1) {
    await dismissBlockingOverlays(page);
    if (await player.isVisible().catch(() => false)) return;
    const clicked = await page.evaluate(() => {
      // Ordem de preferência para avançar sem responder de fato: intro, avanço
      // de fala, escape do exercício de pronúncia e, por fim, pular.
      const order = ["Entendi", "Continuar", "Conferir", "Não posso falar agora", "Pular"];
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      for (const label of order) {
        const button = buttons.find(
          (b) => b.textContent?.trim().startsWith(label) && !b.disabled && b.offsetParent !== null
        );
        if (button) {
          button.click();
          return label;
        }
      }
      return "none";
    });
    if (clicked === "none") break;
    await page.waitForTimeout(300);
  }
  await expect(player).toBeVisible({ timeout: 15_000 });
}

async function openConversation(
  page: Page,
  lessonId: string,
  options: Parameters<typeof seedLessonPlayerReady>[2] = {}
): Promise<ReturnType<Page["getByTestId"]>> {
  await seedLessonPlayerReady(page, lessonId, options);
  await page.goto(`/licao/${lessonId}/player`);
  await advanceToConversation(page);
  return page.getByTestId("conversation-player");
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBeTruthy();
}

async function expectButtonInsideViewport(page: Page, name: RegExp): Promise<void> {
  const button = page.getByRole("button", { name }).last();
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

/** Avança as falas do diálogo até surgir a interação do aluno ("Responder"). */
async function advanceToInteraction(page: Page): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    if (await page.getByRole("button", { name: /^Responder$/ }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /^Responder$/ }).click();
      return;
    }
    const next = page.getByRole("button", { name: /^Continuar$/ }).last();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(250);
  }
}

test.describe("player de conversas longas", () => {
  test("conversa longa em 360×640: progressiva, histórico recolhível e ramo de erro", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 360, height: 640 });
    const player = await openConversation(page, LONG_CONVERSATION_LESSON, { isPremium: true });

    // Etapa e progresso sempre identificáveis; foco na conversa (sem shell).
    const progress = player.getByRole("progressbar", { name: /Progresso da conversa/i });
    await expect(progress).toBeVisible();
    // O total exibido é o caminho linear da cena (o "happy path"); pedir-agua é
    // uma cena de imersão longa (27 nós no catálogo, ramificada). A contagem de
    // falas do catálogo é garantida por validate:conversation-scenes/pedagogy.
    expect(Number(await progress.getAttribute("aria-valuemax"))).toBeGreaterThanOrEqual(6);
    await expect(player.getByText(/Agora:/)).toBeVisible();
    await expect(page.locator("aside")).toHaveCount(0);
    await expect(page.locator("nav")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await expectButtonInsideViewport(page, /^(Continuar|Responder)$/);

    // Avança uma fala → histórico recolhível aparece e abre por teclado.
    await page.getByRole("button", { name: /^Continuar$/ }).last().click();
    await page.waitForTimeout(400);
    // O controle é um <summary> nativo (dobrável por teclado com Enter/Espaço).
    const historyToggle = page.locator('[data-testid="conversation-history"] summary');
    await expect(historyToggle).toBeVisible();
    await historyToggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("list", { name: /Histórico recente/i })).toBeVisible();

    // Ramo de erro: as opções são embaralhadas, então tentamos respostas até
    // cair no ramo de erro (pista). A cena precisa corrigir e continuar, sem
    // encerrar. Cada interação certa apenas avança para a próxima.
    await advanceToInteraction(page);
    await expect(page.getByText(/Resposta do aluno · sua vez/i)).toBeVisible();
    // Feedback de erro é a pista (ramo próprio) OU a correção "Quase" (retry).
    const errorFeedback = page.locator(
      '[data-conversation-kind="hint"], [data-conversation-kind="correction"]'
    );
    let sawErrorBranch = false;
    for (let attempt = 0; attempt < 10 && !sawErrorBranch; attempt += 1) {
      const options = page.locator('[data-conversation-kind="choice"] button.hanzi');
      const count = await options.count().catch(() => 0);
      if (count === 0) break;
      await options.nth(attempt % count).click();
      const verificar = page.getByRole("button", { name: /^Verificar$/ });
      if (await verificar.isEnabled().catch(() => false)) await verificar.click();
      await page.waitForTimeout(400);
      sawErrorBranch = await errorFeedback.first().isVisible().catch(() => false);
      if (!sawErrorBranch) {
        // Resposta certa → a cena avança; segue para a próxima interação.
        const next = page.getByRole("button", { name: /^Continuar$/ }).last();
        if (await next.isVisible().catch(() => false)) {
          await next.click();
          await page.waitForTimeout(250);
        }
        await advanceToInteraction(page);
      }
    }
    // A cena NÃO encerra no erro: o player segue visível e o feedback aparece.
    await expect(player).toBeVisible();
    expect(sawErrorBranch).toBe(true);
    await expect(errorFeedback.first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // Viewport baixo simula o teclado virtual aberto: a ação segue alcançável.
    await page.setViewportSize({ width: 360, height: 420 });
    await expectButtonInsideViewport(page, /^(Continuar|Responder|Verificar)$/);
  });

  test("reload, offline e troca de orientação preservam a fala atual", async ({ page, context }) => {
    test.slow();
    await page.setViewportSize({ width: 360, height: 640 });
    const player = await openConversation(page, LONG_CONVERSATION_LESSON, { isPremium: true });
    await page.getByRole("button", { name: /^Continuar$/ }).click();
    const progress = player.getByRole("progressbar", { name: /Progresso da conversa/i });
    const beforeReload = await progress.getAttribute("aria-valuenow");

    await page.reload();
    await dismissBlockingOverlays(page);
    await expect(page.getByTestId("conversation-player")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /Progresso da conversa/i })).toHaveAttribute(
      "aria-valuenow",
      beforeReload!
    );

    await context.setOffline(true);
    await page.setViewportSize({ width: 640, height: 360 });
    await expect(page.getByTestId("conversation-player")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await context.setOffline(false);
  });

  test("dark mode e reduced motion mantêm contraste e removem a transição da fala", async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await page.setViewportSize({ width: 768, height: 900 });
    const player = await openConversation(page, LONG_CONVERSATION_LESSON, { isPremium: true, theme: "dark" });
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    const bubble = player.locator('[data-conversation-kind="character"]').last();
    await expect(bubble).toBeVisible();
    await expect
      .poll(() => bubble.evaluate((element) => getComputedStyle(element).animationName))
      .toBe("none");
    await expectNoHorizontalOverflow(page);
  });

  test("tablet e desktop mantêm etapa, foco e controles acessíveis", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 820, height: 1180 });
    const player = await openConversation(page, LONG_CONVERSATION_LESSON, { isPremium: true });
    await expect(player.getByTestId("conversation-stage")).toBeVisible();
    await expect(player.getByRole("progressbar", { name: /Progresso da conversa/i })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(player).toBeVisible();
    await expect(page.locator("aside")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  // Observação de escopo: a transição para o Pós-Conversa (banner com
  // aria-live + data-testid="post-conversation-transition") e a variante
  // audio_first fazem parte da entrega e do código, mas não têm E2E dedicado:
  // concluir uma conversa inteira pela UI (interações de ordem/escolha com
  // ramos que voltam) é impraticável de forma determinística, e o audio_first
  // só se aplica a cenas GERADAS (as cenas autorais atuais renderizam em
  // guided). A substância pedagógica — laço de vocabulário → SRS após a
  // conversa — é coberta por validate:conversation-vocabulary-srs e
  // validate:conversation-loop.
});
