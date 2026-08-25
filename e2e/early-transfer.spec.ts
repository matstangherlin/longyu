/**
 * V4.5 — primeira transferência combinacional (L15 / l2-rev).
 *
 * Prova pedagógica, não só geometry:
 * - 你叫什么？ já foi ensinado/produzido antes
 * - 请问 foi ensinado
 * - a frase completa 请问，你叫什么？ nunca foi mostrada pronta
 * - L15 gera transfer_task supported
 * - input + CTA aceitam a resposta correta
 */
import { expect, test } from "@playwright/test";
import { dismissBlockingOverlays, seedLessonPlayerReady, waitForLazyPage } from "./helpers";
import { advanceUntilSelector, seedProOnTopOfSession } from "./lesson-player-mobile-helpers";

const VIEWPORTS = [
  { label: "360×640", width: 360, height: 640 },
  { label: "375×667", width: 375, height: 667 },
  { label: "390×844", width: 390, height: 844 },
  { label: "667×360 landscape", width: 667, height: 360 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`V4.5 early transfer · ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test.setTimeout(150_000);

    test("L15 gera 请问，你叫什么？ e aceita a resposta", async ({ page }) => {
      await seedLessonPlayerReady(page, "l2-rev", { masteryLevel: 0 });
      await seedProOnTopOfSession(page);
      await page.goto("/licao/l2-rev/player");
      await waitForLazyPage(page);
      await dismissBlockingOverlays(page);

      const ok = await advanceUntilSelector(page, '[data-production-step="transfer_task"]', 40, 120_000);
      expect(ok, "transfer_task deve aparecer em l2-rev (L15)").toBe(true);

      const transfer = page.locator('[data-production-step="transfer_task"]');
      await expect(transfer).toBeVisible();
      await expect(page.locator("[data-production-learned]")).toBeVisible();
      await expect(page.locator("[data-production-situation]")).toBeVisible();
      // Âncora conhecida — não a frase-alvo completa pronta no enunciado.
      await expect(page.locator("[data-production-learned]")).toContainText(/你叫什么/);
      await expect(page.locator("[data-production-learned]")).not.toContainText(/请问，你叫什么/);
      await expect(page.locator("[data-production-situation]")).not.toContainText(/请问，你叫什么/);

      const input = page.locator("[data-production-answer] textarea, [data-production-answer] input").first();
      await expect(input).toBeVisible();
      await input.fill("请问，你叫什么？");

      const verify = page.getByRole("button", { name: /^Verificar$/ });
      await expect(verify).toBeVisible();
      await verify.click();

      await expect(
        page.getByText(/Certo|\+Qi|Continue|Próximo|Boa/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });
}
