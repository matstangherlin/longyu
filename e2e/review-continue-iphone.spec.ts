import { test, expect } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedLessonRecoverySession,
  waitForLazyPage,
} from "./helpers";

/**
 * B003 — após Verificar na revisão, o feedback Certo/Errado e um CTA Continuar
 * precisam ficar visíveis (regressão iPhone/Safari: revealed sem ação).
 */
test.describe("B003 — revisão continua após revelar", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Verificar → Certo/Errado + Continuar sticky acessível", async ({ page }) => {
    await seedLessonRecoverySession(page, { lessonId: "l1", stars: 2, isPremium: true });
    await page.goto("/revisao?modo=erros");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await page.getByRole("button", { name: /Corrigir agora/i }).click();
    await dismissBlockingOverlays(page);
    await waitForLazyPage(page);

    // Hanzi builder tem fluxo próprio — pula se for o caso.
    if (await page.locator("[data-hanzi-builder], [data-builder-id]").first().isVisible().catch(() => false)) {
      test.skip(true, "Item atual é Hanzi Builder — coberto por outro fluxo.");
    }

    const verify = page.getByRole("button", { name: /Verificar|Conferir resposta/i });
    await expect(verify).toBeVisible({ timeout: 15_000 });

    // Escolhe a primeira opção disponível (choice / piece / pair).
    const option = page.locator("button").filter({ has: page.locator(".hanzi, span") }).filter({ hasNotText: /Verificar|Conferir|Pular|Corrigir|Voltar/i }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click().catch(() => undefined);
    } else {
      // sentence_build: clica a primeira peça do banco
      const piece = page.locator("[data-review-options] button, [data-review-bank] button").first();
      if (await piece.isVisible().catch(() => false)) {
        await piece.click();
      }
    }

    // Se Verificar ainda disabled, tenta mais um clique de peça/opção.
    if (await verify.isDisabled().catch(() => false)) {
      const more = page.locator("[data-review-options] button:not([disabled]), button.border-line").first();
      await more.click().catch(() => undefined);
    }

    await expect(verify).toBeEnabled({ timeout: 8_000 });
    await verify.click();

    await expect(page.locator("[data-review-feedback]")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/^(Certo|Errado|Erro corrigido!|Confira a resposta)$/)).toBeVisible();

    const continueBtn = page.locator("[data-review-continue]");
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toBeInViewport();
    await continueBtn.click();

    // Avançou: Verificar de novo OU fim de sessão / próximo item.
    await expect(
      page.getByRole("button", { name: /Verificar|Conferir resposta|Continuar|Voltar|Revisar/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
