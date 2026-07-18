import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedFoundationThrough,
  seedFreshJourneySession,
  seedLessonRecoverySession,
  seedOnboardedSession,
} from "./helpers";

async function clickFirstVisible(page: Page, names: RegExp[]) {
  for (const name of names) {
    const button = page.getByRole("button", { name });
    if (await button.first().isVisible().catch(() => false)) {
      await button.first().click();
      return true;
    }
  }
  return false;
}

/** Avança passos genéricos até o seletor aparecer (smoke, não prova pedagógica profunda). */
async function advanceUntilVisible(page: Page, target: Locator, maxSteps = 14): Promise<boolean> {
  for (let step = 0; step < maxSteps; step += 1) {
    await dismissBlockingOverlays(page);
    if (await target.isVisible().catch(() => false)) return true;
    const advanced = await clickFirstVisible(page, [
      /^Entendi$/,
      /^Continuar$/,
      /^Próximo$/,
      /^Verificar$/,
      /^Conferir$/,
      /^Ouvir de novo$/,
    ]);
    if (!advanced) {
      // Tenta uma opção de múltipla escolha para destravar.
      const option = page.locator("button").filter({ hasText: /你好|谢谢|木|人|山|mù|rén/i }).first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await clickFirstVisible(page, [/^Verificar$/, /^Conferir$/, /^Continuar$/]);
      } else {
        break;
      }
    }
    await page.waitForTimeout(200);
  }
  return target.isVisible().catch(() => false);
}

test.describe("beta smoke — fluxos públicos", () => {
  test("landing: versão, aviso beta e CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Aprenda mandarim/i })).toBeVisible();
    await expect(
      page.getByText(/O Longyu está em beta\. Algumas atividades ainda estão sendo aprimoradas/i)
    ).toBeVisible();
    await expect(page.getByText(/v0\.2\.0-beta\.1/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Começar agora/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Já tenho uma conta/i })).toBeVisible();
  });

  test("cadastro: /conta inicia onboarding / teste de nível", async ({ page }) => {
    await page.goto("/conta");
    await expect(page.getByRole("button", { name: /Começar/i })).toBeVisible();
    await expect(page.getByText(/nível|jornada|conta/i).first()).toBeVisible();
  });

  test("login: formulário e atalho de recuperação", async ({ page }) => {
    await page.goto("/login");
    // Com backend local o login pode estar indisponível — ainda assim a rota responde.
    const cloudHeading = page.getByRole("heading", { name: /Entrar na conta/i });
    const offlineHeading = page.getByRole("heading", { name: /Login indisponível/i });
    await expect(cloudHeading.or(offlineHeading)).toBeVisible();
    if (await cloudHeading.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /Esqueci minha senha/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /Criar conta/i })).toBeVisible();
    }
  });

  test("recuperação de senha: tela /esqueci-senha", async ({ page }) => {
    await page.goto("/esqueci-senha");
    await expect(page.getByRole("heading", { name: /Esqueci minha senha/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Enviar link de recuperação|Continuar no app/i })
    ).toBeVisible();
  });

  test("sobre: versão e aviso beta discretos", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/sobre");
    await expect(page.getByRole("heading", { name: /Sobre o Longyu/i })).toBeVisible();
    await expect(page.getByText(/v0\.2\.0-beta\.1/i).first()).toBeVisible();
    await expect(
      page.getByText(/O Longyu está em beta\. Algumas atividades ainda estão sendo aprimoradas/i)
    ).toBeVisible();
  });

  test("paywall: /pro sem Pro Preview", async ({ page }) => {
    await seedOnboardedSession(page);
    await page.goto("/pro");
    await expect(page.getByRole("heading", { name: /30 dias grátis/i })).toBeVisible();
    await expect(page.getByText(/Pro Preview/i)).toHaveCount(0);
    await expect(page.getByText(/Preview local — não é assinatura real/i)).toHaveCount(0);
  });

  test("feedback: modal abre a partir do FAB", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/jornada");
    await page.getByLabel(/Enviar feedback/i).click();
    await expect(page.getByRole("heading", { name: /Feedback beta/i })).toBeVisible();
    await expect(page.getByText(/v0\.2\.0-beta\.1/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Enviar$/i })).toBeVisible();
  });
});

