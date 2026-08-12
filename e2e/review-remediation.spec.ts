import { test, expect } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonRecoverySession, waitForLazyPage } from "./helpers";

/**
 * B002 — recuperação / remediação:
 * prompt, display e pinyin devem ser um único item coerente (nunca dump "你好 / 你好吗 / …").
 * UI da revisão: blocos pergunta / alternativas / resposta correta separados.
 */
test.describe("B002 — remediação sem dump concatenado", () => {
  test("revisão Pro de erro pendente não mostra frases concatenadas", async ({ page }) => {
    await seedLessonRecoverySession(page, { lessonId: "l1", stars: 2, isPremium: true });
    await page.goto("/revisao?modo=erros");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    await expect(page.getByText(/1 pendente\(s\)/)).toBeVisible();
    await page.getByRole("button", { name: /Corrigir agora/i }).click();
    await dismissBlockingOverlays(page);

    await expect(page.locator("body")).not.toContainText(/你好\s*\/\s*你好吗/);
    await expect(page.locator("body")).not.toContainText(/nǐ hǎo\s*\/\s*nǐ hǎo ma/i);
    await expect(page.getByRole("button", { name: /Pulou ou respondeu incorretamente/i })).toHaveCount(0);
  });

  test("estrutura da revisão de estrela fica legível (sem status nas alternativas)", async ({ page }) => {
    await seedLessonRecoverySession(page, { lessonId: "l1", stars: 2, isPremium: true });
    await page.goto("/revisao?modo=erros");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);
    await page.getByRole("button", { name: /Corrigir agora/i }).click();
    await dismissBlockingOverlays(page);

    // Não precisa ser o player in-lesson: a página de revisão também não pode
    // expor dump/status. O player usa data-review-* (coberto pelo unit test).
    await expect(page.getByRole("button", { name: /Pulou ou respondeu incorretamente/i })).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/你好\s*\/\s*你好吗\s*\/\s*我很好/);
  });
});
