import { test, expect } from "@playwright/test";
import {
  clickStable,
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedFoundationThrough,
  seedLessonRecoverySession,
  seedOnboardedSession,
  waitForLazyPage,
} from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";

test.describe("jornada", () => {
  test("jornada carrega com perfil onboarded", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/jornada");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Jornada|mandarim/i).first()).toBeVisible();
  });
});

test.describe("lição", () => {
  test("primeira lição abre o passo introdutório", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    // A introdução autorada abre o plano; o exercício com 你好 vem em seguida.
    await expect(page.getByRole("heading", { name: /Uma língua falada|A língua padrão|Língua, não alfabeto/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByRole("button", { name: /你好|Não posso falar agora/ }).first()).toBeVisible();
    // Palavras em português do prompt não viram botões de glossário.
    await expect(page.getByRole("button", { name: /combina/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /qual/i })).toHaveCount(0);
  });

  test("conta nova: microconversa de 你好 na 4ª pass de mandarim", async ({ page }) => {
    test.setTimeout(180_000);
    // Tema já adquirido em 4/4 (grandfather do helper): a pass de domínio traz a microconversa.
    await seedOnboardedSession(page, ["p1-o-que-e-mandarim"]);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 15_000 });

    const conversation = page.locator("[data-conversation-scene]").first();
    const deadline = Date.now() + 90_000;
    for (let steps = 0; steps < 40 && Date.now() < deadline; steps += 1) {
      if (await conversation.isVisible().catch(() => false)) break;
      await dismissBlockingOverlays(page);
      const found = await advanceUntilVisible(page, conversation, 1);
      if (found) break;
    }
    await expect(conversation).toBeVisible({ timeout: 15_000 });
  });

  test("intro de hànzì é conceitual, sem composição 林/明", async ({ page }) => {
    await seedFoundationThrough(page, "p1-o-que-e-tom");
    await page.goto("/licao/p1-o-que-e-hanzi/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/Sistema de escrita|O que é Hànzì|caracteres do chinês escrito/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Monte 林|Monte 明|hb-lin|hb-ming/i)).toHaveCount(0);
  });

  test("prompt misto não abre glossário em português", async ({ page }) => {
    await seedFoundationThrough(page, "p1-engine-2-lab");
    await page.goto("/licao/l1/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Pinyin: ponte para o som/ })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Entendi" }).click();
    // O balancer pode inserir image_choice gerado entre o intro e o tom.
    // O que importa: ao chegar no tom, o prompt em português é heading — nunca
    // botão de glossário.
    const toneHeading = page.getByRole("heading", { name: /Qual tom você ouviu|Ouça e escolha|Toque no que/i });
    expect(
      await advanceUntilVisible(page, toneHeading, 12),
      "l1 M1 segue em reconhecimento (tom ou escuta), sem glossário em português",
    ).toBe(true);
    await expect(toneHeading).toBeVisible();
    await expect(page.getByRole("button", { name: /combina/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /qual|contorno|ouviu/i })).toHaveCount(0);
  });

  test("primeiros hànzì começa com fragmentos simples", async ({ page }) => {
    await seedFoundationThrough(page, "p1-o-que-e-hanzi");
    await page.goto("/licao/p1-primeiros-hanzi/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    // A lição abre com a introdução conceitual: 木/口/日 aparecem como texto.
    await expect(page.getByRole("heading", { name: /Monte peça por peça/ })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/木/).first()).toBeVisible();
    await expect(page.getByText(/Monte 林|Monte 明|Monte 好/i)).toHaveCount(0);
    // Depois da introdução o balancer pode abrir num hanzi_build gerado
    // (fragmentos simples, ex. lua) ou numa associação visual — ainda sem 林/明/好.
    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(
      page.getByText(/Monte o hànzì|Monte por fragmentos|Monte pelas peças|Associação visual|Observe a forma|Fixe com pares|Combine o conteúdo/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Monte 林|Monte 明|Monte 好/i)).toHaveCount(0);
  });
});

test.describe("revisão", () => {
  test("revisão básica responde sem erro", async ({ page }) => {
    await seedOnboardedSession(page, ["l1", "l1-rev"]);
    await page.goto("/revisao");
    await expect(page.getByText(/revisão|prioridade/i).first()).toBeVisible();
  });

  test("erro com 2★ aparece na revisão Pro", async ({ page }) => {
    await seedLessonRecoverySession(page, { lessonId: "l1", stars: 2, isPremium: true });
    await page.goto("/revisao?modo=erros");
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/1 pendente\(s\)/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Corrigir agora/i })).toBeEnabled();
    await clickStable(page, /Corrigir agora/i);
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/你好|Toque no que ouviu|prioridade de revisão|Revisar:|Tarefa|Corrigir pontos fracos/i).first()).toBeVisible();
  });

  test("Corrigir pontos fracos abre rodadas focadas", async ({ page }) => {
    await seedLessonRecoverySession(page, { lessonId: "l1", stars: 2, isPremium: true });
    await page.goto("/revisao");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Pontos fracos/i })).toBeVisible();
    await clickStable(page, /Corrigir pontos fracos/i);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Corrigir pontos fracos/i })).toBeVisible();
    await expect(page.getByText(/Rodada \d+ de \d+/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Voltar à revisão/i })).toBeVisible();
  });

  test("plano grátis não expõe histórico detalhado de erros", async ({ page }) => {
    await seedLessonRecoverySession(page, { isPremium: false });
    await page.goto("/revisao");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1, name: "Revisão básica" })).toBeVisible();
    await expect(page.getByText(/pendente\(s\)/)).not.toBeVisible();
  });
});