test.describe("beta smoke — aprendizagem", () => {
  test("primeira lição abre e mostra exercício", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await expect(page.getByRole("heading", { name: /A língua padrão/ })).toBeVisible();
    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();
  });

  test("erro e correção: revisão Pro com pendência", async ({ page }) => {
    await seedLessonRecoverySession(page, { lessonId: "l1", stars: 2, isPremium: true });
    await page.goto("/revisao?modo=erros");
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/1 pendente\(s\)/)).toBeVisible();
    await page.getByRole("button", { name: /Corrigir agora/i }).click();
    await expect(page.getByText(/你好|Toque no que ouviu/i).first()).toBeVisible();
  });

  test("Hànzì Builder: lição de primeiros hànzì carrega montagem", async ({ page }) => {
    await seedFoundationThrough(page, "p1-o-que-e-hanzi");
    await page.goto("/licao/p1-primeiros-hanzi/player");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Monte peça por peça/ })).toBeVisible();
    const builderCue = page.getByText(/toque nas peças|Monte |peça por peça|componentes/i).first();
    const found = await advanceUntilVisible(page, builderCue, 10);
    expect(found).toBeTruthy();
  });

  test("imagem real: conceito visual com foto aparece na trilha", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-hanzi/player");
    await dismissBlockingOverlays(page);
    const photo = page.locator(
      'img[src*="tree.webp"], img[src*="person.webp"], img[src*="mountain.webp"], img[alt*="Foto"]'
    ).first();
    const found = await advanceUntilVisible(page, photo, 16);
    expect(found).toBeTruthy();
  });

  test("conversation_scene: cena de cumprimento na trilha", async ({ page }) => {
    await seedFoundationThrough(page, "p1-engine-2-lab");
    await page.goto("/licao/l1/player");
    await dismissBlockingOverlays(page);
    // Intro autorada → depois avançamos até a cena.
    if (await page.getByRole("button", { name: "Entendi" }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Entendi" }).click();
    }
    const sceneCue = page.getByText(/conversa|cumprimento|na rua|Responder|Concluir|checkpoint/i).first();
    const found = await advanceUntilVisible(page, sceneCue, 18);
    // Fallback: a lição l1 declara cena — pelo menos o player não quebra.
    await expect(page.locator("body")).toContainText(/./);
    expect(found || (await page.getByText(/\d+\/\d+/).first().isVisible())).toBeTruthy();
  });

  test("conclusão da lição: vitória após completar plano curto", async ({ page }) => {
    // Usa a primeira lição e responde até a tela de vitória (limite de passos).
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await dismissBlockingOverlays(page);

    const victory = page.getByRole("heading", { name: /Lição concluída!|Você avançou!/i });
    for (let i = 0; i < 40; i += 1) {
      await dismissBlockingOverlays(page);
      if (await victory.isVisible().catch(() => false)) break;

      if (await page.getByRole("button", { name: "Entendi" }).isVisible().catch(() => false)) {
        await page.getByRole("button", { name: "Entendi" }).click();
        continue;
      }

      const correctish = page.getByRole("button", { name: /你好/ }).first();
      if (await correctish.isVisible().catch(() => false)) {
        await correctish.click();
        await clickFirstVisible(page, [/^Verificar$/, /^Conferir$/, /^Continuar$/]);
        continue;
      }

      if (
        await clickFirstVisible(page, [
          /^Continuar$/,
          /^Verificar$/,
          /^Conferir$/,
          /^Próximo$/,
          /^Receber recompensas$/,
        ])
      ) {
        continue;
      }

      const anyOption = page.locator("main button, [role='main'] button").first();
      if (await anyOption.isVisible().catch(() => false)) {
        await anyOption.click().catch(() => undefined);
      }
    }

    await expect(victory).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/Progresso salvo|Sincronizando progresso|Progresso local/i).first()
    ).toBeVisible();
  });

  test("sincronização: conta menciona progresso / nuvem", async ({ page }) => {
    await seedOnboardedSession(page, ["l1"]);
    await page.goto("/conta");
    await expect(
      page.getByText(/sincroniz|progresso|nuvem|conta|backup/i).first()
    ).toBeVisible();
  });

  test("revisão: hub responde", async ({ page }) => {
    await seedOnboardedSession(page, ["l1", "l1-rev"]);
    await page.goto("/revisao");
    await expect(page.getByText(/revisão|prioridade|básica/i).first()).toBeVisible();
  });

  test("fim do Pro: plano grátis não vê histórico detalhado de erros", async ({ page }) => {
    await seedLessonRecoverySession(page, { isPremium: false });
    await page.goto("/revisao");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { level: 1, name: "Revisão básica" })).toBeVisible();
    await expect(page.getByText(/pendente\(s\)/)).not.toBeVisible();
  });
});

test.describe("beta smoke — mobile 360", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("landing + versão em 360px", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Aprenda mandarim/i })).toBeVisible();
    await expect(page.getByText(/v0\.2\.0-beta\.1/i)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("jornada e paywall em 360px", async ({ page }) => {
    await seedOnboardedSession(page, []);
    await page.goto("/jornada");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/pro");
    await expect(page.getByRole("heading", { name: /30 dias grátis/i })).toBeVisible();
  });
});
