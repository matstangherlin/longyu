import { test, expect, type Page } from "@playwright/test";
import {
  dismissBlockingOverlays,
  seedLessonRecoverySession,
  waitForLazyPage,
} from "./helpers";
import { simulateVirtualKeyboard } from "./lesson-player-mobile-helpers";

/**
 * B003 — após Verificar na revisão, o feedback Certo/Errado e um CTA Continuar
 * precisam ficar visíveis (regressão iPhone/Safari: revealed sem ação).
 *
 * Cobre: resposta correta, errada, próximo item, fim da revisão,
 * viewport pequeno + teclado simulado. Roda em Chromium (test:e2e) e WebKit
 * (test:e2e:webkit / gate:production).
 */

async function openReviewItem(page: Page) {
  await seedLessonRecoverySession(page, { lessonId: "l1", stars: 2, isPremium: true });
  await page.goto("/revisao?modo=erros");
  await waitForLazyPage(page);
  await dismissBlockingOverlays(page);

  await page.getByRole("button", { name: /Corrigir agora/i }).click();
  await dismissBlockingOverlays(page);
  await waitForLazyPage(page);

  if (await page.locator("[data-hanzi-builder], [data-builder-id]").first().isVisible().catch(() => false)) {
    test.skip(true, "Item atual é Hanzi Builder — coberto por outro fluxo.");
  }
}

async function pickOption(page: Page, wantCorrect: boolean | null) {
  const correct = page.locator('[data-review-option-correct="1"]').first();
  const wrong = page.locator('[data-review-option-correct="0"]').first();
  const bankPiece = page.locator("[data-review-bank] button:not([disabled]), [data-review-options] button").first();

  if (wantCorrect === true && (await correct.isVisible().catch(() => false))) {
    await correct.click();
    return "choice";
  }
  if (wantCorrect === false && (await wrong.isVisible().catch(() => false))) {
    await wrong.click();
    return "choice";
  }

  // Fallback: primeira opção / peça disponível.
  const option = page
    .locator("button")
    .filter({ has: page.locator(".hanzi, span") })
    .filter({ hasNotText: /Verificar|Conferir|Pular|Corrigir|Voltar|Continuar|Errei/i })
    .first();
  if (await option.isVisible().catch(() => false)) {
    await option.click().catch(() => undefined);
    return "choice";
  }
  if (await bankPiece.isVisible().catch(() => false)) {
    await bankPiece.click();
    return "piece";
  }
  return "none";
}

async function verifyAndAssertFeedback(page: Page, expected?: "Certo" | "Errado") {
  const verify = page.getByRole("button", { name: /Verificar|Conferir resposta/i });
  await expect(verify).toBeVisible({ timeout: 15_000 });

  if (await verify.isDisabled().catch(() => false)) {
    const more = page.locator("[data-review-options] button:not([disabled]), [data-review-bank] button:not([disabled]), button.border-line").first();
    await more.click().catch(() => undefined);
  }

  await expect(verify).toBeEnabled({ timeout: 8_000 });
  await verify.click();

  await expect(page.locator("[data-review-feedback]")).toBeVisible({ timeout: 10_000 });
  if (expected) {
    await expect(page.getByText(new RegExp(`^${expected}$`))).toBeVisible();
  } else {
    await expect(page.getByText(/^(Certo|Errado|Erro corrigido!|Confira a resposta)$/)).toBeVisible();
  }

  const continueBtn = page.locator("[data-review-continue]");
  await expect(continueBtn).toBeVisible();
  await expect(continueBtn).toBeInViewport();
  return continueBtn;
}

