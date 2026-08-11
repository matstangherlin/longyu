import { test, expect } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady, waitForLazyPage } from "./helpers";
import { advanceUntilVisible } from "./lesson-player-helpers";

/**
 * Produção / transferência — layout guiado:
 * blocos claros, dica opcional, campo convidativo, CTA Verificar.
 */
test.describe("produção / transferência — UX guiada", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("campo de produção tem hierarquia clara quando o plano inclui o motor", async ({ page }) => {
    test.setTimeout(120_000);
    await seedLessonPlayerReady(page, "l14");
    await page.goto("/licao/l14/player");
    await waitForLazyPage(page);
    await dismissBlockingOverlays(page);

    const production = page.locator("[data-production-step]");
    const found = await advanceUntilVisible(page, production, 32);
    if (!found) {
      await expect(page.locator("[data-lesson-player-frame]")).toBeVisible();
      return;
    }

    await expect(page.locator("[data-production-situation]")).toBeVisible();
    await expect(page.locator("[data-production-goal]")).toBeVisible();
    const answer = page.locator("[data-production-answer] textarea");
    await expect(answer).toBeVisible();
    await expect(answer).toHaveAttribute("placeholder", /hànzì|pinyin|wo yao/i);
    await expect(page.getByRole("button", { name: /^Verificar$/ })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /Nenhuma alternativa e nenhuma peça: esta frase exata você nunca viu/i
    );
  });
});
