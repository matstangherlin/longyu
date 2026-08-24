import { test, expect, type Page } from "@playwright/test";
import {
  clickStable,
  dismissBlockingOverlays,
  seedFreshJourneySession,
  seedFoundationThrough,
  seedLessonRecoverySession,
  seedOnboardedSession,
  waitForLazyPage,
} from "./helpers";
import { advanceOneStep, advanceUntilVisible } from "./lesson-player-helpers";

async function hasCompletedLesson(page: Page, lessonId: string): Promise<boolean> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem("longyu-v1");
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as { state?: { completedLessons?: string[] } };
      return Boolean(parsed.state?.completedLessons?.includes(id));
    } catch {
      return false;
    }
  }, lessonId);
}

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
    await expect(page.getByRole("heading", { name: /A língua padrão/ })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();
    // Palavras em português do prompt não viram botões de glossário.
    await expect(page.getByRole("button", { name: /combina/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /qual/i })).toHaveCount(0);
  });

  test("conta nova: microconversa de 你好 na lição de pinyin", async ({ page }) => {
    test.setTimeout(180_000);
    await seedFreshJourneySession(page);

    // Conta realmente nova: a jornada bloqueia a lição 2 até concluir a 1.
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    const victory = page.getByRole("button", { name: /Continuar Jornada|Receber recompensas/i });
    const gateCta = page.getByRole("button", { name: /Continuar na jornada/i });
    const l1Deadline = Date.now() + 90_000;
    for (let steps = 0; steps < 50 && Date.now() < l1Deadline; steps += 1) {
      if (await hasCompletedLesson(page, "p1-o-que-e-mandarim")) break;
      if (await gateCta.isVisible().catch(() => false)) {
        await page.goto("/licao/p1-o-que-e-mandarim/player");
        await waitForLazyPage(page);
        continue;
      }
      await dismissBlockingOverlays(page);
      const advanced = await advanceOneStep(page);
      if (!advanced) await advanceUntilVisible(page, victory, 3);
    }
    expect(
      await hasCompletedLesson(page, "p1-o-que-e-mandarim"),
      "conta nova precisa concluir a L1 de verdade antes da microconversa",
    ).toBe(true);

    await page.goto("/licao/p1-o-que-e-pinyin/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.locator("[data-lesson-player-frame]")).toBeVisible({ timeout: 15_000 });

    const conversation = page.locator("[data-conversation-scene]").first();
    const l2Deadline = Date.now() + 90_000;
    for (let steps = 0; steps < 40 && Date.now() < l2Deadline; steps += 1) {
      if (await conversation.isVisible().catch(() => false)) break;
      await dismissBlockingOverlays(page);
      const found = await advanceUntilVisible(page, conversation, 1);
      if (found) break;
    }
    await expect(conversation).toBeVisible({ timeout: 15_000 });
  });

  test("intro de hànzì é conceitual, sem composição 林/明", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-hanzi/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/O que é Hànzì/i).first()).toBeVisible({ timeout: 20_000 });
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
    const toneHeading = page.getByRole("heading", { name: /Qual tom você ouviu/i });
    expect(
      await advanceUntilVisible(page, toneHeading, 12),
      "l1 deve chegar no passo de tom após o intro",
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
      page.getByText(/Monte o hànzì|Monte por fragmentos|Monte pelas peças|Associação visual|Observe a forma/i).first(),
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
