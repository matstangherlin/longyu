import type { Page, Locator } from "@playwright/test";

export async function clickFirstVisible(page: Page, names: RegExp[]) {
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

/** Ordem correta de componentes do Hànzì Builder para prompts comuns no smoke. */
export function hanziBuilderOrder(prompt: string): string[] {
  if (/você|nǐ|你/i.test(prompt)) return ["亻", "尔"];
  if (/bom|boa|hǎo|好/i.test(prompt)) return ["女", "子"];
  if (/pessoa|rén|人/i.test(prompt)) return ["人"];
  if (/madeira|árvore|mù|木/i.test(prompt)) return ["木"];
  if (/montanha|shān|山/i.test(prompt)) return ["山"];
  return [];
}

/** Avança passos genéricos até o seletor aparecer (smoke, não prova pedagógica profunda). */
export async function advanceUntilVisible(page: Page, target: Locator, maxSteps = 14): Promise<boolean> {
  const deadline = Date.now() + Math.min(25_000, Math.max(6_000, maxSteps * 1_200));
  for (let step = 0; step < maxSteps; step += 1) {
    if (Date.now() > deadline) break;
    if (await target.isVisible().catch(() => false)) return true;
    if ((await page.locator("[data-conversation-scene]").count()) > 0) {
      if (await target.isVisible().catch(() => false)) return true;
    }
    await page.keyboard.press("Escape").catch(() => undefined);

    const skipSpeak = page.getByRole("button", { name: /Não posso falar agora/i });
    if (await skipSpeak.isVisible().catch(() => false)) {
      await clickIfEnabled(skipSpeak);
      await page.waitForTimeout(150);
      continue;
    }

    const reviewHeading = page.getByRole("heading", { name: /pontos para firmar|Revisão da lição/i });
    if (await reviewHeading.isVisible().catch(() => false)) {
      await clickFirstVisible(page, [/^Continuar$/]);
      await page.waitForTimeout(150);
      continue;
    }

    const folegoBack = page.getByRole("button", { name: /Voltar e tentar acertar/i });
    if (await folegoBack.isVisible().catch(() => false)) {
      await folegoBack.click({ timeout: 1_500 }).catch(() => undefined);
      await page.waitForTimeout(150);
      continue;
    }

      // Modal de erro: prefere continuar sem perfeição para não travar o smoke.
      const mistake = page.getByRole("heading", { name: /Quer tentar de novo|Quase/i });
      if (await mistake.isVisible().catch(() => false)) {
      await clickFirstVisible(page, [/^Continuar$/, /^Continuar e perder perfeição$/, /^Tentar de novo$/]);
      await page.waitForTimeout(150);
      continue;
    }

    if (await target.isVisible().catch(() => false)) return true;

    if (await clickIfEnabled(page.getByRole("button", { name: /Certo!|\+Qi/i }).first())) {
      await page.waitForTimeout(150);
      continue;
    }

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

    const produceMonte = page.getByText(/Monte [“"'].+[”"'] na ordem certa/i).first();
    if (await produceMonte.isVisible().catch(() => false)) {
      const prompt = (await produceMonte.textContent().catch(() => "")) ?? "";
      let order = ["你", "好"];
      if (/estou bem|muito bem/i.test(prompt)) order = ["我", "很", "好"];
      else if (/até logo|tchau/i.test(prompt)) order = ["再", "见"];
      else if (/obrigad/i.test(prompt)) order = ["谢", "谢"];

      let picked = 0;
      for (const label of order) {
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

    const pairsBoard = page.getByText(/\d+\/\d+ pares/);
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
      await tryPair(/^你好$/, /^Olá$/);
      await tryPair(/^Olá$/, /^你好$/);
      await tryPair(/som que você ouviu/i, /falado|mandarim/i);
      await tryPair(/^nǐ hǎo$/i, /pinyin/i);
      await tryPair(/^你好$/, /hànzì|escrita/i);
      await tryPair(/^Olá$/, /tradução|significado/i);
      await tryPair(/o que você ouviu/i, /mandarim falado/i);
      await tryPair(/^xièxie$/i, /^谢谢$/);
      await tryPair(/^谢谢$/, /Obrigado/);
      await tryPair(/^再见$/, /Até/);
      await tryPair(/^不客气$/, /De nada/);
      if (await pairsBoard.isVisible().catch(() => false)) {
        await clickFirstVisible(page, [/^Continuar$/, /Certo!|\+Qi/, /^Verificar$/, /^Pular/]);
      }
      await page.waitForTimeout(200);
      if (await target.isVisible().catch(() => false)) return true;
      continue;
    }

    // Responder múltipla escolha ANTES de Pular — o botão de skip fica visível
    // nas atividades avaliadas e esgota o Fôlego de uma conta nova.
    const greetingChoice = page.getByRole("button", { name: /^(Olá|你好|谢谢|再见)$/ }).first();
    if (await greetingChoice.isVisible().catch(() => false)) {
      await clickIfEnabled(greetingChoice);
      await clickFirstVisible(page, [/^Verificar$/, /^Conferir$/, /^Continuar$/, /^Confirmar$/, /Certo!|\+Qi/]);
      await page.waitForTimeout(150);
      continue;
    }

    const labeledOption = page.getByRole("button", { name: /^Opção \d+:/ });
    if (await labeledOption.first().isVisible().catch(() => false)) {
      const preferred = page.getByRole("button", {
        name: /Opção \d+: (Olá|你好|谢谢|再见|obrigad|guiar a pronúncia)/i,
      }).first();
      if (await preferred.isVisible().catch(() => false)) {
        await clickIfEnabled(preferred);
      } else if (!(await clickFirstVisible(page, [/^Pular/]))) {
        await clickIfEnabled(labeledOption.first());
      }
      await clickFirstVisible(page, [/^Verificar$/, /^Conferir$/, /^Continuar$/, /^Confirmar$/, /Certo!|\+Qi/]);
      await page.waitForTimeout(150);
      continue;
    }

    const glyphOption = page
      .locator("button")
      .filter({ hasText: /^(你好|谢谢|再见|木|人|山|mù|rén)$/i })
      .first();
    if (await glyphOption.isVisible().catch(() => false)) {
      await clickIfEnabled(glyphOption);
      await clickFirstVisible(page, [/^Verificar$/, /^Conferir$/, /^Continuar$/, /^Confirmar$/]);
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
    ]);
    if (!advanced) {
      if ((await page.locator("[data-conversation-scene]").count()) > 0) return true;
      const skipped = await clickFirstVisible(page, [/^Pular/]);
      if (!skipped) break;
    }
    await page.waitForTimeout(350);
    if (await target.isVisible().catch(() => false)) return true;
  }
  return target.isVisible().catch(() => false);
}

/** Avança um passo genérico (para loop até vitória). */
export async function advanceOneStep(page: Page): Promise<boolean> {
  const victory = page.getByRole("button", { name: /Continuar Jornada|Voltar à Jornada|Receber recompensas|Continuar tema/i }).first();
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
