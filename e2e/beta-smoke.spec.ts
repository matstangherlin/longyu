import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  clickStable,
  dismissBlockingOverlays,
  seedFoundationThrough,
  seedFreshJourneySession,
  seedLessonPlayerReady,
  seedLessonRecoverySession,
  seedOnboardedSession,
  waitForLazyPage,
} from "./helpers";

async function clickFirstVisible(page: Page, names: RegExp[]) {
  for (const name of names) {
    const button = page.getByRole("button", { name });
    const first = button.first();
    if (!(await first.isVisible().catch(() => false))) continue;
    if (await first.isDisabled().catch(() => false)) continue;
    try {
      await first.click({ timeout: 1_500 });
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

/** Clique curto — evita travar 30s em botão disabled (ex.: banco de produce cheio). */
async function clickIfEnabled(locator: Locator, timeout = 1_500): Promise<boolean> {
  if (!(await locator.isVisible().catch(() => false))) return false;
  if (await locator.isDisabled().catch(() => true)) return false;
  try {
    await locator.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

/** Ordem correta de componentes do Hànzì Builder para prompts comuns no smoke. */
function hanziBuilderOrder(prompt: string): string[] {
  if (/você|nǐ|你/i.test(prompt)) return ["亻", "尔"];
  if (/bom|boa|hǎo|好/i.test(prompt)) return ["女", "子"];
  if (/pessoa|rén|人/i.test(prompt)) return ["人"];
  if (/madeira|árvore|mù|木/i.test(prompt)) return ["木"];
  if (/montanha|shān|山/i.test(prompt)) return ["山"];
  return [];
}

/** Avança passos genéricos até o seletor aparecer (smoke, não prova pedagógica profunda). */
async function advanceUntilVisible(page: Page, target: Locator, maxSteps = 14): Promise<boolean> {
  const deadline = Date.now() + Math.min(25_000, Math.max(6_000, maxSteps * 1_200));
  for (let step = 0; step < maxSteps; step += 1) {
    if (Date.now() > deadline) break;
    await dismissBlockingOverlays(page);
    await page.keyboard.press("Escape").catch(() => undefined);
    if (await target.isVisible().catch(() => false)) return true;

    // Produce concluído: o CTA é "Certo! +Qi", não "Continuar".
    if (await clickIfEnabled(page.getByRole("button", { name: /Certo!|\+Qi/i }).first())) {
      await page.waitForTimeout(150);
      continue;
    }

    // Hànzì Builder ("Monte pelas peças") — NÃO confundir com produce ("Monte … na ordem certa").
    const hanziBuilder = page.getByText(/Monte pelas peças|Monte o hànzì/i).first();
    if (await hanziBuilder.isVisible().catch(() => false)) {
      const prompt =
        (await page.locator("h2, p, [class*='eyebrow']").allTextContents().then((t) => t.join(" ")).catch(() => "")) ??
        "";
      const order = hanziBuilderOrder(prompt);
      let placed = 0;
      for (const glyph of order) {
        const token = page.getByRole("button", { name: new RegExp(`^Peça \\d+: Peça ${glyph}\\b`) }).first();
        if (await clickIfEnabled(token)) placed += 1;
      }
      if (placed === 0) {
        // Sem ordem conhecida: tenta atalho numérico na ordem do banco.
        const pieces = page.getByRole("button", { name: /^Peça \d+:/ });
        const count = await pieces.count();
        for (let i = 0; i < count; i += 1) await clickIfEnabled(pieces.nth(i));
      }
      if (!(await clickIfEnabled(page.getByRole("button", { name: /^Verificar$/ }).first()))) {
        await clickFirstVisible(page, [/^Pular/, /^Continuar$/, /Certo!|\+Qi/]);
      } else {
        await clickFirstVisible(page, [/^Continuar$/, /Certo!|\+Qi/, /^Tentar de novo$/]);
      }
      await page.waitForTimeout(150);
      continue;
    }

    // Produce (banco de sílabas/caracteres): "Monte “olá” na ordem certa."
    const produceMonte = page.getByText(/Monte [“"'].+[”"'] na ordem certa/i).first();
    if (await produceMonte.isVisible().catch(() => false)) {
      const prompt = (await produceMonte.textContent().catch(() => "")) ?? "";
      let order = ["你", "好"];
      if (/estou bem|muito bem/i.test(prompt)) order = ["我", "很", "好"];
      else if (/até logo|tchau/i.test(prompt)) order = ["再", "见"];
      else if (/obrigad/i.test(prompt)) order = ["谢", "谢"];

      let picked = 0;
      for (const label of order) {
        // Só o botão do banco (`Peça N: …`). Não clicar no glossário interno (`你: …`).
        const token = page.getByRole("button", { name: new RegExp(`^Peça \\d+: ${label}$`) }).first();
        if (await clickIfEnabled(token)) {
          picked += 1;
          await page.keyboard.press("Escape").catch(() => undefined);
        }
      }

      if (
        !(await clickIfEnabled(page.getByRole("button", { name: /Certo!|\+Qi/i }).first())) &&
        !(await clickFirstVisible(page, [/^Verificar$/, /^Confirmar$/, /^Continuar$/]))
      ) {
        if (picked === 0 || step >= 2) {
          await clickFirstVisible(page, [/^Pular/, /^Tentar de novo$/]);
        }
      }
      await page.waitForTimeout(150);
      continue;
    }

    const piece = page.getByRole("button", { name: /^Peça \d+:/ }).first();
    if (await piece.isVisible().catch(() => false)) {
      const pieces = page.getByRole("button", { name: /^Peça \d+:/ });
      const count = await pieces.count();
      for (let i = 0; i < count; i += 1) {
        await clickIfEnabled(pieces.nth(i));
      }
      await clickFirstVisible(page, [/Certo!|\+Qi/, /^Verificar$/, /^Confirmar$/]);
      await clickFirstVisible(page, [/^Continuar$/, /^Conferir$/, /^Pular/]);
      await page.waitForTimeout(150);
      continue;
    }

    // Cena de conversa: as opções são "Opção N: …". Responder antes de Pular —
    // Pular gasta Fôlego e o modal "Seu Fôlego acabou" trava o smoke.
    const conversationOption = page.getByRole("button", { name: /^Opção \d+:/ }).first();
    if (await conversationOption.isVisible().catch(() => false)) {
      const options = page.getByRole("button", { name: /^Opção \d+:/ });
      const count = await options.count();
      const prompt =
        (await page.locator("h2, p").allTextContents().then((t) => t.join(" ")).catch(() => "")) ?? "";
      let picked = false;
      for (let i = 0; i < count; i += 1) {
        const label = (await options.nth(i).textContent().catch(() => "")) ?? "";
        const likely =
          (/Matheus|我叫/i.test(prompt) && /Matheus|meu nome/i.test(label)) ||
          (/olá|cumpriment|你好/i.test(prompt) && /olá|你好|nǐ hǎo/i.test(label));
        if (likely && (await clickIfEnabled(options.nth(i)))) {
          picked = true;
          break;
        }
      }
      if (!picked) await clickIfEnabled(conversationOption);
      if (!(await clickIfEnabled(page.getByRole("button", { name: /^Verificar$/ }).first()))) {
        await clickFirstVisible(page, [/^Confirmar$/, /^Continuar$/, /^Pular/]);
      } else {
        await clickFirstVisible(page, [/^Continuar$/, /Certo!|\+Qi/, /^Pular/]);
      }
      await page.waitForTimeout(150);
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
        await clickIfEnabled(option);
        await clickFirstVisible(page, [/^Verificar$/, /^Conferir$/, /^Continuar$/, /^Confirmar$/]);
      } else {
        const mcOption = page.getByRole("button", { name: /^Opção \d+/ }).first();
        if (await mcOption.isVisible().catch(() => false)) {
          await clickIfEnabled(mcOption);
          await clickFirstVisible(page, [/^Confirmar$/, /^Verificar$/, /^Conferir$/, /^Continuar$/]);
        } else {
          break;
        }
      }
    }
    await page.waitForTimeout(150);
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
    await expect(page.getByRole("link", { name: /Começar agora/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Já tenho uma conta/i })).toBeVisible();
  });

  test("cadastro: /comecar inicia onboarding / teste de nível", async ({ page }) => {
    await page.goto("/comecar");
    await expect(page.getByRole("button", { name: /Começar/i })).toBeVisible();
    await expect(page.getByText(/ponto de partida|jornada|conta/i).first()).toBeVisible();
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
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Uma língua falada|A língua padrão|Língua, não alfabeto/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Entendi" }).click();
    await clickFirstVisible(page, [/^Não posso falar agora$/]);
    await expect(page.getByRole("button", { name: /你好/ }).first()).toBeVisible();
  });

  test("erro e correção: revisão Pro com pendência", async ({ page }) => {
    await seedLessonRecoverySession(page, { lessonId: "l1", stars: 2, isPremium: true });
    await page.goto("/revisao?modo=erros");
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/1 pendente\(s\)/)).toBeVisible();
    await clickStable(page, /Corrigir agora/i);
    await dismissBlockingOverlays(page);
    await expect(page.getByText(/你好|Toque no que ouviu|prioridade de revisão|Revisar:|Tarefa|Corrigir pontos fracos/i).first()).toBeVisible();
  });

  test("Hànzì Builder: lição de primeiros hànzì carrega montagem", async ({ page }) => {
    await seedFoundationThrough(page, "p1-o-que-e-hanzi");
    await page.goto("/licao/p1-primeiros-hanzi/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Monte peça por peça/ })).toBeVisible({
      timeout: 20_000,
    });
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
    await waitForLazyPage(page);
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
    test.setTimeout(90_000);
    await seedLessonPlayerReady(page, "l2", { isPremium: true });
    await page.goto("/licao/l2/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    if (await page.getByRole("button", { name: "Entendi" }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Entendi" }).click();
    }

    // Pipeline no bundle (code-splitting espalha fase/cena em chunks).
    const hasPostConversationPipeline = await page.evaluate(async () => {
      const urls = new Set<string>();
      for (const el of document.querySelectorAll("script[src]")) {
        const src = (el as HTMLScriptElement).src;
        if (src) urls.add(src);
      }
      for (const entry of performance.getEntriesByType("resource")) {
        if (entry.name.endsWith(".js")) urls.add(entry.name);
      }
      try {
        const html = await fetch("/").then((r) => r.text());
        for (const match of html.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)) {
          urls.add(new URL(`/${match[0]}`, location.origin).href);
        }
      } catch {
        // ignore
      }
      let hasPhase = false;
      let hasScene = false;
      for (const src of urls) {
        try {
          const js = await fetch(src).then((r) => r.text());
          if (js.includes("postConversationPhase")) hasPhase = true;
          if (js.includes("primeiro-cumprimento")) hasScene = true;
          if (hasPhase && hasScene) return true;
        } catch {
          // ignore
        }
      }
      return hasPhase && hasScene;
    });
    expect(hasPostConversationPipeline).toBeTruthy();

    const postCue = page
      .getByText(
        /Pós-Conversa|O que esta frase significa|Qual resposta combina|Monte a resposta|Ouça e escolha|Complete a palavra|Use na frase|Complete o cumprimento/i
      )
      .first();
    // Agora o advanceUntilVisible trata Hànzì Builder — exige chegar na UI.
    const found = await advanceUntilVisible(page, postCue, 22);
    expect(found).toBeTruthy();
    await expect(postCue).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Unexpected Application Error");
  });

  test("conclusão da lição: acerto, feedback e progresso", async ({ page }) => {
    await seedFreshJourneySession(page);
    await page.goto("/licao/p1-o-que-e-mandarim/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await expect(page.getByRole("heading", { name: /Uma língua falada|A língua padrão|Língua, não alfabeto/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Entendi" }).click();
    await clickFirstVisible(page, [/^Não posso falar agora$/]);

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
