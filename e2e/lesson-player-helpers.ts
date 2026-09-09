import type { Page, Locator } from "@playwright/test";
import { dismissJourneyCultureBridgeIfOpen } from "./helpers";

export async function clickFirstVisible(page: Page, names: RegExp[]) {
  for (const name of names) {
    const button = page.getByRole("button", { name });
    const first = button.first();
    if (!(await first.isVisible().catch(() => false))) continue;
    if (await first.isDisabled().catch(() => false)) continue;
    await first.scrollIntoViewIfNeeded().catch(() => undefined);
    try {
      await first.click({ timeout: 1_500 });
      return true;
    } catch {
      try {
        await first.click({ timeout: 1_000, force: true });
        return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

/** Clique curto — evita travar 30s em botão disabled (ex.: banco de produce cheio). */
export async function clickIfEnabled(locator: Locator, timeout = 1_500): Promise<boolean> {
  if (!(await locator.isVisible().catch(() => false))) return false;
  if (await locator.isDisabled().catch(() => true)) return false;
  try {
    await locator.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

/** Avança uma batida da conversation_scene. Pular só aparece no checkpoint. */
export async function advanceConversationIfOpen(page: Page): Promise<boolean> {
  const scenes = page.locator("[data-conversation-scene]");
  const count = await scenes.count().catch(() => 0);
  let scene = scenes.first();
  let found = false;
  for (let i = 0; i < count; i += 1) {
    if (await scenes.nth(i).isVisible().catch(() => false)) {
      scene = scenes.nth(i);
      found = true;
      break;
    }
  }
  if (!found) return false;

  const skipInScene = scene.getByRole("button", { name: /^Pular|^Skip/ });
  if (await clickIfEnabled(skipInScene.first())) return true;

  const option = scene.getByRole("button", { name: /^(Opção|Option) \d+:/ }).first();
  if (await option.isVisible().catch(() => false)) {
    if (await clickIfEnabled(option)) {
      await clickIfEnabled(scene.getByRole("button", { name: /^Verificar$|^Check$|^Confirmar$|^Confirm$|^Conferir$/ }).first());
      return true;
    }
  }

  const cta = scene.getByRole("button", {
    name: /^(Responder|Reply|Continuar|Continue|Concluir|Finish)(?:\s*>)?$/i,
  }).first();
  if (!(await cta.isVisible().catch(() => false))) return false;
  await cta.scrollIntoViewIfNeeded().catch(() => undefined);
  if (await clickIfEnabled(cta, 2_000)) return true;
  try {
    await cta.click({ timeout: 1_500, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * One skip-through beat for multi-pass loops.
 * Finish the Journey culture bridge and conversation_scene before Pular —
 * Pular on a bridge targets the hidden exercise and stalls on disabled Verificar.
 */
export async function advanceSkipThroughOverlays(page: Page): Promise<boolean> {
  if (await dismissJourneyCultureBridgeIfOpen(page)) {
    await page.waitForTimeout(120);
    return true;
  }
  if (await advanceConversationIfOpen(page)) {
    await page.waitForTimeout(180);
    return true;
  }
  if (
    await clickFirstVisible(page, [
      /^Entendi$|^Got it$/,
      /^Pular|^Skip/,
      /Não posso falar agora|I can't speak now/,
      /Não posso ouvir agora|I can't listen now/,
    ])
  ) {
    await page.waitForTimeout(180);
    return true;
  }
  return false;
}

/** Ordem correta de componentes do Hànzì Builder para prompts comuns no smoke. */
export function hanziBuilderOrder(prompt: string): string[] {
  if (/você|you|nǐ|你/i.test(prompt)) return ["亻", "尔"];
  if (/bom|boa|good|hǎo|好/i.test(prompt)) return ["女", "子"];
  if (/pessoa|person|rén|人/i.test(prompt)) return ["人"];
  if (/madeira|árvore|tree|wood|mù|木/i.test(prompt)) return ["木"];
  if (/lua|mês|moon|month|yuè|月/i.test(prompt)) return [];
  if (/montanha|mountain|shān|山/i.test(prompt)) return ["山"];
  return [];
}

/** Avança passos genéricos até o seletor aparecer (smoke, não prova pedagógica profunda). */
async function locatorIsInsideCultureBridge(target: Locator): Promise<boolean> {
  if (/culture-bridge/.test(String(target))) return true;
  return target
    .evaluate((el) => Boolean(el.closest?.("[data-testid=\"culture-bridge\"]") || el.getAttribute("data-testid") === "culture-bridge"))
    .catch(() => false);
}

export async function advanceUntilVisible(page: Page, target: Locator, maxSteps = 14): Promise<boolean> {
  const deadline = Date.now() + Math.min(25_000, Math.max(6_000, maxSteps * 1_200));
  for (let step = 0; step < maxSteps; step += 1) {
    if (Date.now() > deadline) break;
    if (await target.isVisible().catch(() => false)) return true;
    const keepBridge = await locatorIsInsideCultureBridge(target);
    if (await dismissJourneyCultureBridgeIfOpen(page, { keepVisible: keepBridge })) {
      await page.waitForTimeout(120);
      continue;
    }
    if (await advanceConversationIfOpen(page)) {
      await page.waitForTimeout(180);
      continue;
    }
    if (await clickFirstVisible(page, [/^Entendi$|^Got it$/, /^Pular|^Skip/])) {
      await page.waitForTimeout(150);
      continue;
    }
    await page.keyboard.press("Escape").catch(() => undefined);

    const skipSpeak = page.getByRole("button", { name: /Não posso falar agora|I can't speak now/i });
    if (await skipSpeak.isVisible().catch(() => false)) {
      await clickIfEnabled(skipSpeak);
      await page.waitForTimeout(150);
      continue;
    }

    const reviewHeading = page.getByRole("heading", { name: /pontos para firmar|Revisão da lição|Lesson review|points to lock in/i });
    if (await reviewHeading.isVisible().catch(() => false)) {
      await clickFirstVisible(page, [/^Continuar(?:\s*>)?$|^Continue(?:\s*>)?$/]);
      await page.waitForTimeout(150);
      continue;
    }

    const folegoBack = page.getByRole("button", { name: /Voltar e tentar acertar|Go back and get it right/i });
    if (await folegoBack.isVisible().catch(() => false)) {
      await folegoBack.click({ timeout: 1_500 }).catch(() => undefined);
      await page.waitForTimeout(150);
      continue;
    }

      // Modal de erro: prefere continuar sem perfeição para não travar o smoke.
      const mistake = page.getByRole("heading", { name: /Quer tentar de novo|Want to try again|Quase|Almost/i });
      if (await mistake.isVisible().catch(() => false)) {
      await clickFirstVisible(page, [/^Continuar$|^Continue$/, /^Continuar e perder perfeição$/, /^Tentar de novo$|^Try again$/]);
      await page.waitForTimeout(150);
      continue;
    }

    if (await target.isVisible().catch(() => false)) return true;

    if (await clickIfEnabled(page.getByRole("button", { name: /Certo!|\+Qi/i }).first())) {
      await page.waitForTimeout(150);
      continue;
    }

    const hanziBuilder = page.getByText(/Monte pelas peças|Monte o hànzì|Build from pieces|Build the hànzì/i).first();
    if (await hanziBuilder.isVisible().catch(() => false)) {
      const prompt =
        (await page.locator("h2, p, [class*='eyebrow']").allTextContents().then((t) => t.join(" ")).catch(() => "")) ??
        "";
      const order = hanziBuilderOrder(prompt);
      let placed = 0;
      for (const glyph of order) {
        const token = page.getByRole("button", { name: new RegExp(`^(Peça|Piece) \\d+: (Peça |Piece )?${glyph}\\b`) }).first();
        if (await clickIfEnabled(token)) placed += 1;
      }
      if (placed === 0) {
        const pieces = page.getByRole("button", { name: /^(Peça|Piece) \d+:/ });
        const count = await pieces.count();
        for (let i = 0; i < count; i += 1) await clickIfEnabled(pieces.nth(i));
      }
      if (!(await clickIfEnabled(page.getByRole("button", { name: /^Verificar$|^Check$/ }).first()))) {
        await clickFirstVisible(page, [/^Pular|^Skip/, /^Continuar$|^Continue$/, /Certo!|\+Qi/]);
      } else {
        await clickFirstVisible(page, [/^Continuar$|^Continue$/, /Certo!|\+Qi/, /^Tentar de novo$|^Try again$/]);
      }
      await page.waitForTimeout(150);
      continue;
    }

    const produceMonte = page.getByText(/Monte [“"'].+[”"'] na ordem certa|Build [“"'].+[”"'] in the right order/i).first();
    if (await produceMonte.isVisible().catch(() => false)) {
      const prompt = (await produceMonte.textContent().catch(() => "")) ?? "";
      let order = ["你", "好"];
      if (/estou bem|muito bem|i'm fine|i am fine/i.test(prompt)) order = ["我", "很", "好"];
      else if (/até logo|tchau|see you later|bye/i.test(prompt)) order = ["再", "见"];
      else if (/obrigad|thank/i.test(prompt)) order = ["谢", "谢"];

      let picked = 0;
      for (const label of order) {
        const token = page.getByRole("button", { name: new RegExp(`^(Peça|Piece) \\d+: ${label}$`) }).first();
        if (await clickIfEnabled(token)) {
          picked += 1;
          await page.keyboard.press("Escape").catch(() => undefined);
        }
      }

      if (
        !(await clickIfEnabled(page.getByRole("button", { name: /Certo!|Correct!|\+Qi/i }).first())) &&
        !(await clickFirstVisible(page, [/^Verificar$|^Check$/, /^Confirmar$|^Confirm$/, /^Continuar$|^Continue$/]))
      ) {
        if (picked === 0 || step >= 2) {
          await clickFirstVisible(page, [/^Pular|^Skip/, /^Tentar de novo$|^Try again$/]);
        }
      }
      await page.waitForTimeout(150);
      continue;
    }

    const piece = page.getByRole("button", { name: /^(Peça|Piece) \d+:/ }).first();
    if (await piece.isVisible().catch(() => false)) {
      const pieces = page.getByRole("button", { name: /^(Peça|Piece) \d+:/ });
      const count = await pieces.count();
      for (let i = 0; i < count; i += 1) {
        await clickIfEnabled(pieces.nth(i));
      }
      await clickFirstVisible(page, [/Certo!|Correct!|\+Qi/, /^Verificar$|^Check$/, /^Confirmar$|^Confirm$/]);
      await clickFirstVisible(page, [/^Continuar$|^Continue$/, /^Conferir$/, /^Pular|^Skip/]);
      await page.waitForTimeout(150);
      continue;
    }

    const pairsBoard = page.getByText(/\d+\/\d+ pares|\d+\/\d+ pairs/);
    if (await pairsBoard.isVisible().catch(() => false)) {
      const tryPair = async (leftName: RegExp, rightName: RegExp) => {
        try {
          const left = page.getByRole("button", { name: leftName });
          const right = page.getByRole("button", { name: rightName });
          if (!(await left.first().isVisible().catch(() => false))) return;
          if (!(await right.first().isVisible().catch(() => false))) return;
          await clickIfEnabled(left.first());
          const rightTarget = (await right.count().catch(() => 0)) > 1 ? right.last() : right.first();
          await clickIfEnabled(rightTarget);
        } catch {
          /* quadro desmontou ou a página fechou */
        }
      };
      await tryPair(/^nǐ hǎo$/i, /^你好$/);
      await tryPair(/^你好$/, /^Olá$|^Hello$/);
      await tryPair(/^Olá$|^Hello$/, /^你好$/);
      await tryPair(/som que você ouviu|sound you heard/i, /falado|spoken|mandarim|mandarin/i);
      await tryPair(/^nǐ hǎo$/i, /pinyin/i);
      await tryPair(/^你好$/, /hànzì|escrita|writing/i);
      await tryPair(/^Olá$|^Hello$/, /tradução|significado|translation|meaning/i);
      await tryPair(/o que você ouviu|what you heard/i, /mandarim falado|spoken mandarin/i);
      await tryPair(/^xièxie$/i, /^谢谢$/);
      await tryPair(/^谢谢$/, /Obrigado|Thanks/);
      await tryPair(/^再见$/, /Até|See you/);
      await tryPair(/^不客气$/, /De nada|You're welcome/);
      if (await pairsBoard.isVisible().catch(() => false)) {
        await clickFirstVisible(page, [/^Continuar$|^Continue$/, /Certo!|Correct!|\+Qi/, /^Verificar$|^Check$/, /^Pular|^Skip/]);
      }
      await page.waitForTimeout(200);
      if (await target.isVisible().catch(() => false)) return true;
      continue;
    }

    // Responder múltipla escolha ANTES de Pular — o botão de skip fica visível
    // nas atividades avaliadas e esgota o Fôlego de uma conta nova.
    const greetingChoice = page.getByRole("button", { name: /^(Olá|Hello|你好|谢谢|再见)$/ }).first();
    if (await greetingChoice.isVisible().catch(() => false)) {
      await clickIfEnabled(greetingChoice);
      await clickFirstVisible(page, [/^Verificar$|^Check$/, /^Conferir$/, /^Continuar$|^Continue$/, /^Confirmar$|^Confirm$/, /Certo!|Correct!|\+Qi/]);
      await page.waitForTimeout(150);
      continue;
    }

    const labeledOption = page.getByRole("button", { name: /^(Opção|Option) \d+:/ });
    if (await labeledOption.first().isVisible().catch(() => false)) {
      const preferred = page.getByRole("button", {
        name: /(Opção|Option) \d+: (Olá|Hello|你好|谢谢|再见|obrigad|thanks|guiar a pronúncia)/i,
      }).first();
      if (await preferred.isVisible().catch(() => false)) {
        await clickIfEnabled(preferred);
      } else if (!(await clickFirstVisible(page, [/^Pular|^Skip/]))) {
        await clickIfEnabled(labeledOption.first());
      }
      await clickFirstVisible(page, [/^Verificar$|^Check$/, /^Conferir$/, /^Continuar$|^Continue$/, /^Confirmar$|^Confirm$/, /Certo!|Correct!|\+Qi/]);
      await page.waitForTimeout(150);
      continue;
    }

    const glyphOption = page
      .locator("button")
      .filter({ hasText: /^(你好|谢谢|再见|木|人|山|mù|rén)$/i })
      .first();
    if (await glyphOption.isVisible().catch(() => false)) {
      await clickIfEnabled(glyphOption);
      await clickFirstVisible(page, [/^Verificar$|^Check$/, /^Conferir$/, /^Continuar$|^Continue$/, /^Confirmar$|^Confirm$/]);
      await page.waitForTimeout(150);
      continue;
    }

    const skippedEarly = await clickFirstVisible(page, [/^Pular|^Skip/]);
    if (skippedEarly) {
      await page.waitForTimeout(150);
      continue;
    }

    const advanced = await clickFirstVisible(page, [
      /^Entendi$|^Got it$/,
      /^Continuar(?:\s*>)?$|^Continue(?:\s*>)?$/,
      /^Próximo$|^Next$/,
      /^Verificar$|^Check$/,
      /^Conferir$/,
      /^Confirmar$|^Confirm$/,
      /^Responder(?:\s*>)?$|^Reply(?:\s*>)?$|^Answer$/,
      /^Concluir$|^Finish$/,
      /^Ouvir de novo$|^Listen again$/,
    ]);
    if (!advanced) {
      const skipped = await clickFirstVisible(page, [/^Pular|^Skip/]);
      if (!skipped) break;
    }
    await page.waitForTimeout(350);
    if (await target.isVisible().catch(() => false)) return true;
  }
  return target.isVisible().catch(() => false);
}

/** Avança um passo genérico (para loop até vitória). */
export async function advanceOneStep(page: Page): Promise<boolean> {
  const victory = page.getByRole("button", { name: /Continuar Jornada|Continue Journey|Voltar à Jornada|Back to the Journey|Receber recompensas|Continuar tema|Continue topic|Practice again|Praticar novamente/i }).first();
  return advanceUntilVisible(page, victory, 1);
}

export const RUNBOOK_LESSONS = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
  "p1-primeiros-hanzi",
  "p1-engine-2-lab",
  "p2-ma-primeiro-tom",
  "p2-ma-segundo-tom",
  "p2-ma-terceiro-tom",
  "p2-ma-quarto-tom",
  "p2-comparar-tom-1-4",
  "p2-comparar-tom-2-3",
  "p2-tons-nihao",
  "p2-tons-xiexie",
  "p3-wohenhao",
  "p3-wobuhui-shuo-zhongwen",
  "p3-qing-zai-shuo-yibian",
  "p4-num-123",
  "p4-num-45",
  "p4-num-678",
] as const;
