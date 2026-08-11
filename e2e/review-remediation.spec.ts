import { test, expect } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonRecoverySession, waitForLazyPage } from "./helpers";

/**
 * B002 — recuperação / remediação:
 * prompt, display e pinyin devem ser um único item coerente (nunca dump "你好 / 你好吗 / …").
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
});