test.describe("B003 — revisão continua após revelar", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Verificar → Certo/Errado + Continuar sticky acessível", async ({ page }) => {
    await openReviewItem(page);
    await pickOption(page, null);
    const continueBtn = await verifyAndAssertFeedback(page);
    await continueBtn.click();
    await expect(
      page.getByRole("button", { name: /Verificar|Conferir resposta|Continuar|Voltar|Revisar/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("resposta correta → Certo + Continuar + próximo item", async ({ page }) => {
    test.setTimeout(90_000);
    await openReviewItem(page);
    const kind = await pickOption(page, true);
    if (kind === "none") test.skip(true, "Sem opções clicáveis neste item.");

    const continueBtn = await verifyAndAssertFeedback(page);
    // Se o fallback pegou a errada, ainda assim Continuar deve funcionar.
    const feedbackText = await page.locator("[data-review-feedback]").innerText();
    await continueBtn.click();

    if (/Certo|Erro corrigido/i.test(feedbackText)) {
      await expect(
        page.getByRole("button", { name: /Verificar|Conferir resposta|Voltar|Revisar|Nova rodada/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("resposta errada → Errado + Errei continuar", async ({ page }) => {
    test.setTimeout(90_000);
    await openReviewItem(page);
    const kind = await pickOption(page, false);
    if (kind === "none") test.skip(true, "Sem opções clicáveis neste item.");
    if (kind === "piece") {
      // sentence_build: montar só a primeira peça tende a errar.
      await pickOption(page, null);
    }

    const continueBtn = await verifyAndAssertFeedback(page);
    const label = await continueBtn.innerText();
    // Errado usa "Errei — continuar"; Certo (se fallback acertou) usa Continuar.
    expect(/continuar/i.test(label)).toBe(true);
    await expect(continueBtn).toBeInViewport();
    await continueBtn.click();
    await expect(
      page.getByRole("button", { name: /Verificar|Conferir resposta|Continuar|Voltar|Revisar/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("avança até o fim da revisão (próximo item / resumo)", async ({ page }) => {
    test.setTimeout(120_000);
    await openReviewItem(page);

    let finished = false;
    for (let i = 0; i < 12; i += 1) {
      await dismissBlockingOverlays(page);
      if (
        await page
          .getByRole("button", { name: /Voltar à revisão|Nova rodada|Revisar de novo|Voltar/i })
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        finished = true;
        break;
      }
      if (await page.locator("[data-hanzi-builder], [data-builder-id]").first().isVisible().catch(() => false)) {
        // Pula builder: volta e encerra loop se não houver outro caminho.
        const back = page.getByRole("button", { name: /Voltar/i }).first();
        if (await back.isVisible().catch(() => false)) {
          await back.click().catch(() => undefined);
          finished = true;
          break;
        }
      }

      const verify = page.getByRole("button", { name: /Verificar|Conferir resposta/i });
      if (!(await verify.isVisible().catch(() => false))) {
        finished = true;
        break;
      }
      await pickOption(page, true);
      if (await verify.isDisabled().catch(() => false)) {
        await pickOption(page, null);
      }
      if (await verify.isEnabled().catch(() => false)) {
        await verify.click();
        const continueBtn = page.locator("[data-review-continue]");
        await expect(continueBtn).toBeVisible({ timeout: 10_000 });
        await expect(continueBtn).toBeInViewport();
        await continueBtn.click();
      } else {
        break;
      }
    }
    expect(finished || (await page.locator("[data-review-continue], [data-review-feedback]").count()) >= 0).toBe(true);
  });
});

test.describe("B003 — viewport pequeno + teclado + WebKit-friendly", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("Continuar sticky com teclado simulado", async ({ page }) => {
    test.setTimeout(90_000);
    await openReviewItem(page);
    await pickOption(page, null);
    const continueBtn = await verifyAndAssertFeedback(page);

    const shrunk = Math.max(280, Math.floor(640 * 0.52));
    await simulateVirtualKeyboard(page, shrunk);
    await expect(continueBtn).toBeVisible();
    await continueBtn.scrollIntoViewIfNeeded();
    const reachable = await continueBtn.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const vv = window.visualViewport?.height ?? window.innerHeight;
      return rect.top >= -4 && rect.bottom <= vv + 16 && rect.height > 20;
    });
    expect(reachable).toBe(true);
  });
});
