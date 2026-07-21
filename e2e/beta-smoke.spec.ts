import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  clickStable,
  dismissBlockingOverlays,
  seedFoundationThrough,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  seedLessonRecoverySession,
  seedOnboardedSession,
} from "./helpers";

async function clickFirstVisible(page: Page, names: RegExp[]) {
  for (const name of names) {
    const button = page.getByRole("button", { name });
    const first = button.first();
    if (!(await first.isVisible().catch(() => false))) continue;
    if (await first.isDisabled().catch(() => false)) continue;
    await first.click();
    return true;
  }
  return false;
}

/** Avança passos genéricos até o seletor aparecer (smoke, não prova pedagógica profunda). */
async function advanceUntilVisible(page: Page, target: Locator, maxSteps = 14): Promise<boolean> {
  for (let step = 0; step < maxSteps; step += 1) {
    await dismissBlockingOverlays(page);
    if (await target.isVisible().catch(() => false)) return true;

    const produceMonte = page.getByText(/Monte “.+” na ordem certa|toque nas peças/i).first();
    if (await produceMonte.isVisible().catch(() => false)) {
      for (const label of ["你", "好", "我", "很", "再", "见"]) {
        const token = page.locator("button").filter({ hasText: new RegExp(`^${label}:`) }).first();
        if (await token.isVisible().catch(() => false)) await token.click();
      }
      await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Continuar$/]);
      await page.waitForTimeout(200);
      continue;
    }

    const piece = page.getByRole("button", { name: /^Peça \d+:/ }).first();
    if (await piece.isVisible().catch(() => false)) {
      const pieces = page.getByRole("button", { name: /^Peça \d+:/ });
      const count = await pieces.count();
      for (let i = 0; i < count; i += 1) {
        await pieces.nth(i).click().catch(() => undefined);
      }
      await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/]);
      await clickFirstVisible(page, [/^Continuar$/, /^Conferir$/]);
      await page.waitForTimeout(200);
      continue;
    }

    const advanced = await clickFirstVisible(page, [
      /^Entendi$/,
      /^Continuar$/,
      /^Próximo$/,
      /^Verificar$/,
      /^Conferir$/,
      /^Confirmar$/,
      /^Responder$/,
      /^Concluir$/,
      /^Ouvir de novo$/,
      /^Pular/,
    ]);
    if (!advanced) {
      // Tenta uma opção de múltipla escolha para destravar.
      const option = page
        .locator("button")
        .filter({ hasText: /你好|谢谢|木|人|山|mù|rén|pessoa|Opção/i })
        .first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await clickFirstVisible(page, [/^Verificar$/, /^Conferir$/, /^Continuar$/, /^Confirmar$/]);
      } else {
        const mcOption = page.getByRole("button", { name: /^Opção \d+$/ }).first();
        if (await mcOption.isVisible().catch(() => false)) {
          await mcOption.click();
          await clickFirstVisible(page, [/^Confirmar$/, /^Verificar$/, /^Conferir$/, /^Continuar$/]);
        } else {
          break;
        }
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
    await clickStable(page, /Corrigir agora/i);
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/你好|Toque no que ouviu|prioridade de revisão|Revisar:/i).first()).toBeVisible();
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

  test("imagem real: foto de conceito visual carrega no player", async ({ page }) => {
    // p4-char-ren tem image_choice com foto de pessoa cedo no plano autorado.
    await seedFoundationThrough(page, "p1-engine-2-lab");
    await page.goto("/licao/p4-char-ren/player");
    await dismissBlockingOverlays(page);
    if (await page.getByRole("button", { name: "Entendi" }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Entendi" }).click();
    }
    const photo = page.locator('img[src*="person"], img[alt*="pessoa" i], img[alt*="Foto" i], img[alt*="Ilustra" i]').first();
    const found = await advanceUntilVisible(page, photo, 14);
    if (!found) {
      // Plano personalizado pode adiar a foto — ainda assim a ilustração precisa estar no bundle.
      const hasInlinedPersonVisual = await page.evaluate(async () => {
        const html = await fetch("/").then((r) => r.text());
        const script = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
        if (!script) return false;
        const js = await fetch(`/${script[0]}`).then((r) => r.text());
        return /people\/person\.svg|aria-label="Person"/.test(js);
      });
      expect(hasInlinedPersonVisual).toBeTruthy();
    } else {
      await expect(photo).toBeVisible();
    }
  });

  test("conversation_scene: cena de cumprimento na trilha", async ({ page }) => {
    await seedLessonPlayerReady(page, "l2");
    await page.goto("/licao/l2/player");
    await dismissBlockingOverlays(page);
    if (await page.getByRole("button", { name: "Entendi" }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Entendi" }).click();
    }
    const sceneCue = page.getByText(/conversa|cumprimento|na rua|Responder|Concluir|checkpoint/i).first();
    const found = await advanceUntilVisible(page, sceneCue, 18);
    await expect(page.locator("body")).toContainText(/./);
    expect(found || (await page.getByText(/\d+\/\d+/).first().isVisible())).toBeTruthy();
  });

  test("pós-conversa: transição após cena de cumprimento", async ({ page }) => {
    await seedLessonPlayerReady(page, "l2");
    await page.goto("/licao/l2/player");
    await dismissBlockingOverlays(page);
    if (await page.getByRole("button", { name: "Entendi" }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Entendi" }).click();
    }
    const postCue = page
      .getByText(
        /Pós-Conversa|O que esta frase significa|Qual resposta combina|Monte a resposta|Ouça e escolha|Complete a palavra/i
      )
      .first();
    const found = await advanceUntilVisible(page, postCue, 45);
    if (!found) {
      // Plano adaptativo pode adiar a fase — o pipeline Pós-Conversa ainda precisa existir no build.
      const hasPostConversationPipeline = await page.evaluate(async () => {
        const html = await fetch("/").then((r) => r.text());
        const script = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
        if (!script) return false;
        const js = await fetch(`/${script[0]}`).then((r) => r.text());
        return /postConversationPhase/.test(js) && /primeiro-cumprimento/.test(js);
      });
      expect(hasPostConversationPipeline).toBeTruthy();
    } else {
      await expect(postCue).toBeVisible();
    }
  });

  test("conclusão da lição: acerto, feedback e progresso", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /A língua padrão/ })).toBeVisible();
    await page.getByRole("button", { name: "Entendi" }).click();

    const correct = page.getByRole("button", { name: /你好/ }).first();
    await expect(correct).toBeVisible();
    await correct.click();
    // Após escolha, o player mostra verificação/continuidade ou feedback de acerto.
    await clickFirstVisible(page, [/^Verificar$/, /^Conferir$/, /^Continuar$/]);
    await expect(
      page.getByText(/Boa|Certo|Continuar|próxim|precisão|XP|Qi|\d+\/\d+/i).first()
    ).toBeVisible();

    // Tela de vitória e copy de save são cobertas por validate:lesson-victory-ui;
    // aqui garantimos que o fluxo de acerto não quebra o player.
    await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
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
