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
      // RC2.2.14 tap-through guard: o Continuar do passo anterior cai no mesmo
      // ponto do Verificar (~350ms). Esperar a janela fechar antes de digitar.
      await page.waitForTimeout(450);
      await expect(page.locator("[data-production-learned]")).toBeVisible();
      await expect(page.locator("[data-production-situation]")).toBeVisible();
      // Âncora conhecida visível; supported pode mostrar a seta de transformação
      // (你叫什么？→请问，你叫什么？) — isso é scaffold, não frase memorizada do currículo.
      await expect(page.locator("[data-production-learned]")).toContainText(/你叫什么/);
      await expect(page.locator("[data-production-situation]")).not.toContainText(/请问，你叫什么/);

      const input = page.locator("[data-production-answer] textarea, [data-production-answer] input").first();
      await expect(input).toBeVisible();
      await input.fill("请问，你叫什么？");

      const verify = page.getByRole("button", { name: /^Verificar$/ });
      await expect(verify).toBeEnabled();
      await verify.click();

      await expect(page.locator("[data-lesson-feedback]")).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText(/Certo|\+Qi|Continue|Continuar|Próximo|Boa|Estrutura certa/i).first()
      ).toBeVisible({ timeout: 5_000 });
    });
  });
}
